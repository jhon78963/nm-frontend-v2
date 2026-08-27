import { Injectable, signal } from '@angular/core';
import { isAdminOrSuperAdmin } from '../auth/permission.util';
import { AuthUser } from '../../features/auth/models/auth.model';

export const ACTIVE_WAREHOUSE_STORAGE_KEY = 'active_warehouse_id';

@Injectable({ providedIn: 'root' })
export class ActiveWarehouseService {
  /**
   * UUID del almacén activo. Se sincroniza desde /auth/me.
   * Los admins pueden sobreescribirlo desde localStorage.
   */
  readonly activeWarehouseId = signal<string | null>(null);

  getActiveWarehouseId(): string | null {
    return this.activeWarehouseId();
  }

  syncFromAuthUser(user: AuthUser): void {
    const serverWarehouseId: string | null =
      typeof user.warehouseId === 'string' && user.warehouseId.length > 0
        ? user.warehouseId
        : null;

    if (isAdminOrSuperAdmin(user)) {
      const storedId = this.readFromStorage();
      const effective = storedId ?? serverWarehouseId;
      this.activeWarehouseId.set(effective);
      this.persistToStorage(effective);
    } else {
      localStorage.removeItem(ACTIVE_WAREHOUSE_STORAGE_KEY);
      this.activeWarehouseId.set(serverWarehouseId);
    }
  }

  setActiveWarehouseId(id: string | null): void {
    this.activeWarehouseId.set(id);
    this.persistToStorage(id);
  }

  clearWarehouse(): void {
    this.activeWarehouseId.set(null);
    localStorage.removeItem(ACTIVE_WAREHOUSE_STORAGE_KEY);
  }

  private readFromStorage(): string | null {
    const raw = localStorage.getItem(ACTIVE_WAREHOUSE_STORAGE_KEY);
    return raw && raw.trim().length > 0 ? raw.trim() : null;
  }

  private persistToStorage(id: string | null): void {
    if (id != null && id.trim().length > 0) {
      localStorage.setItem(ACTIVE_WAREHOUSE_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_WAREHOUSE_STORAGE_KEY);
    }
  }
}
