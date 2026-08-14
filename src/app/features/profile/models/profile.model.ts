export interface ProfileData {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  warehouse: string;
  createdAt: string;
}

export interface UpdateProfilePayload {
  name: string;
  email: string;
  phone: string | null;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
}

export interface ProfileFormModel {
  name: string;
  email: string;
  phone: string;
}

export interface PasswordFormModel {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
}
