import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ProductColor, ProductColorFormData } from '../models/product.model';
import { adaptProductColor } from './product.adapter';

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
export class ProductColorsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getColors(productId: number, sizeId: number): Observable<ProductColor[]> {
    return this.http
      .get<unknown>(
        `${this.apiUrl}/colors/selected?productId=${productId}&sizeId=${sizeId}`,
      )
      .pipe(
        map((raw) =>
          Array.isArray(raw) ? (raw as unknown[]).map(adaptProductColor) : [],
        ),
      );
  }

  getSizes(productId: number, size?: string): Observable<unknown[]> {
    let url = `${this.apiUrl}/colors/sizes?productId=${productId}`;
    if (size?.trim()) {
      url += `&size=${encodeURIComponent(size.trim())}`;
    }

    return this.http.get<unknown[]>(url);
  }

  add(
    productSizeId: number,
    colorId: number,
    data: ProductColorFormData,
  ): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(
        `${this.apiUrl}/product-size/${productSizeId}/color/${colorId}`,
        data,
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  update(
    productSizeId: number,
    colorId: number,
    data: ProductColorFormData,
  ): Observable<{ message: string }> {
    return this.http
      .patch<{ message: string }>(
        `${this.apiUrl}/product-size/${productSizeId}/color/${colorId}`,
        data,
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  remove(
    productSizeId: number,
    colorId: number,
  ): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(
        `${this.apiUrl}/product-size/${productSizeId}/color/${colorId}`,
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }
}
