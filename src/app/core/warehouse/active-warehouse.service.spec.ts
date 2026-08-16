import { describe, expect, it } from 'vitest';
import { ACTIVE_WAREHOUSE_STORAGE_KEY, ActiveWarehouseService } from './active-warehouse.service';
import { AuthUser } from '../../features/auth/models/auth.model';

function vendedora(warehouseId = 1): AuthUser {
  return {
    id: 2,
    username: 'vendedora',
    email: 'v@test.com',
    name: 'María',
    surname: 'V',
    role: 'Vendedora',
    roles: ['Vendedora'],
    warehouseId,
  };
}

function superAdmin(warehouseId = 1): AuthUser {
  return {
    id: 1,
    username: 'superadmin',
    email: 'a@test.com',
    name: 'Admin',
    surname: 'A',
    role: 'Super Admin',
    roles: ['Super Admin'],
    warehouseId,
  };
}

describe('ActiveWarehouseService', () => {
  it('sincroniza warehouse del servidor para usuario regular y borra spoof localStorage', () => {
    localStorage.setItem(ACTIVE_WAREHOUSE_STORAGE_KEY, '9999');
    const service = new ActiveWarehouseService();

    service.syncFromAuthUser(vendedora(3));

    expect(service.getActiveWarehouseId()).toBe(3);
    expect(localStorage.getItem(ACTIVE_WAREHOUSE_STORAGE_KEY)).toBeNull();
  });

  it('permite warehouse persistido para admin', () => {
    localStorage.setItem(ACTIVE_WAREHOUSE_STORAGE_KEY, '5');
    const service = new ActiveWarehouseService();

    service.syncFromAuthUser(superAdmin(1));

    expect(service.getActiveWarehouseId()).toBe(5);
    expect(localStorage.getItem(ACTIVE_WAREHOUSE_STORAGE_KEY)).toBe('5');
  });

  it('clearWarehouse resetea signal y storage', () => {
    const service = new ActiveWarehouseService();
    service.setActiveWarehouseId(7);
    service.clearWarehouse();

    expect(service.getActiveWarehouseId()).toBeNull();
    expect(localStorage.getItem(ACTIVE_WAREHOUSE_STORAGE_KEY)).toBeNull();
  });
});
