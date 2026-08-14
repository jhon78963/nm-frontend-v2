import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../features/auth/data-access/auth.service';
import { isAuthenticatedUser } from './permission.util';

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // Optimización: si no hay flag de sesión local, el usuario definitivamente
  // no está autenticado → permitir acceso sin disparar /auth/me.
  if (!authService.hasLocalSession()) {
    return true;
  }

  return authService.ensureSessionLoaded().pipe(
    map((user) => {
      if (!isAuthenticatedUser(user)) {
        return true;
      }

      if (user.mustChangePassword) {
        return router.createUrlTree(['/change-password']);
      }

      return router.createUrlTree(['/dashboard']);
    }),
  );
};
