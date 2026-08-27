import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
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
import {
  userHasAnyPermission,
  userHasPermission,
} from '../../../core/auth/permission.util';
import { TokenStorageService } from '../../../core/auth/token-storage.service';
import { ActiveWarehouseService } from '../../../core/warehouse/active-warehouse.service';
import {
  adaptAuthUser,
  LoginApiResponse,
  RefreshApiResponse,
} from './auth.adapter';
import {
  AuthUser,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  ResetPasswordRequest,
} from '../models/auth.model';

@Service()
export class AuthService {
  private static readonly SESSION_FLAG_KEY = 'authSession';
  private static readonly PERSISTENT_STORAGE_KEYS: readonly string[] = [];

  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly activeWarehouseService = inject(ActiveWarehouseService);

  readonly currentUser = signal<AuthUser | null>(null);

  private sessionLoadRequest$?: Observable<AuthUser | null>;

  hasPermission(permission: string): boolean {
    return userHasPermission(this.currentUser(), permission);
  }

  hasAnyPermission(permissions: readonly string[]): boolean {
    return userHasAnyPermission(this.currentUser(), permissions);
  }

  login(credentials: LoginRequest): Observable<AuthUser> {
    return this.http
      .post<LoginApiResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(({ access_token, refresh_token }) => {
          this.tokenStorage.setTokens(access_token, refresh_token);
        }),
        switchMap(({ user }) => {
          if (user) {
            return of(user);
          }
          return this.getMe();
        }),
        tap((user) => this.setUserData(user)),
        catchError((err) => throwError(() => this.extractErrorMessage(err))),
      );
  }

  getMe(): Observable<AuthUser> {
    return this.http
      .get<AuthUser | { data: AuthUser }>(`${environment.apiUrl}/auth/me`)
      .pipe(map((response) => adaptAuthUser(response)));
  }

  changePassword(payload: ChangePasswordRequest): Observable<void> {
    return this.http
      .patch<void>(`${environment.apiUrl}/auth/change-password`, payload)
      .pipe(
        catchError((err) => throwError(() => this.extractErrorMessage(err))),
      );
  }

  hasLocalSession(): boolean {
    return (
      localStorage.getItem(AuthService.SESSION_FLAG_KEY) !== null &&
      this.tokenStorage.hasTokens()
    );
  }

  ensureSessionLoaded(): Observable<AuthUser | null> {
    const cachedUser = this.currentUser();
    if (cachedUser?.username?.trim()) {
      return of(cachedUser);
    }

    if (!this.hasLocalSession()) {
      return of(null);
    }

    if (!this.sessionLoadRequest$) {
      this.sessionLoadRequest$ = this.restoreSession().pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.sessionLoadRequest$;
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, payload)
      .pipe(catchError((err) => throwError(() => this.extractErrorMessage(err))));
  }

  resetPassword(payload: ResetPasswordRequest): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${environment.apiUrl}/auth/reset-password`, payload)
      .pipe(catchError((err) => throwError(() => this.extractErrorMessage(err))));
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${environment.apiUrl}/auth/logout`, {})
      .pipe(catchError(() => of(undefined)));
  }

  /**
   * Envía el refresh_token como Bearer (JwtRefreshGuard lo extrae del header).
   * Retorna el nuevo access_token para que el tokenInterceptor lo inyecte
   * en la petición original que causó el 401.
   */
  refreshSession(): Observable<string> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${refreshToken}` });

    return this.http
      .post<RefreshApiResponse>(
        `${environment.apiUrl}/auth/refresh`,
        {},
        { headers },
      )
      .pipe(
        tap(({ access_token, refresh_token }) => {
          this.tokenStorage.updateAccessToken(access_token);
          if (refresh_token) {
            this.tokenStorage.setTokens(access_token, refresh_token);
          }
        }),
        map(({ access_token }) => access_token),
      );
  }

  private restoreSession(): Observable<AuthUser | null> {
    return this.getMe().pipe(
      map((user) => {
        this.setUserData(user);
        return user;
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.refreshSession().pipe(
            switchMap(() => this.getMe()),
            map((user) => {
              this.setUserData(user);
              return user;
            }),
            catchError(() => this.handleSessionRestoreFailure()),
          );
        }

        return this.handleSessionRestoreFailure();
      }),
    );
  }

  private handleSessionRestoreFailure(): Observable<null> {
    this.clearLocalSession();
    return of(null);
  }

  signOut(): Observable<void> {
    return this.logout().pipe(
      map(() => undefined),
      tap(() => this.clearLocalSession()),
    );
  }

  patchCurrentUser(patch: Partial<AuthUser>): void {
    const current = this.currentUser();
    if (!current) {
      return;
    }

    this.setUserData({ ...current, ...patch });
  }

  clearLocalSession(): void {
    this.currentUser.set(null);
    this.sessionLoadRequest$ = undefined;
    this.tokenStorage.clearTokens();
    this.activeWarehouseService.clearWarehouse();

    const preserved = this.preservePersistentStorage();
    localStorage.clear();
    sessionStorage.clear();
    this.restorePersistentStorage(preserved);
  }

  private preservePersistentStorage(): Record<string, string> {
    const preserved: Record<string, string> = {};

    for (const key of AuthService.PERSISTENT_STORAGE_KEYS) {
      const localValue = localStorage.getItem(key);
      if (localValue !== null) {
        preserved[`local:${key}`] = localValue;
      }

      const sessionValue = sessionStorage.getItem(key);
      if (sessionValue !== null) {
        preserved[`session:${key}`] = sessionValue;
      }
    }

    return preserved;
  }

  private restorePersistentStorage(preserved: Record<string, string>): void {
    for (const [key, value] of Object.entries(preserved)) {
      if (key.startsWith('local:')) {
        localStorage.setItem(key.slice('local:'.length), value);
      } else if (key.startsWith('session:')) {
        sessionStorage.setItem(key.slice('session:'.length), value);
      }
    }
  }

  private setUserData(user: AuthUser): void {
    this.currentUser.set({ ...user });
    this.activeWarehouseService.syncFromAuthUser(user);
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

    if (http?.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté activo en http://localhost:3000';
    }
    if (http?.status === 401) {
      return 'Credenciales inválidas. Verifica tu usuario y contraseña.';
    }
    if (http?.status === 429) {
      return 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.';
    }

    return http?.message ?? 'Error de autenticación. Intenta nuevamente.';
  }
}
