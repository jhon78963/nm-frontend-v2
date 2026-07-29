export interface Size {
  id: number;
  description: string;
  sizeTypeLabel: string;
}

export interface SizeDetail {
  id: number;
  description: string;
  sizeTypeLabel: string;
}

export interface SizeType {
  id: number;
  description: string;
}

export interface SizeListResponse {
  data: Size[];
  paginate: { total: number; pages: number };
}

export interface SizePayload {
  description: string;
  sizeTypeId: number;
}

export interface SizeFormModel {
  description: string;
  sizeTypeId: number | null;
}

export interface SizeFilterState {
  limit: number;
  page: number;
  search: string;
  sizeTypeIds: number[];
}
