import { AuthUser } from '../models/auth.model';

export function adaptAuthUser(raw: AuthUser | { data: AuthUser }): AuthUser {
  if (raw && typeof raw === 'object' && 'data' in raw && raw.data) {
    return raw.data;
  }

  return raw as AuthUser;
}
