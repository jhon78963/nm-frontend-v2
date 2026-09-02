import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  EcommerceOrder,
  EcommerceOrdersListResponse,
  EcommerceOrderStatus,
} from '../models/ecommerce-order.model';

@Injectable({ providedIn: 'root' })
export class EcommerceOrdersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ecommerce/orders/admin`;

  list(params: {
    page?: number;
    perPage?: number;
    search?: string;
    status?: EcommerceOrderStatus;
  }): Observable<EcommerceOrdersListResponse> {
    let httpParams = new HttpParams();

    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.perPage) httpParams = httpParams.set('perPage', String(params.perPage));
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.status) httpParams = httpParams.set('status', params.status);

    return this.http.get<EcommerceOrdersListResponse>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<EcommerceOrder> {
    return this.http.get<EcommerceOrder>(`${this.base}/${id}`);
  }

  update(
    id: string,
    payload: {
      status?: EcommerceOrderStatus;
      paymentStatus?: 'pending' | 'paid';
      orderNotes?: string;
    },
  ): Observable<EcommerceOrder> {
    return this.http.patch<EcommerceOrder>(`${this.base}/${id}`, payload);
  }
}
