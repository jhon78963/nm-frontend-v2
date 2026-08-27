export interface Vendor {
  id: string;
  name: string;
  address: string;
  local: string;
  phone: string;
  balance: string | number | null;
}

export interface VendorListResponse {
  data: Vendor[];
  paginate: { total: number; pages: number };
}

export interface VendorPayload {
  name: string;
  address?: string;
  local?: string;
  phone?: string;
}

export interface VendorFormModel {
  name: string;
  address: string;
  local: string;
  phone: string;
}
