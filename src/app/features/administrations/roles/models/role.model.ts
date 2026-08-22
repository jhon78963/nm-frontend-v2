export interface Permission {
  id: number;
  name: string;
  label?: string;
  group?: string;
}

export interface Role {
  id: number;
  name: string;
  tenantId?: number | null;
  permissions?: Permission[];
}

/** Rol custom del tenant (editable). Los globales asignables tienen tenantId null. */
export function isTenantManagedRole(role: Role): boolean {
  return typeof role.tenantId === 'number' && role.tenantId > 0;
}

export interface RolePagination {
  total: number;
  pages: number;
}

export interface RoleListResponse {
  data: Role[];
  paginate: RolePagination;
}
