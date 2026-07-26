import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  Tenant,
  TenantListResponse,
  TenantPayload,
  TenantSetting,
  TenantSettingPayload,
} from '../models/tenant.model';
import {
  adaptTenant,
  adaptTenantList,
  adaptTenantSetting,
} from './tenant.adapter';

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
export class TenantService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/tenants`;

  getAll(params: {
    limit: number;
    page: number;
    search?: string;
  }): Observable<TenantListResponse> {
    let url = `${this.base}?limit=${params.limit}&page=${params.page}`;
    if (params.search?.trim()) {
      url += `&search=${encodeURIComponent(params.search.trim())}`;
    }

    return this.http.get<unknown>(url).pipe(map(adaptTenantList));
  }

  getOne(id: number): Observable<Tenant> {
    return this.http.get<unknown>(`${this.base}/${id}`).pipe(map(adaptTenant));
  }

  getSettings(tenantId: number): Observable<TenantSetting> {
    return this.http
      .get<unknown>(`${this.base}/${tenantId}/settings`)
      .pipe(map(adaptTenantSetting));
  }

  create(data: TenantPayload): Observable<Tenant> {
    return this.http.post<unknown>(this.base, data).pipe(
      map(adaptTenant),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  update(id: number, data: Partial<TenantPayload>): Observable<Tenant> {
    return this.http.patch<unknown>(`${this.base}/${id}`, data).pipe(
      map(adaptTenant),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  saveSettings(
    tenantId: number,
    data: TenantSettingPayload,
  ): Observable<TenantSetting> {
    return this.http
      .put<unknown>(`${this.base}/${tenantId}/settings`, data)
      .pipe(
        map(adaptTenantSetting),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`).pipe(
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }
}
