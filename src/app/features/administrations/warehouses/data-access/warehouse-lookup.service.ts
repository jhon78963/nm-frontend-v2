import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../auth/data-access/auth.service';
import { TenantLookupOption } from '../models/warehouse.model';
import { adaptTenantLookupOptions } from './warehouse.adapter';

@Injectable({ providedIn: 'root' })
export class WarehouseLookupService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly api = environment.apiUrl;

  getTenants(): Observable<TenantLookupOption[]> {
    if (this.authService.hasPermission('tenant.getAll')) {
      return this.http
        .get<unknown>(`${this.api}/tenants?limit=200&page=1`)
        .pipe(map(adaptTenantLookupOptions));
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
            const tenant = raw as TenantLookupOption;
            return [{ id: tenant.id, name: tenant.name }];
          }),
        );
    }

    return of([{ id: tenantId, name: `Cliente #${tenantId}` }]);
  }
}
