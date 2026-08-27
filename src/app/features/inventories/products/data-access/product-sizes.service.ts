import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ProductSize, ProductSizeFormData } from '../models/product.model';
import { adaptProductSize } from './product.adapter';

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
export class ProductSizesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getSizes(
    productId: string,
    sizeTypeIds?: string[],
  ): Observable<ProductSize[]> {
    let url = `${this.apiUrl}/sizes?productId=${productId}`;

    if (sizeTypeIds && sizeTypeIds.length > 0) {
      url += `&sizeTypeId=${sizeTypeIds.join(',')}`;
    }

    return this.http
      .get<unknown>(url)
      .pipe(
        map((raw) => {
          const list = Array.isArray(raw)
            ? raw
            : Array.isArray((raw as { data?: unknown[] })?.data)
              ? ((raw as { data: unknown[] }).data)
              : [];
          return (list as unknown[]).map(adaptProductSize);
        }),
      );
  }

  add(
    productId: string,
    sizeId: string,
    data: ProductSizeFormData,
  ): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(
        `${this.apiUrl}/products/${productId}/sizes`,
        { sizeId, ...data },
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  update(
    productId: string,
    sizeId: string,
    data: ProductSizeFormData,
  ): Observable<{ message: string }> {
    return this.http
      .patch<{ message: string }>(
        `${this.apiUrl}/products/${productId}/sizes/${sizeId}`,
        data,
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  remove(productId: string, sizeId: string): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(
        `${this.apiUrl}/products/${productId}/sizes/${sizeId}`,
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }
}
