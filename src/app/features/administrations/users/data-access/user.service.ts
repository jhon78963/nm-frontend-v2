import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  User,
  UserListResponse,
  UserPasswordResetPayload,
  UserPayload,
} from '../models/user.model';
import { adaptUser, adaptUserList } from './user.adapter';

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

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users`;

  getAll(params: {
    limit: number;
    page: number;
    search?: string;
  }): Observable<UserListResponse> {
    let url = `${this.base}?limit=${params.limit}&page=${params.page}`;
    if (params.search?.trim()) {
      url += `&search=${encodeURIComponent(params.search.trim())}`;
    }

    return this.http.get<unknown>(url).pipe(map(adaptUserList));
  }

  getOne(id: number): Observable<User> {
    return this.http.get<unknown>(`${this.base}/${id}`).pipe(map(adaptUser));
  }

  create(data: UserPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.base, data).pipe(
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  update(id: number, data: Partial<UserPayload>): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}`, data).pipe(
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  resetPassword(
    id: number,
    data: UserPasswordResetPayload,
  ): Observable<{ message: string }> {
    return this.http
      .patch<{ message: string }>(`${this.base}/${id}/password`, data)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`).pipe(
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }
}
