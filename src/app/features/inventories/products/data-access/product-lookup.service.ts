import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
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
  private readonly apiUrl = environment.apiUrl;

  getGenders(): Observable<Gender[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/genders?limit=200&page=1`)
      .pipe(map((raw) => extractApiList(raw).map(adaptGender)));
  }

  getWarehouses(): Observable<Warehouse[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/warehouses?limit=200&page=1`)
      .pipe(map((raw) => extractApiList(raw).map(adaptWarehouse)));
  }

  getSizeTypes(): Observable<SizeType[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/size-types?limit=200&page=1`)
      .pipe(map((raw) => extractApiList(raw).map(adaptSizeType)));
  }
}
