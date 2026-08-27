export interface Permission {
  id: string;
  name: string;
  label?: string;
  group?: string;
}

export interface Role {
  id: string;
  name: string;
  tenantId?: string | null;
  permissions?: Permission[];
}

/** Rol custom del tenant (editable). Los globales asignables tienen tenantId null. */
export function isTenantManagedRole(role: Role): boolean {
  return typeof role.tenantId === 'string' && role.tenantId.length > 0;
}

export interface RolePagination {
  total: number;
  pages: number;
}

export interface RoleListResponse {
  data: Role[];
  paginate: RolePagination;
}
