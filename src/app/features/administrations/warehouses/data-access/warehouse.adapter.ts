import {
  TenantLookupOption,
  Warehouse,
  WarehouseListResponse,
} from '../models/warehouse.model';

export function adaptWarehouse(raw: unknown): Warehouse {
  const r = raw as Warehouse & {
    tenant_electronic_invoicing_enabled?: boolean;
  };
  return {
    id: r.id,
    name: r.name,
    tenantId: r.tenantId ?? null,
    electronicInvoicingEnabled: r.electronicInvoicingEnabled ?? false,
    tenantElectronicInvoicingEnabled:
      r.tenantElectronicInvoicingEnabled ??
      r.tenant_electronic_invoicing_enabled ??
      false,
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
    const t = item as TenantLookupOption & {
      setting?: { electronicInvoicingEnabled?: boolean };
    };
    return {
      id: t.id,
      name: t.name,
      electronicInvoicingEnabled:
        t.electronicInvoicingEnabled ??
        t.setting?.electronicInvoicingEnabled ??
        false,
    };
  });
}
