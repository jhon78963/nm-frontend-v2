import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
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
  private readonly api = environment.apiUrl;

  getTenants(): Observable<TenantOption[]> {
    return this.http
      .get<unknown>(`${this.api}/tenants?limit=200&page=1`)
      .pipe(map(adaptTenantOptions));
  }

  getWarehouses(tenantId?: number | null): Observable<WarehouseOption[]> {
    let url = `${this.api}/warehouses?limit=200&page=1`;
    if (tenantId != null && tenantId > 0) {
      url += `&tenant_id=${tenantId}`;
    }

    return this.http.get<unknown>(url).pipe(map(adaptWarehouseOptions));
  }

  getRoles(): Observable<RoleOption[]> {
    return this.http
      .get<unknown>(`${this.api}/roles?limit=200&page=1`)
      .pipe(map(adaptRoleOptions));
  }
}
