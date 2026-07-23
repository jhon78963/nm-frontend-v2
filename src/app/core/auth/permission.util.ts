import { AuthUser } from '../../features/auth/models/auth.model';

export const SUPER_ADMIN_ROLE = 'Super Admin';

export function isAuthenticatedUser(user: AuthUser | null): user is AuthUser {
  return !!user?.username?.trim();
}

export function isSuperAdmin(user: AuthUser | null): boolean {
  if (!user) {
    return false;
  }

  if (user.role === SUPER_ADMIN_ROLE) {
    return true;
  }

  return (user.roles ?? []).includes(SUPER_ADMIN_ROLE);
}

function readUserPermissions(user: AuthUser | null): Set<string> {
  const names = user?.permissions ?? [];
  return new Set(
    names.filter(
      (permission): permission is string =>
        typeof permission === 'string' && permission.trim().length > 0,
    ),
  );
}

export function userHasPermission(
  user: AuthUser | null,
  permission: string,
): boolean {
  if (isSuperAdmin(user)) {
    return true;
  }

  return readUserPermissions(user).has(permission);
}

export function userHasAnyPermission(
  user: AuthUser | null,
  required: readonly string[],
): boolean {
  if (required.length === 0) {
    return true;
  }

  if (isSuperAdmin(user)) {
    return true;
  }

  const granted = readUserPermissions(user);
  return required.some((permission) => granted.has(permission));
}
