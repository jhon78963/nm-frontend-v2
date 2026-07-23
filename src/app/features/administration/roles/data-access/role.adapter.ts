import { Permission, Role, RoleListResponse } from '../models/role.model';

function adaptPermission(raw: unknown): Permission {
  const r = raw as { id: number; name: string; label?: string; group?: string };
  return {
    id: r.id,
    name: r.name,
    label: r.label,
    group: r.group,
  };
}

export function adaptRole(raw: unknown): Role {
  const r = raw as { id: number; name: string; permissions?: unknown[] };
  return {
    id: r.id,
    name: r.name,
    permissions: r.permissions?.map(adaptPermission),
  };
}

export function adaptRoleList(raw: unknown): RoleListResponse {
  const r = raw as {
    data: unknown[];
    paginate: { total: number; pages: number };
  };
  return {
    data: r.data.map(adaptRole),
    paginate: { total: r.paginate.total, pages: r.paginate.pages },
  };
}

export function adaptPermissionList(raw: unknown[]): Permission[] {
  return raw.map(adaptPermission);
}
