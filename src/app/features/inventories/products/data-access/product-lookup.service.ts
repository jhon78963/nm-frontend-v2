import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { isSuperAdmin } from '../../../../core/auth/permission.util';
import { AuthService } from '../../../auth/data-access/auth.service';
import { Gender, Warehouse, SizeType } from '../models/product.model';
import {
  adaptGender,
  adaptSizeType,
  adaptWarehouse,
  extractApiList,
} from './product.adapter';

@Service()
export class ProductLookupService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  getGenders(): Observable<Gender[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/genders`)
      .pipe(map((raw) => extractApiList(raw).map(adaptGender)));
  }

  getWarehouses(): Observable<Warehouse[]> {
    if (!this.authService.hasPermission('warehouse.getAll')) {
      return of(this.warehousesFromSessionUser());
    }

    let url = `${this.apiUrl}/warehouses?limit=200&page=1`;
    const tenantId = this.actorTenantIdForWarehouseLookup();

    if (tenantId != null) {
      url += `&tenant_id=${tenantId}`;
    }

    return this.http
      .get<unknown>(url)
      .pipe(map((raw) => extractApiList(raw).map(adaptWarehouse)));
  }

  getSizeTypes(): Observable<SizeType[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/sizes/size-types`)
      .pipe(map((raw) => extractApiList(raw).map(adaptSizeType)));
  }

  private actorTenantIdForWarehouseLookup(): string | null {
    const user = this.authService.currentUser();

    if (isSuperAdmin(user) && this.authService.hasPermission('tenant.getAll')) {
      return null;
    }

    const tenantId = user?.tenantId;
    return tenantId ? String(tenantId) : null;
  }

  private warehousesFromSessionUser(): Warehouse[] {
    const user = this.authService.currentUser();
    const warehouseId = user?.warehouseId;

    if (warehouseId) {
      return [{ id: String(warehouseId), name: `Tienda #${warehouseId}` }];
    }

    return [];
  }
}
