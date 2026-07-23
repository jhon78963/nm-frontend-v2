import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap } from 'rxjs';
import { CsrfTokenService } from './csrf-token.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const CSRF_SKIP_URL_PARTS = ['/sanctum/csrf-cookie', '/auth/csrf-token'];

function shouldAttachCsrf(url: string, method: string): boolean {
  if (!MUTATING_METHODS.has(method)) {
    return false;
  }

  return !CSRF_SKIP_URL_PARTS.some((part) => url.includes(part));
}

export const csrfInterceptor: HttpInterceptorFn = (request, next) => {
  if (!shouldAttachCsrf(request.url, request.method)) {
    return next(request);
  }

  const csrfTokenService = inject(CsrfTokenService);

  const attachHeader = (token: string) => {
    if (request.headers.has('X-CSRF-TOKEN')) {
      return request;
    }

    return request.clone({
      setHeaders: { 'X-CSRF-TOKEN': token },
    });
  };

  const existing = csrfTokenService.getToken();
  if (existing) {
    return next(attachHeader(existing));
  }

  return csrfTokenService
    .ensureToken()
    .pipe(switchMap((token) => next(attachHeader(token))));
};
