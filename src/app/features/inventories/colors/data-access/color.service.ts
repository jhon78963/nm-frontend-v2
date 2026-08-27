import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Color, ColorListResponse, ColorPayload } from '../models/color.model';
import { adaptColor, adaptColorList } from './color.adapter';

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
export class ColorService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/colors`;

  getAll(params: {
    limit: number;
    page: number;
    search?: string;
  }): Observable<ColorListResponse> {
    let url = `${this.base}?limit=${params.limit}&page=${params.page}`;

    if (params.search?.trim()) {
      url += `&search=${encodeURIComponent(params.search.trim())}`;
    }

    return this.http.get<unknown>(url).pipe(map(adaptColorList));
  }

  getOne(id: string): Observable<Color> {
    return this.http
      .get<unknown>(`${this.base}/${id}`)
      .pipe(map(adaptColor));
  }

  create(data: ColorPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.base, data).pipe(
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  update(id: string, data: ColorPayload): Observable<{ message: string }> {
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
