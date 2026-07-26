import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  Product,
  ProductListResponse,
  ProductFormData,
  ProductImportResponse,
} from '../models/product.model';
import {
  adaptProduct,
  adaptProductList,
  adaptProductImportResponse,
} from './product.adapter';

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

@Service()
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/products`;

  getAll(params: {
    limit: number;
    page: number;
    search?: string;
    genderId?: number[];
  }): Observable<ProductListResponse> {
    let url = `${this.base}?limit=${params.limit}&page=${params.page}`;

    if (params.search?.trim()) {
      url += `&search=${encodeURIComponent(params.search.trim())}`;
    }

    if (params.genderId && params.genderId.length > 0) {
      url += `&genderId=${params.genderId.join(',')}`;
    }

    return this.http.get<unknown>(url).pipe(map(adaptProductList));
  }

  getOne(id: number): Observable<Product> {
    return this.http.get<unknown>(`${this.base}/${id}`).pipe(map(adaptProduct));
  }

  create(
    data: ProductFormData,
  ): Observable<{ message: string; productId: number }> {
    return this.http
      .post<{ message: string; productId: number }>(this.base, data)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  update(
    id: number,
    data: ProductFormData,
  ): Observable<{ message: string; productId: number }> {
    return this.http
      .patch<{ message: string; productId: number }>(`${this.base}/${id}`, data)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.base}/${id}`)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  getHistory(id: number): Observable<unknown> {
    return this.http.get(`${this.base}/${id}/history`);
  }

  exportToExcel(warehouseId?: number): Observable<Blob> {
    const params = warehouseId
      ? new HttpParams().set('warehouseId', warehouseId.toString())
      : undefined;

    return this.http.get(`${this.base}/export/excel`, {
      params,
      responseType: 'blob',
    });
  }

  importFromExcel(file: File): Observable<ProductImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<unknown>(`${this.base}/import/excel`, formData)
      .pipe(
        map(adaptProductImportResponse),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }
}
