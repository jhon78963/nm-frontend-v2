export interface LoginRequest {
  username: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface ForgotPasswordFormModel {
  email: string;
}

export interface ResetPasswordFormModel {
  password: string;
  passwordConfirmation: string;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  password: string;
  passwordConfirmation: string;
}

export interface LoginFormModel {
  username: string;
  password: string;
}

export interface ChangePasswordFormModel {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string;
  surname: string;
  profilePicture?: string | null;
  role: string;
  roles?: string[];
  permissions?: string[];
  tenantId?: string | null;
  tenantName?: string | null;
  warehouseId?: string | null;
  mustChangePassword?: boolean;
}
