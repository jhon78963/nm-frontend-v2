import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  StoreShopCollectionsConfig,
  StoreShopCollectionsPayload,
} from '../models/store-shop-collections.model';
import { adaptShopCollectionsResponse } from './store-shop-collections.adapter';

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
export class StoreShopCollectionsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ecommerce/shop/collections`;

  getConfig(): Observable<StoreShopCollectionsConfig> {
    return this.http
      .get<unknown>(`${this.base}/admin`)
      .pipe(map(adaptShopCollectionsResponse));
  }

  saveConfig(payload: StoreShopCollectionsPayload): Observable<StoreShopCollectionsConfig> {
    return this.http.put<unknown>(`${this.base}/admin`, payload).pipe(
      map(adaptShopCollectionsResponse),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }
}
