import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Gender, Warehouse, SizeType } from '../models/product.model';
import {
  adaptGender,
  adaptWarehouse,
  adaptSizeType,
} from './product.adapter';

@Service()
export class ProductLookupService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getGenders(): Observable<Gender[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/genders`)
      .pipe(
        map((raw) =>
          Array.isArray(raw) ? (raw as unknown[]).map(adaptGender) : [],
        ),
      );
  }

  getWarehouses(): Observable<Warehouse[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/warehouses`)
      .pipe(
        map((raw) =>
          Array.isArray(raw) ? (raw as unknown[]).map(adaptWarehouse) : [],
        ),
      );
  }

  getSizeTypes(): Observable<SizeType[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/size-types`)
      .pipe(
        map((raw) =>
          Array.isArray(raw) ? (raw as unknown[]).map(adaptSizeType) : [],
        ),
      );
  }
}
