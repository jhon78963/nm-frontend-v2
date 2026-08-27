import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { isSuperAdmin } from '../../../../core/auth/permission.util';
import { AuthService } from '../../../auth/data-access/auth.service';
import { TenantLookupOption } from '../models/warehouse.model';
import { adaptTenantLookupOptions } from './warehouse.adapter';

@Injectable({ providedIn: 'root' })
export class WarehouseLookupService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly api = environment.apiUrl;

  getTenants(): Observable<TenantLookupOption[]> {
    const user = this.authService.currentUser();

    if (isSuperAdmin(user) && this.authService.hasPermission('tenant.getAll')) {
      return this.http
        .get<unknown>(`${this.api}/tenants?limit=200&page=1`)
        .pipe(map(adaptTenantLookupOptions));
    }

    const tenantId = user?.tenantId;
    if (!tenantId) {
      return of([]);
    }

    const tenantName =
      user?.tenantName?.trim() ||
      (this.authService.hasPermission('tenant.get') ? null : `Cliente #${tenantId}`);

    if (tenantName) {
      return of([{ id: tenantId, name: tenantName }]);
    }

    return this.http.get<unknown>(`${this.api}/tenants/${tenantId}`).pipe(
      map((raw) => {
        const tenant = raw as TenantLookupOption;
        return [{ id: tenant.id, name: tenant.name }];
      }),
    );
  }
}
