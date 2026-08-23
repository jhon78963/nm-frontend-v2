import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../features/auth/data-access/auth.service';
import { isAuthenticatedUser, isSuperAdmin } from './permission.util';

const SUPER_ADMIN_HOME = '/administrations';

/** Bloquea rutas operativas para Super Admin; solo gestiona Administración. */
export const superAdminOperationalBlockGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.ensureSessionLoaded().pipe(
    map((user) => {
      if (!isAuthenticatedUser(user)) {
        authService.clearLocalSession();
        return router.createUrlTree(['auth', 'login']);
      }

      if (isSuperAdmin(user)) {
        return router.createUrlTree([SUPER_ADMIN_HOME]);
      }

      return true;
    }),
  );
};
