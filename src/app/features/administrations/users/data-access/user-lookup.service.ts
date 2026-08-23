import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { isSuperAdmin, SUPER_ADMIN_ROLE } from '../../../../core/auth/permission.util';
import { AuthService } from '../../../auth/data-access/auth.service';
import {
  RoleOption,
  TenantOption,
  WarehouseOption,
} from '../models/user.model';
import {
  adaptRoleOptions,
  adaptTenantOptions,
  adaptWarehouseOptions,
} from './user.adapter';

@Injectable({ providedIn: 'root' })
export class UserLookupService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly api = environment.apiUrl;

  getTenants(): Observable<TenantOption[]> {
    if (this.authService.hasPermission('tenant.getAll')) {
      return this.http
        .get<unknown>(`${this.api}/tenants?limit=200&page=1`)
        .pipe(map(adaptTenantOptions));
    }

    const tenantId = this.authService.currentUser()?.tenantId;
    if (tenantId == null || tenantId <= 0) {
      return of([]);
    }

    if (this.authService.hasPermission('tenant.get')) {
      return this.http
        .get<unknown>(`${this.api}/tenants/${tenantId}`)
        .pipe(
          map((raw) => {
            const tenant = raw as TenantOption;
            return [{ id: tenant.id, name: tenant.name }];
          }),
        );
    }

    return of([{ id: tenantId, name: `Cliente #${tenantId}` }]);
  }

  getWarehouses(tenantId?: number | null): Observable<WarehouseOption[]> {
    if (!this.authService.hasPermission('warehouse.getAll')) {
      return of([]);
    }

    const scopedTenantId = this.resolveWarehouseTenantFilter(tenantId);
    let url = `${this.api}/warehouses?limit=200&page=1`;

    if (scopedTenantId != null && scopedTenantId > 0) {
      url += `&tenant_id=${scopedTenantId}`;
    }

    return this.http.get<unknown>(url).pipe(map(adaptWarehouseOptions));
  }

  getRoles(): Observable<RoleOption[]> {
    return this.http
      .get<unknown>(`${this.api}/roles?limit=200&page=1`)
      .pipe(
        map(adaptRoleOptions),
        map((roles) =>
          roles.filter((role) => role.name !== SUPER_ADMIN_ROLE),
        ),
      );
  }

  /** Admin de tenant: solo almacenes de su cliente; Super Admin puede filtrar por tenant. */
  private resolveWarehouseTenantFilter(tenantId?: number | null): number | null {
    const user = this.authService.currentUser();

    if (isSuperAdmin(user) && this.authService.hasPermission('tenant.getAll')) {
      return tenantId ?? null;
    }

    const actorTenantId = user?.tenantId;
    if (typeof actorTenantId === 'number' && actorTenantId > 0) {
      return actorTenantId;
    }

    return tenantId ?? null;
  }
}
