export interface Permission {
  id: number;
  name: string;
  label?: string;
  group?: string;
}

export interface Role {
  id: number;
  name: string;
  permissions?: Permission[];
}

export interface RolePagination {
  total: number;
  pages: number;
}

export interface RoleListResponse {
  data: Role[];
  paginate: RolePagination;
}
