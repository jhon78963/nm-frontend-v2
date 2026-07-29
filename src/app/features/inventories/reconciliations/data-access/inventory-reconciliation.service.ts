import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type {
  ReconciliationPosSalesSummary,
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

  getPosSalesSince(productId: number): Observable<ReconciliationPosSalesSummary> {
    return this.http
      .get<unknown>(`${this.base}/${productId}/pos-sales`)
      .pipe(
        map(adaptPosSalesSummary),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  bulkUpdate(
    productId: number,
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
    productId: number,
    productSizeId: number,
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

  loadColorsCatalog(pageSize = 200): Observable<CatalogColorOption[]> {
    return this.http
      .get<unknown>(`${environment.apiUrl}/colors?limit=${pageSize}&page=1`)
      .pipe(
        switchMap((first) => {
          const firstRecord = first as { data?: unknown[]; paginate?: { pages?: number } };
          const totalPages = Math.max(1, firstRecord.paginate?.pages ?? 1);
          const firstPage = (firstRecord.data ?? []).map(adaptCatalogColor);

          if (totalPages <= 1) {
            return of(firstPage);
          }

          const pageRequests = Array.from({ length: totalPages - 1 }, (_, index) =>
            this.http
              .get<unknown>(`${environment.apiUrl}/colors?limit=${pageSize}&page=${index + 2}`)
              .pipe(map((res) => {
                const record = res as { data?: unknown[] };
                return (record.data ?? []).map(adaptCatalogColor);
              })),
          );

          return forkJoin(pageRequests).pipe(
            map((rest) => [...firstPage, ...rest.flat()]),
          );
        }),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  searchSizeAutocomplete(search: string): Observable<AutocompleteOption[]> {
    const q = encodeURIComponent(search.trim());
    return this.http
      .get<unknown>(`${environment.apiUrl}/sizes/autocomplete?search=${q}&limit=20`)
      .pipe(
        map((raw) => (Array.isArray(raw) ? raw.map(adaptAutocompleteOption) : [])),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  searchColorAutocomplete(search: string): Observable<AutocompleteOption[]> {
    const q = encodeURIComponent(search.trim());
    return this.http
      .get<unknown>(`${environment.apiUrl}/colors/autocomplete?search=${q}&limit=20`)
      .pipe(
        map((raw) => (Array.isArray(raw) ? raw.map(adaptAutocompleteOption) : [])),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  addSizeToProduct(
    productId: number,
    sizeId: number,
    data: Partial<ProductSizeFormData>,
  ): Observable<{ message: string }> {
    const payload = {
      barcode: data.barcode ?? '0',
      stock: data.stock ?? 0,
      purchasePrice: data.purchasePrice ?? 0,
      salePrice: data.salePrice ?? 0,
      minSalePrice: data.minSalePrice ?? 0,
    };

    return this.http
      .post<{ message: string }>(`${environment.apiUrl}/products/${productId}/size/${sizeId}`, payload)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  addColorToProductSize(
    productSizeId: number,
    colorId: number,
    data: ProductColorFormData = { stock: 0 },
  ): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(
        `${environment.apiUrl}/product-size/${productSizeId}/color/${colorId}`,
        data,
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  resolveOrCreateColorId(description: string): Observable<number> {
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
          .post<{ message: string }>(`${environment.apiUrl}/colors`, { description: term })
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
    productSizeId: number,
    colorId: number,
  ): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(
        `${environment.apiUrl}/product-size/${productSizeId}/color/${colorId}`,
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  removeSize(productId: number, sizeId: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(
        `${environment.apiUrl}/products/${productId}/size/${sizeId}`,
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }
}
