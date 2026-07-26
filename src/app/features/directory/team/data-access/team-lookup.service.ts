import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { WarehouseLookupOption } from '../models/team.model';
import { adaptWarehouseLookupOptions } from './team.adapter';

@Service()
export class TeamLookupService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getWarehouses(tenantId?: number | null): Observable<WarehouseLookupOption[]> {
    let url = `${this.api}/warehouses?limit=200&page=1`;
    if (tenantId != null && tenantId > 0) {
      url += `&tenant_id=${tenantId}`;
    }
    return this.http.get<unknown>(url).pipe(map(adaptWarehouseLookupOptions));
  }
}
