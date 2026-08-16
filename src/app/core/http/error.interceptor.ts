import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/data-access/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

function readBackendMessage(error: HttpErrorResponse): string | undefined {
  const raw = error.error?.message ?? error.error?.error;
  if (Array.isArray(raw)) {
    return raw[0];
  }

  return typeof raw === 'string' ? raw : undefined;
}

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const toastService = inject(ToastService);
  const authService = inject(AuthService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const status = error.status;

      if (status === 419) {
        toastService.show('error', 'Tu sesión ha expirado por seguridad');
        authService.clearLocalSession();
        void router.navigate(['/auth/login']);
        return throwError(() => error);
      }

      if (status === 403) {
        if (error.error?.error === 'PASSWORD_CHANGE_REQUIRED') {
          void router.navigate(['/change-password']);
          return throwError(() => error);
        }

        toastService.show(
          'error',
          readBackendMessage(error) ?? 'Acceso denegado',
        );
        void router.navigate(['/dashboard']);
        return throwError(() => error);
      }

      if (status === 422) {
        toastService.show(
          'error',
          readBackendMessage(error) ?? 'Error de validación',
        );
        return throwError(() => error);
      }

      if (status >= 500) {
        if (environment.production) {
          console.error('Error interno del servidor');
        }
        toastService.show(
          'error',
          'Error interno del servidor. Por favor, contacte a soporte técnico',
        );
        return throwError(() => error);
      }

      return throwError(() => error);
    }),
  );
};
