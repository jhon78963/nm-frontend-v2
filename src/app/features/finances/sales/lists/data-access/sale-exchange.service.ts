import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, from, map, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { PosService } from '../../../pos/data-access/pos.service';
import {
  ExchangeBackendPayload,
  ExchangeNewItem,
  ExchangePayload,
  ExchangePreview,
  ExchangeResponse,
} from '../models/sale.model';
import {
  adaptExchangeResponse,
  buildExchangePreview,
  flattenProductVariants,
} from './sale-exchange.adapter';

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'string' && err.trim()) {
    return err;
  }

  const http = err as {
    error?: { message?: string | string[] };
    message?: string;
  };

  const backendMessage = http?.error?.message;
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage;
  }
  if (Array.isArray(backendMessage) && backendMessage.length > 0) {
    return backendMessage.join(' ');
  }

  return http?.message ?? 'Error al procesar la solicitud.';
}

function mapPaymentMethod(
  method: ExchangePayload['paymentMethod'],
): string | null {
  if (!method) {
    return null;
  }

  switch (method) {
    case 'yape':
      return 'YAPE';
    case 'card':
      return 'CARD';
    default:
      return 'CASH';
  }
}

function toBackendPayload(
  payload: ExchangePayload,
  preview: ExchangePreview,
): ExchangeBackendPayload {
  const returnItem = payload.returnItems[0];
  const newItem = payload.newItems[0];

  if (!returnItem || !newItem) {
    throw new Error('Debes seleccionar un producto a devolver y uno nuevo.');
  }

  const matchedNewItem = preview.newItems.find(
    (item) => item.variantId === newItem.variantId,
  );

  if (!matchedNewItem) {
    throw new Error('No se encontró la variante seleccionada para el canje.');
  }

  return {
    returned_detail_id: returnItem.saleItemId,
    difference_amount: Math.max(0, preview.difference),
    payment_method:
      preview.difference > 0 ? mapPaymentMethod(payload.paymentMethod) : null,
    new_item: {
      product_size_id: matchedNewItem.productSizeId,
      color_id: matchedNewItem.colorId,
      final_price: matchedNewItem.unitPrice,
    },
  };
}

@Service()
export class SaleExchangeService {
  private readonly http = inject(HttpClient);
  private readonly posService = inject(PosService);
  private readonly base = `${environment.apiUrl}/sales/exchange`;

  previewExchange(params: {
    originalItems: ExchangePreview['originalItems'];
    returnSelection: Map<number, number>;
    newItems: ExchangeNewItem[];
  }): Observable<ExchangePreview> {
    return of(
      buildExchangePreview(
        params.originalItems,
        params.returnSelection,
        params.newItems,
      ),
    );
  }

  confirmExchange(
    payload: ExchangePayload,
    preview: ExchangePreview,
  ): Observable<ExchangeResponse> {
    let backendPayload: ExchangeBackendPayload;

    try {
      backendPayload = toBackendPayload(payload, preview);
    } catch (error) {
      return throwError(() =>
        error instanceof Error ? error.message : 'Datos de canje incompletos.',
      );
    }

    const refundAmount =
      preview.difference < 0 ? Math.abs(preview.difference) : 0;

    return this.http.post<unknown>(this.base, backendPayload).pipe(
      map((raw) => adaptExchangeResponse(raw, refundAmount)),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  searchVariantsForExchange(
    query: string,
    _warehouseId: number,
  ): Observable<ExchangeNewItem[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return of([]);
    }

    return from(this.posService.searchProductBySku(trimmed)).pipe(
      map((product) => flattenProductVariants(product, trimmed)),
      catchError(() => of([])),
    );
  }
}
