export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  surname: string;
  profilePicture?: string | null;
  roles: string[];
  role?: string;
  tenantId: string | null;
  tenantName?: string | null;
  warehouseId: string | null;
  warehouseName?: string | null;
  isEnabled: boolean;
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
  tenantId?: string | null;
  warehouseId?: string | null;
  password?: string;
  passwordConfirmation?: string;
}

export interface UserPasswordResetPayload {
  password: string;
  passwordConfirmation: string;
}

export interface TenantOption {
  id: string;
  name: string;
}

export interface WarehouseOption {
  id: string;
  name: string;
  tenantId?: string | null;
}

export interface RoleOption {
  id: string;
  name: string;
}

export interface UserFormModel {
  tenantId: string | null;
  warehouseId: string | null;
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
