import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  PurchaseBulkPayload,
  PurchaseDetail,
  PurchaseHeaderPatch,
  PurchaseLinePatch,
  PurchaseListResponse,
  PurchaseRegisterBulkResponse,
} from '../models/purchase.model';
import {
  adaptPurchaseDetail,
  adaptPurchaseList,
  adaptPurchaseRegisterBulkResponse,
} from './purchase.adapter';

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'string' && err.trim()) {
    return err;
  }

  const http = err as {
    error?: {
      message?: string | string[];
      errors?: Record<string, string[]>;
    };
    message?: string;
  };

  const backendMessage = http?.error?.message;
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage;
  }
  if (Array.isArray(backendMessage) && backendMessage.length > 0) {
    return backendMessage.join(' ');
  }

  const stockError = http?.error?.errors?.['stock']?.[0];
  if (stockError) {
    return stockError;
  }

  return http?.message ?? 'Error al procesar la solicitud.';
}

@Service()
export class PurchaseService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/purchases`;

  getAll(params: {
    limit: number;
    page: number;
    search?: string;
    warehouseId?: string | null;
    status?: string | null;
  }): Observable<PurchaseListResponse> {
    let url = `${this.base}?perPage=${params.limit}&page=${params.page}`;

    if (params.search?.trim()) {
      url += `&search=${encodeURIComponent(params.search.trim())}`;
    }
    if (params.warehouseId) {
      url += `&warehouseId=${params.warehouseId}`;
    }
    if (params.status) {
      url += `&status=${encodeURIComponent(params.status)}`;
    }

    return this.http.get<unknown>(url).pipe(map(adaptPurchaseList));
  }

  getOne(id: string): Observable<PurchaseDetail> {
    return this.http
      .get<unknown>(`${this.base}/${id}`)
      .pipe(map(adaptPurchaseDetail));
  }

  registerBulk(
    payload: PurchaseBulkPayload,
    _paymentMethod = 'CASH',
    _voucherFiles: File[] | null = null,
  ): Observable<PurchaseRegisterBulkResponse> {
    const body = this.buildRegisterDto(payload);

    return this.http.post<unknown>(this.base, body).pipe(
      map(adaptPurchaseRegisterBulkResponse),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  private buildRegisterDto(payload: PurchaseBulkPayload): Record<string, unknown> {
    const lines = payload.lines
      .filter((l) => l.productRef.mode === 'id' && l.sizeRef.mode === 'id')
      .map((l) => ({
        productId: l.productRef.mode === 'id' ? l.productRef.productId : '',
        sizeId: l.sizeRef.mode === 'id' ? l.sizeRef.sizeId : '',
        productSizeId: l.productSizeId ?? undefined,
        purchasePrice: l.purchasePrice,
        salePrice: l.salePrice ?? undefined,
        quantity: l.colors.reduce((sum, c) => sum + c.quantity, 0),
        colorDeltas: l.colors
          .filter((c) => c.colorId)
          .map((c) => ({ colorId: c.colorId!, quantity: c.quantity })),
      }));

    return {
      warehouseId: payload.purchase.warehouseId,
      vendorId: payload.purchase.vendorId ?? undefined,
      supplierName: payload.purchase.supplierName || undefined,
      currency: payload.purchase.currency,
      notes: payload.purchase.documentNote ?? undefined,
      purchaseDate: payload.purchase.registeredAt || undefined,
      lines,
    };
  }

  cancel(id: string, reason?: string | null): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.base}/${id}/cancel`, {
        reason: reason?.trim() || null,
      })
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  patchHeader(
    id: string,
    body: PurchaseHeaderPatch,
  ): Observable<{ message: string }> {
    return this.http
      .patch<{ message: string }>(`${this.base}/${id}`, body)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  addVouchers(
    purchaseId: string,
    files: File[],
  ): Observable<{ message: string }> {
    const formData = new FormData();
    files.forEach((f) => formData.append('images[]', f));

    return this.http
      .post<{ message: string }>(`${this.base}/${purchaseId}/vouchers`, formData)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  updateLine(
    purchaseId: string,
    lineId: string,
    body: PurchaseLinePatch,
  ): Observable<{ message: string }> {
    return this.http
      .patch<{ message: string }>(`${this.base}/${purchaseId}/lines/${lineId}`, body)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  deleteLine(
    purchaseId: string,
    lineId: string,
  ): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.base}/${purchaseId}/lines/${lineId}`)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  appendLines(
    purchaseId: string,
    payload: Pick<PurchaseBulkPayload, 'catalogUpserts' | 'lines' | 'totals'>,
  ): Observable<{ message: string }> {
    const hasCatalogUpserts =
      (payload.catalogUpserts.products?.length ?? 0) > 0 ||
      (payload.catalogUpserts.sizes?.length ?? 0) > 0 ||
      (payload.catalogUpserts.colors?.length ?? 0) > 0;

    if (hasCatalogUpserts) {
      return throwError(
        () =>
          'Agregar productos, tallas o colores nuevos al editar aún no está soportado. Use referencias existentes del catálogo.',
      );
    }

    const lines = payload.lines
      .filter((line) => line.productRef.mode === 'id' && line.sizeRef.mode === 'id')
      .map((line) => ({
        productId: line.productRef.mode === 'id' ? line.productRef.productId : '',
        sizeId: line.sizeRef.mode === 'id' ? line.sizeRef.sizeId : '',
        productSizeId: line.productSizeId ?? undefined,
        purchasePrice: line.purchasePrice,
        salePrice: line.salePrice ?? undefined,
        quantity: line.colors.reduce((sum, color) => sum + color.quantity, 0),
        colorDeltas: line.colors
          .filter((color) => color.colorId)
          .map((color) => ({ colorId: color.colorId!, quantity: color.quantity })),
      }));

    return this.http
      .post<{ message: string }>(`${this.base}/${purchaseId}/lines/bulk`, { lines })
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  getVoucherPreview(voucherPath: string): Observable<Blob> {
    const params = new HttpParams().set('path', voucherPath);
    return this.http.get(`${environment.apiUrl}/vouchers/preview`, {
      params,
      responseType: 'blob',
    });
  }
}
