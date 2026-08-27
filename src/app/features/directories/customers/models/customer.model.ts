export interface Customer {
  id: string;
  dni: string;
  name: string;
  surname: string;
}

export interface CustomerListResponse {
  data: Customer[];
  paginate: { total: number; pages: number };
}

export interface CustomerPayload {
  dni: string;
  name: string;
  surname: string;
}

export interface CustomerFormModel {
  dni: string;
  name: string;
  surname: string;
}
