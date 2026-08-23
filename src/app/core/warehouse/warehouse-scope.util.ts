import { AuthUser } from '../../features/auth/models/auth.model';
import { isSuperAdmin } from '../auth/permission.util';

/**
 * Tenant para filtrar /warehouses: Super Admin ve todas las tiendas (opcional tenant explícito).
 * Admin y resto solo su cliente.
 */
export function warehouseTenantFilterForActor(
  user: AuthUser | null,
  canListAllTenants: boolean,
  explicitTenantId?: number | null,
): number | null {
  if (isSuperAdmin(user) && canListAllTenants) {
    return explicitTenantId ?? null;
  }

  const actorTenantId = user?.tenantId;
  if (typeof actorTenantId === 'number' && actorTenantId > 0) {
    return actorTenantId;
  }

  return explicitTenantId ?? null;
}
