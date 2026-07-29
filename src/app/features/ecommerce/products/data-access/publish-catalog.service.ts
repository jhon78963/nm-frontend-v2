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
      map((raw) =>
        Array.isArray(raw) ? (raw as unknown[]).map(adaptWarehouseOption) : [],
      ),
    );
  }

  getSizes(): Observable<CatalogOption[]> {
    return this.http
      .get<{ data: unknown[] }>(`${this.apiUrl}/sizes?limit=200&page=1`)
      .pipe(
        map((response) =>
          (response.data ?? []).map(adaptCatalogOption),
        ),
      );
  }

  getColors(): Observable<CatalogOption[]> {
    return this.http
      .get<{ data: unknown[] }>(`${this.apiUrl}/colors?limit=200&page=1`)
      .pipe(
        map((response) =>
          (response.data ?? []).map(adaptCatalogOption),
        ),
      );
  }
}

@Service()
export class PublishVariantService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  attachSize(
    productId: number,
    sizeId: number,
    data: ProductSizePayload,
  ): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(
        `${this.apiUrl}/products/${productId}/size/${sizeId}`,
        data,
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  getProductSizeId(
    productId: number,
    sizeId: number,
  ): Observable<{ productSizeId: number }> {
    return this.http.get<{ productSizeId: number }>(
      `${this.apiUrl}/products/${productId}/size/${sizeId}`,
    );
  }

  attachColor(
    productSizeId: number,
    colorId: number,
    data: ProductColorPayload,
  ): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(
        `${this.apiUrl}/product-size/${productSizeId}/color/${colorId}`,
        data,
      )
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }
}
