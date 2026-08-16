import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../features/auth/data-access/auth.service';
import { AuthUser } from '../../features/auth/models/auth.model';
import { isAuthenticatedUser } from './permission.util';

/** Roles con acceso a rutas administrativas (alineado con legacy). */
export const ADMIN_ROUTE_ROLES = ['Admin', 'Super Admin'] as const;

function userHasAllowedRole(
  user: AuthUser,
  allowedRoles: readonly string[],
): boolean {
  if (user.role !== undefined && allowedRoles.includes(user.role)) {
    return true;
  }

  return (user.roles ?? []).some((role) => allowedRoles.includes(role));
}

export const roleGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const allowedRoles =
    (route.data['roles'] as string[] | undefined) ?? [...ADMIN_ROUTE_ROLES];

  if (allowedRoles.length === 0) {
    return router.createUrlTree(['/dashboard']);
  }

  return authService.ensureSessionLoaded().pipe(
    map((user) => {
      if (!isAuthenticatedUser(user)) {
        authService.clearLocalSession();
        return router.createUrlTree(['auth', 'login']);
      }

      if (userHasAllowedRole(user, allowedRoles)) {
        return true;
      }

      return router.createUrlTree(['/dashboard']);
    }),
  );
};
