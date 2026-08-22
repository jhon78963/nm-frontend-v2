import { AuthUser } from '../../features/auth/models/auth.model';

export const SUPER_ADMIN_ROLE = 'Super Admin';
export const ADMIN_ROLE = 'Admin';

/** Permisos de administración acotados al tenant del rol Admin. */
export const TENANT_ADMIN_PERMISSIONS: readonly string[] = [
  'role.getAll',
  'role.get',
  'role.create',
  'role.update',
  'role.delete',
  'role.syncPermissions',
  'role.permissionsIndex',
  'user.getAll',
  'user.get',
  'user.create',
  'user.update',
  'user.delete',
  'warehouse.getAll',
  'warehouse.get',
  'warehouse.create',
  'warehouse.update',
  'warehouse.delete',
  'tenant.get',
];

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

export function isAdmin(user: AuthUser | null): boolean {
  if (!user) {
    return false;
  }

  if (user.role === ADMIN_ROLE) {
    return true;
  }

  return (user.roles ?? []).includes(ADMIN_ROLE);
}

export function isAdminOrSuperAdmin(user: AuthUser | null): boolean {
  return isSuperAdmin(user) || isAdmin(user);
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

  if (isAdmin(user) && TENANT_ADMIN_PERMISSIONS.includes(permission)) {
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
