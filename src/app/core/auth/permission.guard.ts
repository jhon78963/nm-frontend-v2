import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../features/auth/data-access/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { isAuthenticatedUser, userHasAnyPermission } from './permission.util';

function resolveRequiredPermissions(route: ActivatedRouteSnapshot): string[] {
  const requiredPermission = route.data['permission'];
  if (typeof requiredPermission === 'string' && requiredPermission.trim()) {
    return [requiredPermission.trim()];
  }

  const requiredPermissions = route.data['permissions'];
  if (Array.isArray(requiredPermissions)) {
    return requiredPermissions.filter(
      (permission): permission is string =>
        typeof permission === 'string' && permission.trim().length > 0,
    );
  }

  return [];
}

export const permissionGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const toastService = inject(ToastService);
  const authService = inject(AuthService);
  const required = resolveRequiredPermissions(route);

  if (required.length === 0) {
    return true;
  }

  return authService.ensureSessionLoaded().pipe(
    map((user) => {
      if (!isAuthenticatedUser(user)) {
        authService.clearLocalSession();
        return router.createUrlTree(['auth', 'login']);
      }

      if (userHasAnyPermission(user, required)) {
        return true;
      }

      toastService.show('error', 'Acceso denegado. No tienes permisos para esta sección.');
      return router.createUrlTree(['/administration/roles']);
    }),
  );
};
