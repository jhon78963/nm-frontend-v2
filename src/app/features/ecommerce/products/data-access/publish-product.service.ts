import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  PublishProduct,
  PublishProductListResponse,
  PublishProductPayload,
} from '../models/publish-product.model';
import { toProductWritePayload } from '../../../inventories/products/data-access/product.adapter';
import { adaptPublishProduct, adaptPublishProductList } from './publish-product.adapter';

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
export class PublishProductService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/products`;

  search(params: {
    limit: number;
    page: number;
    search?: string;
  }): Observable<PublishProductListResponse> {
    let url = `${this.base}?limit=${params.limit}&page=${params.page}`;

    if (params.search?.trim()) {
      url += `&search=${encodeURIComponent(params.search.trim())}`;
    }

    return this.http.get<unknown>(url).pipe(map(adaptPublishProductList));
  }

  getOne(id: string): Observable<PublishProduct> {
    return this.http.get<unknown>(`${this.base}/${id}`).pipe(map(adaptPublishProduct));
  }

  create(
    data: PublishProductPayload,
  ): Observable<{ message: string; productId: string }> {
    return this.http
      .post<{ message: string; productId: string }>(
        this.base,
        toProductWritePayload(data, { forCreate: true }),
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  update(
    id: string,
    data: PublishProductPayload,
  ): Observable<{ message: string; productId: string }> {
    return this.http
      .patch<{ message: string; productId: string }>(
        `${this.base}/${id}`,
        toProductWritePayload(data),
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }
}
