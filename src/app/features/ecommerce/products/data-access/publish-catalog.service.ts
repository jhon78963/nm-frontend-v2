import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CatalogOption,
  GenderOption,
  ProductColorPayload,
  ProductSizePayload,
  WarehouseOption,
} from '../models/publish-product.model';
import {
  adaptCatalogOption,
  adaptGenderOption,
  adaptWarehouseOption,
} from './publish-product.adapter';

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
export class PublishCatalogService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getGenders(): Observable<GenderOption[]> {
    return this.http.get<unknown>(`${this.apiUrl}/genders`).pipe(
      map((raw) =>
        Array.isArray(raw) ? (raw as unknown[]).map(adaptGenderOption) : [],
      ),
    );
  }

  getWarehouses(): Observable<WarehouseOption[]> {
    return this.http.get<unknown>(`${this.apiUrl}/warehouses`).pipe(
      map((raw) => {
        const arr = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);
        return (arr as unknown[]).map(adaptWarehouseOption);
      }),
    );
  }

  getSizes(): Observable<CatalogOption[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/sizes`)
      .pipe(
        map((raw) => {
          const arr = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);
          return (arr as unknown[]).map(adaptCatalogOption);
        }),
      );
  }

  getColors(): Observable<CatalogOption[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/colors`)
      .pipe(
        map((raw) => {
          const arr = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);
          return (arr as unknown[]).map(adaptCatalogOption);
        }),
      );
  }
}

@Service()
export class PublishVariantService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  attachSize(
    productId: string,
    sizeId: string | number,
    data: ProductSizePayload,
  ): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(
        `${this.apiUrl}/products/${productId}/sizes`,
        { sizeId: String(sizeId), ...data },
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  getProductSizeId(
    productId: string,
    sizeId: string | number,
  ): Observable<{ productSizeId: string }> {
    return this.http.get<{ productSizeId: string }>(
      `${this.apiUrl}/products/${productId}/sizes/${sizeId}`,
    );
  }

  attachColor(
    productSizeId: string | number,
    colorId: string | number,
    data: ProductColorPayload,
  ): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(
        `${this.apiUrl}/product-sizes/${productSizeId}/colors`,
        { colorId: String(colorId), ...data },
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }
}
