import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../features/auth/data-access/auth.service';
import { isAuthenticatedUser } from './permission.util';

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.ensureSessionLoaded().pipe(
    map((user) => {
      if (!isAuthenticatedUser(user)) {
        return true;
      }

      if (user.mustChangePassword) {
        return router.createUrlTree(['/change-password']);
      }

      return router.createUrlTree(['/administration/roles']);
    }),
  );
};
