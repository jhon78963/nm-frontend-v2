export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  name: string;
  surname: string;
  profilePicture: string | null;
  role: string;
  roles: string[];
  permissions: string[];
  tenantId: number | null;
  warehouseId: number | null;
  mustChangePassword: boolean;
}

export interface AuthResponse {
  user: AuthUser;
}
