import { AuthUser } from '../models/auth.model';

export interface LoginApiResponse {
  access_token: string;
  refresh_token: string;
  user?: AuthUser;
}

export interface RefreshApiResponse {
  access_token: string;
  refresh_token?: string;
}

/**
 * Normaliza la respuesta de /auth/me — NestJS devuelve el usuario directamente
 * o envuelto en { data: AuthUser } según el interceptor global de respuesta.
 */
export function adaptAuthUser(raw: AuthUser | { data: AuthUser }): AuthUser {
  if (raw && typeof raw === 'object' && 'data' in raw && raw.data) {
    return raw.data as AuthUser;
  }

  return raw as AuthUser;
}
