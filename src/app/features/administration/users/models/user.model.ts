export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  surname: string;
  profilePicture?: string | null;
  roles: string[];
  role?: string;
  tenantId: number;
  warehouseId: number;
}

export interface UserListResponse {
  data: User[];
  paginate: { total: number; pages: number };
}

export interface UserPayload {
  username?: string;
  email?: string;
  name?: string;
  surname?: string;
  profilePicture?: string;
  roleNames: string[];
  tenantId: number;
  warehouseId: number;
  password?: string;
  passwordConfirmation?: string;
}

export interface UserPasswordResetPayload {
  password: string;
  passwordConfirmation: string;
}

export interface TenantOption {
  id: number;
  name: string;
}

export interface WarehouseOption {
  id: number;
  name: string;
  tenantId?: number | null;
}

export interface RoleOption {
  id: number;
  name: string;
}

export interface UserFormModel {
  tenantId: number | null;
  warehouseId: number | null;
  roleName: string;
  name: string;
  surname: string;
  username: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface UserPasswordResetFormModel {
  password: string;
  passwordConfirmation: string;
}
