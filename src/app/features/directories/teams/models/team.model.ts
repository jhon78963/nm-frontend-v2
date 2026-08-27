export interface Team {
  id: string;
  dni: string;
  name: string;
  surname: string;
  salary: number | null;
  warehouseId: string;
  userId: string | null;
  userEmail: string | null;
}

export interface TeamListResponse {
  data: Team[];
  paginate: { total: number; pages: number };
}

export interface TeamPayload {
  dni: string;
  name: string;
  surname: string;
  salary: number | null;
  warehouseId: string;
}

export interface TeamFormModel {
  dni: string;
  name: string;
  surname: string;
  salary: number | null;
  warehouseId: string | null;
}

export interface TeamCreateResponse {
  message: string;
  data: Team;
}

export interface WarehouseLookupOption {
  id: string;
  name: string;
  tenantId?: string | null;
  tenantName?: string | null;
}
