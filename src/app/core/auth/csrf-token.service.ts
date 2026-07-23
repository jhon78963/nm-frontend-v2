import { Injector, inject, Injectable } from '@angular/core';
import { defer, Observable, of, tap } from 'rxjs';
import { AuthService } from '../../features/auth/data-access/auth.service';

@Injectable({ providedIn: 'root' })
export class CsrfTokenService {
  private readonly injector = inject(Injector);

  private token: string | null = null;
  private handshake$?: Observable<string>;

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  clear(): void {
    this.token = null;
    this.handshake$ = undefined;
  }

  ensureToken(): Observable<string> {
    if (this.token) {
      return of(this.token);
    }

    if (!this.handshake$) {
      this.handshake$ = defer(() =>
        this.injector.get(AuthService).fetchCsrfHandshake(),
      ).pipe(
        tap((token) => {
          this.token = token;
        }),
      );
    }

    return this.handshake$;
  }
}
