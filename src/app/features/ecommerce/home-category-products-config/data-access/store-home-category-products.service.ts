import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  StoreHomeCategoryProductsConfig,
  StoreHomeCategoryProductsPayload,
} from '../models/store-home-category-products.model';
import { adaptHomeCategoryProductsResponse } from './store-home-category-products.adapter';

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
export class StoreHomeCategoryProductsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ecommerce/home/category-products`;

  getConfig(): Observable<StoreHomeCategoryProductsConfig> {
    return this.http
      .get<unknown>(this.base)
      .pipe(map(adaptHomeCategoryProductsResponse));
  }

  saveConfig(
    payload: StoreHomeCategoryProductsPayload,
  ): Observable<StoreHomeCategoryProductsConfig> {
    return this.http.put<unknown>(`${this.base}/admin`, payload).pipe(
      map(adaptHomeCategoryProductsResponse),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }
}
