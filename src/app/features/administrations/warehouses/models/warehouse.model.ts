export interface Warehouse {
  id: number;
  name: string;
  tenantId: number | null;
}

export interface WarehouseListResponse {
  data: Warehouse[];
  paginate: { total: number; pages: number };
}

export interface WarehousePayload {
  name: string;
  tenantId: number;
}

export interface WarehouseFormModel {
  name: string;
  tenantId: number | null;
}

export interface TenantLookupOption {
  id: number;
  name: string;
}
