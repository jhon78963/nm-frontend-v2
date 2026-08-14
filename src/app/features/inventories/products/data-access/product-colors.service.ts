import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CatalogColorCreateData,
  EcommerceVariantRow,
  ProductColorFormData,
  ProductColorSizeOption,
  ProductColorVariantRow,
} from '../models/product.model';
import { adaptProductColorVariantRow, adaptProductSize } from './product.adapter';

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

  getColors(productId: number, sizeId: number): Observable<ProductColorVariantRow[]> {
    return this.http
      .get<unknown>(
        `${this.apiUrl}/colors/selected?productId=${productId}&sizeId=${sizeId}`,
      )
      .pipe(
        map((raw) =>
          Array.isArray(raw)
            ? (raw as unknown[]).map(adaptProductColorVariantRow)
            : [],
        ),
      );
  }

  getSizes(productId: number, size?: string): Observable<ProductColorSizeOption[]> {
    let url = `${this.apiUrl}/colors/sizes?productId=${productId}`;
    if (size?.trim()) {
      url += `&size=${encodeURIComponent(size.trim())}`;
    }

    return this.http.get<unknown[]>(url).pipe(
      map((raw) =>
        Array.isArray(raw)
          ? (raw as unknown[]).map((item) => {
              const adapted = adaptProductSize(item);
              return {
                id: adapted.id,
                productSizeId: adapted.productSizeId,
                description: adapted.description,
                stock: adapted.stock,
              } satisfies ProductColorSizeOption;
            })
          : [],
      ),
    );
  }

  getAttachedColorVariants(productId: number): Observable<EcommerceVariantRow[]> {
    return this.getSizes(productId).pipe(
      switchMap((sizes) => {
        if (sizes.length === 0) {
          return of([]);
        }

        return forkJoin(
          sizes.map((size) =>
            this.getColors(productId, size.id).pipe(
              map((colors) =>
                colors
                  .filter((color) => color.variantAttached)
                  .map(
                    (color): EcommerceVariantRow => ({
                      sizeId: size.id,
                      sizeLabel: size.description,
                      colorId: color.id,
                      colorLabel: color.description,
                      colorHash: color.hash ?? color.value ?? null,
                      stock: color.stock ?? 0,
                      price: color.price ?? 0,
                      syncStatus: 'pending',
                    }),
                  ),
              ),
            ),
          ),
        ).pipe(map((groups) => groups.flat()));
      }),
    );
  }

  createCatalogColor(data: CatalogColorCreateData): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.apiUrl}/colors`, data)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
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
