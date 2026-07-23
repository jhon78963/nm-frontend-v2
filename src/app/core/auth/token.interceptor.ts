import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
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
import { AuthService } from '../../features/auth/data-access/auth.service';

const AUTH_REFRESH_SKIP = ['/auth/login', '/auth/refresh', '/auth/logout'];

let isRefreshing = false;
const refreshResult$ = new BehaviorSubject<boolean | null>(null);

function shouldSkipRefresh(url: string): boolean {
  return AUTH_REFRESH_SKIP.some((path) => url.includes(path));
}

export const tokenInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const authReq = request.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || shouldSkipRefresh(request.url)) {
        return throwError(() => error);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshResult$.next(null);

        return authService.refreshSession().pipe(
          switchMap(() => {
            isRefreshing = false;
            refreshResult$.next(true);
            return next(authReq);
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            refreshResult$.next(false);
            authService.clearLocalSession();
            void router.navigate(['/auth/login']);
            return throwError(() => refreshError);
          }),
        );
      }

      return refreshResult$.pipe(
        filter((result) => result !== null),
        take(1),
        switchMap((success) => {
          if (success) {
            return next(authReq);
          }

          authService.clearLocalSession();
          void router.navigate(['/auth/login']);
          return throwError(() => error);
        }),
      );
    }),
  );
};
