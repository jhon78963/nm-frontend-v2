import {
  RoleOption,
  TenantOption,
  User,
  UserListResponse,
  WarehouseOption,
} from '../models/user.model';

export function adaptUser(raw: unknown): User {
  const r = raw as User;
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    name: r.name,
    surname: r.surname,
    profilePicture: r.profilePicture ?? null,
    roles: r.roles ?? [],
    role: r.role ?? r.roles?.[0],
    tenantId: r.tenantId,
    warehouseId: r.warehouseId,
  };
}

export function adaptUserList(raw: unknown): UserListResponse {
  const r = raw as {
    data: unknown[];
    paginate: { total: number; pages: number };
  };

  return {
    data: r.data.map(adaptUser),
    paginate: { total: r.paginate.total, pages: r.paginate.pages },
  };
}

export function adaptTenantOptions(raw: unknown): TenantOption[] {
  const r = raw as { data?: unknown[] };
  return (r.data ?? []).map((item) => {
    const t = item as TenantOption;
    return { id: t.id, name: t.name };
  });
}

export function adaptWarehouseOptions(raw: unknown): WarehouseOption[] {
  const r = raw as { data?: unknown[] };
  return (r.data ?? []).map((item) => {
    const w = item as WarehouseOption;
    return { id: w.id, name: w.name, tenantId: w.tenantId ?? null };
  });
}

export function adaptRoleOptions(raw: unknown): RoleOption[] {
  const r = raw as { data?: unknown[] };
  return (r.data ?? []).map((item) => {
    const role = item as RoleOption;
    return { id: role.id, name: role.name };
  });
}
