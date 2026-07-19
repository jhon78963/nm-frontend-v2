import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthResponse, AuthUser, LoginRequest } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api';

  readonly currentUser = signal<AuthUser | null>(null);

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          this.currentUser.set(response.user);
        }),
      );
  }

  logout(): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.apiUrl}/auth/logout`, {}, {
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          this.currentUser.set(null);
        }),
      );
  }

  getMe(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/me`, {}, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          this.currentUser.set(response.user);
        }),
      );
  }
}
