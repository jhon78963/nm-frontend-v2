import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { warehouseTenantFilterForActor } from '../../../../core/warehouse/warehouse-scope.util';
import { AuthService } from '../../../auth/data-access/auth.service';
import { WarehouseLookupOption } from '../models/team.model';
import { adaptWarehouseLookupOptions } from './team.adapter';

@Service()
export class TeamLookupService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly api = environment.apiUrl;

  getWarehouses(tenantId?: number | null): Observable<WarehouseLookupOption[]> {
    const scopedTenantId = warehouseTenantFilterForActor(
      this.authService.currentUser(),
      this.authService.hasPermission('tenant.getAll'),
      tenantId,
    );

    let url = `${this.api}/warehouses?limit=200&page=1`;
    if (scopedTenantId != null && scopedTenantId > 0) {
      url += `&tenant_id=${scopedTenantId}`;
    }

    return this.http.get<unknown>(url).pipe(map(adaptWarehouseLookupOptions));
  }
}
