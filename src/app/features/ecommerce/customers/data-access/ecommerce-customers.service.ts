import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  EcommerceCustomerDetail,
  EcommerceCustomerNotification,
  EcommerceCustomerOrdersResponse,
  EcommerceCustomerRefund,
  EcommerceCustomerReview,
  EcommerceCustomersListResponse,
  EcommerceRefundStatus,
} from '../models/ecommerce-customer.model';

@Injectable({ providedIn: 'root' })
export class EcommerceCustomersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ecommerce/customers/admin`;
  private readonly refundsBase = `${environment.apiUrl}/ecommerce/refunds/admin`;

  list(params: {
    page?: number;
    perPage?: number;
    search?: string;
    isEnabled?: boolean;
  }): Observable<EcommerceCustomersListResponse> {
    let httpParams = new HttpParams();

    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.perPage) httpParams = httpParams.set('perPage', String(params.perPage));
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.isEnabled !== undefined) {
      httpParams = httpParams.set('isEnabled', String(params.isEnabled));
    }

    return this.http.get<EcommerceCustomersListResponse>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<EcommerceCustomerDetail> {
    return this.http.get<EcommerceCustomerDetail>(`${this.base}/${id}`);
  }

  update(
    id: string,
    payload: { name?: string; isEnabled?: boolean },
  ): Observable<{ customer: EcommerceCustomerDetail['customer'] }> {
    return this.http.patch<{ customer: EcommerceCustomerDetail['customer'] }>(
      `${this.base}/${id}`,
      payload,
    );
  }

  listOrders(
    customerId: string,
    params: { page?: number; perPage?: number; status?: string } = {},
  ): Observable<EcommerceCustomerOrdersResponse> {
    let httpParams = new HttpParams();

    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.perPage) httpParams = httpParams.set('perPage', String(params.perPage));
    if (params.status) httpParams = httpParams.set('status', params.status);

    return this.http.get<EcommerceCustomerOrdersResponse>(`${this.base}/${customerId}/orders`, {
      params: httpParams,
    });
  }

  listRefunds(customerId: string): Observable<{ refunds: EcommerceCustomerRefund[] }> {
    return this.http.get<{ refunds: EcommerceCustomerRefund[] }>(
      `${this.base}/${customerId}/refunds`,
    );
  }

  listReviews(customerId: string): Observable<{ reviews: EcommerceCustomerReview[] }> {
    return this.http.get<{ reviews: EcommerceCustomerReview[] }>(
      `${this.base}/${customerId}/reviews`,
    );
  }

  listNotifications(
    customerId: string,
  ): Observable<{ notifications: EcommerceCustomerNotification[] }> {
    return this.http.get<{ notifications: EcommerceCustomerNotification[] }>(
      `${this.base}/${customerId}/notifications`,
    );
  }

  updateRefund(
    refundId: string,
    payload: {
      status?: EcommerceRefundStatus;
      adminNotes?: string;
      amount?: number;
    },
  ): Observable<{ refund: EcommerceCustomerRefund }> {
    return this.http.patch<{ refund: EcommerceCustomerRefund }>(
      `${this.refundsBase}/${refundId}`,
      payload,
    );
  }
}
