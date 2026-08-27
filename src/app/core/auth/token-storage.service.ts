import { Injectable } from '@angular/core';

/**
 * Almacenamiento seguro de tokens JWT.
 * - access_token: vida corta (15 min), se envía en cada request como Bearer.
 * - refresh_token: vida larga, se usa solo en POST /v1/auth/refresh.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly ACCESS_KEY = 'auth_access_token';
  private readonly REFRESH_KEY = 'auth_refresh_token';

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  setTokens(access: string, refresh: string): void {
    localStorage.setItem(this.ACCESS_KEY, access);
    localStorage.setItem(this.REFRESH_KEY, refresh);
  }

  updateAccessToken(access: string): void {
    localStorage.setItem(this.ACCESS_KEY, access);
  }

  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  }

  hasTokens(): boolean {
    return this.getAccessToken() !== null;
  }
}
