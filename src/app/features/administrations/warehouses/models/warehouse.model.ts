export interface Warehouse {
  id: string;
  name: string;
  tenantId: string | null;
}

export interface WarehouseListResponse {
  data: Warehouse[];
  paginate: { total: number; pages: number };
}

export interface WarehousePayload {
  name: string;
  tenantId: string;
}

export interface WarehouseFormModel {
  name: string;
  tenantId: string | null;
}

export interface TenantLookupOption {
  id: string;
  name: string;
}
