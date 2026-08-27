import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  SizeDetail,
  SizeListResponse,
  SizePayload,
} from '../models/size.model';
import { adaptSizeDetail, adaptSizeList } from './size.adapter';

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
export class SizeService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/sizes`;

  getAll(params: {
    limit: number;
    page: number;
    search?: string;
    sizeTypeIds?: string[];
  }): Observable<SizeListResponse> {
    let url = `${this.base}?limit=${params.limit}&page=${params.page}`;

    if (params.search?.trim()) {
      url += `&search=${encodeURIComponent(params.search.trim())}`;
    }
    if (params.sizeTypeIds && params.sizeTypeIds.length > 0) {
      url += `&sizeTypeId=${params.sizeTypeIds.join(',')}`;
    }

    return this.http.get<unknown>(url).pipe(map(adaptSizeList));
  }

  getOne(id: string): Observable<SizeDetail> {
    return this.http
      .get<unknown>(`${this.base}/${id}`)
      .pipe(map(adaptSizeDetail));
  }

  create(data: SizePayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.base, data).pipe(
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  update(id: string, data: SizePayload): Observable<{ message: string }> {
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
