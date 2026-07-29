export interface Team {
  id: number;
  dni: string;
  name: string;
  surname: string;
  salary: number | null;
  warehouseId: number;
  userId: number | null;
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
  warehouseId: number;
}

export interface TeamFormModel {
  dni: string;
  name: string;
  surname: string;
  salary: number | null;
  warehouseId: number | null;
}

export interface TeamCreateResponse {
  message: string;
  data: Team;
}

export interface WarehouseLookupOption {
  id: number;
  name: string;
}
