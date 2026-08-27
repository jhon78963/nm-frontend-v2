import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type {
  ReconciliationPosSalesSummary,
  ReconciliationProduct,
  ReconciliationSearchResponse,
  ReconciliationUpdatePayload,
  ReconciliationUpdateResponse,
  ReplaceVariantColorBody,
  CatalogColorOption,
  AutocompleteOption,
} from '../models/inventory-reconciliation.model';
import {
  adaptAutocompleteOption,
  adaptCatalogColor,
  adaptPosSalesSummary,
  adaptReconciliationProduct,
  adaptReconciliationSearchResponse,
  adaptReconciliationUpdateResponse,
} from './inventory-reconciliation.adapter';
import type { ProductSizeFormData, ProductColorFormData } from '../../products/models/product.model';

function extractErrorMessage(err: unknown): string {
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

  return http?.message ?? 'No se pudo completar la operación.';
}

@Service()
export class InventoryReconciliationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/inventory/reconciliation`;

  search(query: string): Observable<ReconciliationSearchResponse> {
    const q = encodeURIComponent(query.trim());
    return this.http
      .get<unknown>(`${this.base}/search?q=${q}`)
      .pipe(
        map(adaptReconciliationSearchResponse),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  getProduct(productId: string): Observable<ReconciliationProduct> {
    return this.http
      .get<unknown>(`${this.base}/${productId}`)
      .pipe(
        map((raw) => {
          const record = raw as { product?: unknown };
          return adaptReconciliationProduct(record.product);
        }),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  getPosSalesSince(productId: string): Observable<ReconciliationPosSalesSummary> {
    return this.http
      .get<unknown>(`${this.base}/${productId}/pos-sales`)
      .pipe(
        map(adaptPosSalesSummary),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  bulkUpdate(
    productId: string,
    body: ReconciliationUpdatePayload,
  ): Observable<ReconciliationUpdateResponse> {
    return this.http
      .put<unknown>(`${this.base}/${productId}`, body)
      .pipe(
        map(adaptReconciliationUpdateResponse),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  replaceVariantColor(
    productId: string,
    productSizeId: string,
    body: ReplaceVariantColorBody,
  ): Observable<ReconciliationUpdateResponse> {
    return this.http
      .post<unknown>(
        `${this.base}/${productId}/product-size/${productSizeId}/replace-color`,
        body,
      )
      .pipe(
        map(adaptReconciliationUpdateResponse),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  loadColorsCatalog(_pageSize = 200): Observable<CatalogColorOption[]> {
    return this.http
      .get<unknown>(`${environment.apiUrl}/colors`)
      .pipe(
        map((raw) => {
          const rows = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);
          return rows.map(adaptCatalogColor);
        }),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  searchSizeAutocomplete(search: string): Observable<AutocompleteOption[]> {
    const q = encodeURIComponent(search.trim());
    return this.http
      .get<unknown>(`${environment.apiUrl}/sizes?search=${q}`)
      .pipe(
        map((raw) => {
          const rows = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);
          return rows.map(adaptAutocompleteOption);
        }),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  searchColorAutocomplete(search: string): Observable<AutocompleteOption[]> {
    const q = encodeURIComponent(search.trim());
    return this.http
      .get<unknown>(`${environment.apiUrl}/colors?search=${q}`)
      .pipe(
        map((raw) => {
          const rows = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);
          return rows.map(adaptAutocompleteOption);
        }),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  addSizeToProduct(
    productId: string,
    sizeId: string,
    data: Partial<ProductSizeFormData>,
  ): Observable<{ message: string }> {
    const payload = {
      sizeId,
      barcode: data.barcode ?? '0',
      stock: data.stock ?? 0,
      purchasePrice: data.purchasePrice ?? 0,
      salePrice: data.salePrice ?? 0,
      minSalePrice: data.minSalePrice ?? 0,
    };

    return this.http
      .post<{ message: string }>(`${environment.apiUrl}/products/${productId}/sizes`, payload)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  addColorToProductSize(
    productSizeId: string,
    colorId: string,
    data: ProductColorFormData = { stock: 0 },
  ): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(
        `${environment.apiUrl}/product-sizes/${productSizeId}/colors`,
        { colorId, ...data },
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  resolveOrCreateColorId(description: string): Observable<string> {
    const term = description.trim();
    return this.searchColorAutocomplete(term).pipe(
      switchMap((existing) => {
        const match = existing.find(
          (item) => item.value.trim().toLowerCase() === term.toLowerCase(),
        );
        if (match) {
          return of(match.id);
        }

        return this.http
          .post<unknown>(`${environment.apiUrl}/colors`, { description: term })
          .pipe(
            switchMap(() => this.searchColorAutocomplete(term)),
            map((list) => {
              const created = list.find(
                (item) => item.value.trim().toLowerCase() === term.toLowerCase(),
              );
              if (!created) {
                throw new Error(`No se pudo registrar el color "${term}".`);
              }
              return created.id;
            }),
          );
      }),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  removeColorVariant(
    productSizeId: string,
    colorId: string,
  ): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(
        `${environment.apiUrl}/product-sizes/${productSizeId}/colors/${colorId}`,
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  removeSize(productId: string, sizeId: string): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(
        `${environment.apiUrl}/products/${productId}/sizes/${sizeId}`,
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }
}
