export interface Size {
  id: string;
  description: string;
  sizeTypeLabel: string;
  sizeTypeId?: string | null;
}

export interface SizeDetail {
  id: string;
  description: string;
  sizeTypeLabel: string;
  sizeTypeId?: string | null;
}

export interface SizeType {
  id: string;
  description: string;
}

export interface SizeListResponse {
  data: Size[];
  paginate: { total: number; pages: number };
}

export interface SizePayload {
  description: string;
  sizeTypeId: string;
}

export interface SizeFormModel {
  description: string;
  sizeTypeId: string | null;
}

export interface SizeFilterState {
  limit: number;
  page: number;
  search: string;
  sizeTypeIds: string[];
}
