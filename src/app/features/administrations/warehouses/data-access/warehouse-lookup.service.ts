import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TenantLookupOption } from '../models/warehouse.model';
import { adaptTenantLookupOptions } from './warehouse.adapter';

@Service()
export class WarehouseLookupService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getTenants(): Observable<TenantLookupOption[]> {
    return this.http
      .get<unknown>(`${this.api}/tenants?limit=200&page=1`)
      .pipe(map(adaptTenantLookupOptions));
  }
}
