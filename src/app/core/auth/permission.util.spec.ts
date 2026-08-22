import { describe, expect, it } from 'vitest';
import {
  isAuthenticatedUser,
  userHasAnyPermission,
} from './permission.util';
import { AuthUser } from '../../features/auth/models/auth.model';

describe('permission.util', () => {
  const user: AuthUser = {
    id: 1,
    username: 'cajero',
    email: 'c@test.com',
    name: 'C',
    surname: 'X',
    role: 'Vendedora',
    permissions: ['pos.checkout', 'sale.getAll'],
  };

  it('isAuthenticatedUser requiere username', () => {
    expect(isAuthenticatedUser(user)).toBe(true);
    expect(isAuthenticatedUser({ ...user, username: '' })).toBe(false);
    expect(isAuthenticatedUser(null)).toBe(false);
  });

  it('userHasAnyPermission valida permisos requeridos', () => {
    expect(userHasAnyPermission(user, ['pos.checkout'])).toBe(true);
    expect(userHasAnyPermission(user, ['product.getAll'])).toBe(false);
    expect(userHasAnyPermission(user, [])).toBe(true);
  });

  it('Super Admin tiene todos los permisos', () => {
    const admin: AuthUser = {
      ...user,
      role: 'Super Admin',
      roles: ['Super Admin'],
      permissions: [],
    };
    expect(userHasAnyPermission(admin, ['product.getAll'])).toBe(true);
  });

  it('Admin de tenant tiene permisos de administración local', () => {
    const tenantAdmin: AuthUser = {
      ...user,
      role: 'Admin',
      roles: ['Admin'],
      permissions: [],
    };
    expect(userHasAnyPermission(tenantAdmin, ['user.getAll'])).toBe(true);
    expect(userHasAnyPermission(tenantAdmin, ['warehouse.getAll'])).toBe(true);
    expect(userHasAnyPermission(tenantAdmin, ['tenant.getAll'])).toBe(false);
  });
});
