import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

/**
 * Servicio CSRF desactivado — NestJS no usa tokens CSRF (Sanctum removed).
 * Conservado para evitar romper imports existentes durante la transición.
 */
@Injectable({ providedIn: 'root' })
export class CsrfTokenService {
  getToken(): string | null {
    return null;
  }

  setToken(_token: string): void {
    // no-op
  }

  clear(): void {
    // no-op
  }

  ensureToken(): Observable<string> {
    return of('');
  }
}
