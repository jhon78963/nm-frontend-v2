import { Injectable, signal } from '@angular/core';
import { isAdminOrSuperAdmin } from '../auth/permission.util';
import { AuthUser } from '../../features/auth/models/auth.model';

export const ACTIVE_WAREHOUSE_STORAGE_KEY = 'active_warehouse_id';

@Injectable({ providedIn: 'root' })
export class ActiveWarehouseService {
  /**
   * Se sincroniza desde auth/me. localStorage solo para selección de admin.
   */
  readonly activeWarehouseId = signal<number | null>(null);

  getActiveWarehouseId(): number | null {
    return this.activeWarehouseId();
  }

  syncFromAuthUser(user: AuthUser): void {
    const serverWarehouseId: number | null =
      typeof user.warehouseId === 'number' && user.warehouseId > 0
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

  setActiveWarehouseId(id: number | null): void {
    this.activeWarehouseId.set(id);
    this.persistToStorage(id);
  }

  clearWarehouse(): void {
    this.activeWarehouseId.set(null);
    localStorage.removeItem(ACTIVE_WAREHOUSE_STORAGE_KEY);
  }

  private readFromStorage(): number | null {
    const raw = localStorage.getItem(ACTIVE_WAREHOUSE_STORAGE_KEY);
    if (raw == null || raw.trim() === '') {
      return null;
    }

    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private persistToStorage(id: number | null): void {
    if (id != null && id > 0) {
      localStorage.setItem(ACTIVE_WAREHOUSE_STORAGE_KEY, String(id));
    } else {
      localStorage.removeItem(ACTIVE_WAREHOUSE_STORAGE_KEY);
    }
  }
}
