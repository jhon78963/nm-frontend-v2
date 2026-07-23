import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CsrfTokenService } from '../../../core/auth/csrf-token.service';
import { adaptAuthUser } from './auth.adapter';
import { AuthUser, LoginRequest } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly SESSION_FLAG_KEY = 'authSession';

  private readonly http = inject(HttpClient);
  private readonly csrfTokenService = inject(CsrfTokenService);

  readonly currentUser = signal<AuthUser | null>(null);

  private sessionLoadRequest$?: Observable<AuthUser | null>;

  fetchCsrfHandshake(): Observable<string> {
    return this.http
      .get(`${environment.baseWebUrl}/sanctum/csrf-cookie`, {
        withCredentials: true,
        responseType: 'text',
      })
      .pipe(
        switchMap(() =>
          this.http.get<{ csrf_token?: string; message?: string }>(
            `${environment.apiUrl}/auth/csrf-token`,
            { withCredentials: true },
          ),
        ),
        map((response) => {
          if (!response?.csrf_token) {
            throw new Error(
              response?.message ??
                'No se pudo obtener el token CSRF. Verifique sesión y reinicie el backend.',
            );
          }

          return response.csrf_token;
        }),
      );
  }

  login(credentials: LoginRequest): Observable<AuthUser> {
    return this.fetchCsrfHandshake().pipe(
      tap((token) => this.csrfTokenService.setToken(token)),
      switchMap(() =>
        this.http.post<AuthUser | { data: AuthUser }>(
          `${environment.apiUrl}/auth/login`,
          credentials,
        ),
      ),
      map((response) => adaptAuthUser(response)),
      tap((user) => this.setUserData(user)),
      catchError((err) => throwError(() => this.extractErrorMessage(err))),
    );
  }

  getMe(): Observable<AuthUser> {
    return this.http
      .post<AuthUser | { data: AuthUser }>(`${environment.apiUrl}/auth/me`, {})
      .pipe(map((response) => adaptAuthUser(response)));
  }

  ensureSessionLoaded(): Observable<AuthUser | null> {
    const cachedUser = this.currentUser();
    if (cachedUser?.username?.trim()) {
      return of(cachedUser);
    }

    if (!this.sessionLoadRequest$) {
      this.sessionLoadRequest$ = this.getMe().pipe(
        map((user) => {
          this.setUserData(user);
          return user;
        }),
        catchError(() => {
          this.clearLocalSession();
          return of(null);
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }

    return this.sessionLoadRequest$;
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/logout`, {});
  }

  refreshSession(): Observable<void> {
    return this.http
      .post<{ message: string }>(`${environment.apiUrl}/auth/refresh`, {})
      .pipe(map(() => undefined));
  }

  signOut(): Observable<void> {
    return this.logout().pipe(
      catchError(() => of(undefined)),
      map(() => undefined),
      tap(() => this.clearLocalSession()),
    );
  }

  clearLocalSession(): void {
    this.currentUser.set(null);
    this.sessionLoadRequest$ = undefined;
    this.csrfTokenService.clear();
    localStorage.removeItem(AuthService.SESSION_FLAG_KEY);
  }

  private setUserData(user: AuthUser): void {
    this.currentUser.set({ ...user });
    this.sessionLoadRequest$ = undefined;
    localStorage.setItem(
      AuthService.SESSION_FLAG_KEY,
      JSON.stringify({ isLoggedIn: true }),
    );
  }

  private extractErrorMessage(err: unknown): string {
    if (typeof err === 'string' && err.trim()) {
      return err;
    }

    const http = err as {
      error?: { message?: string | string[] };
      message?: string;
      status?: number;
    };

    const backendMessage = http?.error?.message;
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }
    if (Array.isArray(backendMessage) && backendMessage.length > 0) {
      return backendMessage.join(' ');
    }

    if (http?.status === 401) {
      return 'Credenciales inválidas. Verifica tu usuario y contraseña.';
    }
    if (http?.status === 419) {
      return 'La sesión de seguridad expiró. Recarga la página e intenta de nuevo.';
    }

    return http?.message ?? 'Error de autenticación. Intenta nuevamente.';
  }
}
