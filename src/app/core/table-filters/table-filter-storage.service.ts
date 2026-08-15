import { Injectable } from '@angular/core';

const STORAGE_PREFIX = 'nm-table-filters:';

/**
 * Persistencia de filtros de tablas en localStorage.
 * Sobrevive recargas de página y navegación entre vistas del ERP.
 */
@Injectable({ providedIn: 'root' })
export class TableFilterStorageService {
  load<T>(tableKey: string, validate?: (value: unknown) => value is T): T | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const raw = localStorage.getItem(this.buildKey(tableKey));
      if (!raw) {
        return null;
      }

      const parsed: unknown = JSON.parse(raw);
      if (validate && !validate(parsed)) {
        this.remove(tableKey);
        return null;
      }

      return parsed as T;
    } catch {
      this.remove(tableKey);
      return null;
    }
  }

  save<T>(tableKey: string, state: T): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.buildKey(tableKey), JSON.stringify(state));
    } catch {
      // localStorage puede fallar en modo privado o cuota llena
    }
  }

  remove(tableKey: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(this.buildKey(tableKey));
    } catch {
      // noop
    }
  }

  private buildKey(tableKey: string): string {
    return `${STORAGE_PREFIX}${tableKey}`;
  }
}
