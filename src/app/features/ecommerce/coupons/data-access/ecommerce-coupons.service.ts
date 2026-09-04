import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  CreateEcommerceCouponPayload,
  EcommerceCoupon,
  EcommerceCouponsResponse,
  UpdateEcommerceCouponPayload,
} from '../models/ecommerce-coupon.model';

@Injectable({ providedIn: 'root' })
export class EcommerceCouponsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ecommerce/coupons/admin`;

  list(): Observable<EcommerceCouponsResponse> {
    return this.http.get<EcommerceCouponsResponse>(this.base);
  }

  create(payload: CreateEcommerceCouponPayload): Observable<{ coupon: EcommerceCoupon }> {
    return this.http.post<{ coupon: EcommerceCoupon }>(this.base, payload);
  }

  update(id: string, payload: UpdateEcommerceCouponPayload): Observable<{ coupon: EcommerceCoupon }> {
    return this.http.patch<{ coupon: EcommerceCoupon }>(`${this.base}/${id}`, payload);
  }
}
