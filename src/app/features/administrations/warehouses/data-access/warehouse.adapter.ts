import {
  TenantLookupOption,
  Warehouse,
  WarehouseListResponse,
} from '../models/warehouse.model';

export function adaptWarehouse(raw: unknown): Warehouse {
  const r = raw as Warehouse;
  return {
    id: r.id,
    name: r.name,
    tenantId: r.tenantId ?? null,
  };
}

export function adaptWarehouseList(raw: unknown): WarehouseListResponse {
  const r = raw as {
    data: unknown[];
    paginate: { total: number; pages: number };
  };

  return {
    data: r.data.map(adaptWarehouse),
    paginate: { total: r.paginate.total, pages: r.paginate.pages },
  };
}

export function adaptTenantLookupOptions(raw: unknown): TenantLookupOption[] {
  const r = raw as { data?: unknown[] };
  return (r.data ?? []).map((item) => {
    const t = item as TenantLookupOption;
    return { id: t.id, name: t.name };
  });
}
