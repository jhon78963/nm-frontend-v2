import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  StoreHomeServicesConfig,
  StoreHomeServicesPayload,
} from '../models/store-home-services.model';
import { adaptHomeServicesResponse } from './store-home-services.adapter';

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
export class StoreHomeServicesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ecommerce/home/services`;

  getConfig(): Observable<StoreHomeServicesConfig> {
    return this.http
      .get<unknown>(this.base)
      .pipe(map(adaptHomeServicesResponse));
  }

  saveConfig(payload: StoreHomeServicesPayload): Observable<StoreHomeServicesConfig> {
    return this.http.put<unknown>(`${this.base}/admin`, payload).pipe(
      map(adaptHomeServicesResponse),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }
}
