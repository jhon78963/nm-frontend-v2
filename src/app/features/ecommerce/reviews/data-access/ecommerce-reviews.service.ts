import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  EcommerceReview,
  EcommerceReviewsListResponse,
  EcommerceReviewStatus,
} from '../models/ecommerce-review.model';

@Injectable({ providedIn: 'root' })
export class EcommerceReviewsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ecommerce/reviews/admin`;

  list(params: {
    page?: number;
    perPage?: number;
    status?: EcommerceReviewStatus;
  }): Observable<EcommerceReviewsListResponse> {
    let httpParams = new HttpParams();

    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.perPage) httpParams = httpParams.set('perPage', String(params.perPage));
    if (params.status) httpParams = httpParams.set('status', params.status);

    return this.http.get<EcommerceReviewsListResponse>(this.base, { params: httpParams });
  }

  moderate(
    id: string,
    payload: { status: 'approved' | 'rejected'; rejectionReason?: string },
  ): Observable<EcommerceReview> {
    return this.http.patch<EcommerceReview>(`${this.base}/${id}`, payload);
  }
}
