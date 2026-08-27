import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  Warehouse,
  WarehouseListResponse,
  WarehousePayload,
} from '../models/warehouse.model';
import { adaptWarehouse, adaptWarehouseList } from './warehouse.adapter';

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
export class WarehouseService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/warehouses`;

  getAll(params: {
    limit: number;
    page: number;
    search?: string;
    tenantId?: string | null;
  }): Observable<WarehouseListResponse> {
    let url = `${this.base}?limit=${params.limit}&page=${params.page}`;

    if (params.search?.trim()) {
      url += `&search=${encodeURIComponent(params.search.trim())}`;
    }
    if (params.tenantId) {
      url += `&tenant_id=${params.tenantId}`;
    }

    return this.http.get<unknown>(url).pipe(map(adaptWarehouseList));
  }

  getOne(id: string): Observable<Warehouse> {
    return this.http.get<unknown>(`${this.base}/${id}`).pipe(map(adaptWarehouse));
  }

  create(data: WarehousePayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.base, data).pipe(
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  update(id: string, data: Partial<WarehousePayload>): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}`, data).pipe(
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`).pipe(
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }
}
