import { HttpErrorResponse, HttpHeaders, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  filter,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { TokenStorageService } from './token-storage.service';
import { AuthService } from '../../features/auth/data-access/auth.service';
import { environment } from '../../../environments/environment';

/**
 * URLs públicas donde NO inyectamos el access_token como Bearer.
 * - /auth/login, /auth/forgot-password, /auth/reset-password: rutas públicas.
 * - /auth/refresh: el Bearer aquí es el refresh_token (lo gestiona AuthService manualmente).
 */
const PUBLIC_URL_PARTS = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
];

/**
 * URLs donde un 401 es esperado/válido: no intentar refresh automático.
 * - /auth/me: durante el arranque de la app se llama sin sesión (guest).
 *   El restoreSession() de AuthService maneja el retry manual.
 * - /auth/logout: puede devolver 401 si el token ya expiró; no hay nada que refrescar.
 */
const REFRESH_SKIP_URL_PARTS = [
  ...PUBLIC_URL_PARTS,
  '/auth/me',
  '/auth/logout',
];

let isRefreshing = false;
const refreshResult$ = new BehaviorSubject<string | null>(null);

function isPublicUrl(url: string): boolean {
  return PUBLIC_URL_PARTS.some((part) => url.includes(part));
}

function shouldSkipRefresh(url: string): boolean {
  return REFRESH_SKIP_URL_PARTS.some((part) => url.includes(part));
}

function addBearerHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
}

export const tokenInterceptor: HttpInterceptorFn = (request, next) => {
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Rutas públicas: sin Bearer, sin withCredentials
  if (isPublicUrl(request.url)) {
    return next(request);
  }

  const accessToken = tokenStorage.getAccessToken();
  const authReq = accessToken ? addBearerHeader(request, accessToken) : request;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || shouldSkipRefresh(request.url)) {
        return throwError(() => error);
      }

      // Primer intento de refresh: bloqueamos peticiones paralelas
      if (!isRefreshing) {
        isRefreshing = true;
        refreshResult$.next(null);

        return authService.refreshSession().pipe(
          switchMap((newAccessToken) => {
            isRefreshing = false;
            refreshResult$.next(newAccessToken);
            return next(addBearerHeader(request, newAccessToken));
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            refreshResult$.next(null);
            authService.clearLocalSession();
            void router.navigate(['/auth/login']);
            return throwError(() => refreshError);
          }),
        );
      }

      // Otras peticiones esperan el resultado del refresh en curso
      return refreshResult$.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap((newToken) => {
          if (newToken) {
            return next(addBearerHeader(request, newToken));
          }

          authService.clearLocalSession();
          void router.navigate(['/auth/login']);
          return throwError(() => error);
        }),
      );
    }),
  );
};
