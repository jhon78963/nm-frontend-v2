import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  StoreHomeCollectionsConfig,
  StoreHomeCollectionsPayload,
} from '../models/store-home-collections.model';
import { adaptHomeCollectionsResponse } from './store-home-collections.adapter';

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
export class StoreHomeCollectionsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ecommerce/home/collections`;

  getConfig(): Observable<StoreHomeCollectionsConfig> {
    return this.http
      .get<unknown>(this.base)
      .pipe(map(adaptHomeCollectionsResponse));
  }

  saveConfig(payload: StoreHomeCollectionsPayload): Observable<StoreHomeCollectionsConfig> {
    return this.http.put<unknown>(`${this.base}/admin`, payload).pipe(
      map(adaptHomeCollectionsResponse),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }
}
