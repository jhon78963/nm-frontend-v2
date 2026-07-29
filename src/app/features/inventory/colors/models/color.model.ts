export interface Color {
  id: number;
  description: string;
  hash: string;
}

export interface ColorListResponse {
  data: Color[];
  paginate: { total: number; pages: number };
}

export interface ColorPayload {
  description: string;
  hash: string;
}

export interface ColorFormModel {
  description: string;
  hash: string;
}

export interface ColorFilterState {
  limit: number;
  page: number;
  search: string;
}
