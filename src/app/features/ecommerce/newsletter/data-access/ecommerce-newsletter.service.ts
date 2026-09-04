import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  NewsletterCampaignsResponse,
  NewsletterSubscribersListResponse,
  SendNewsletterCampaignPayload,
} from '../models/ecommerce-newsletter.model';

@Injectable({ providedIn: 'root' })
export class EcommerceNewsletterService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ecommerce/newsletter/admin`;

  listSubscribers(params: {
    page?: number;
    perPage?: number;
    search?: string;
    status?: 'active' | 'unsubscribed' | 'all';
  }): Observable<NewsletterSubscribersListResponse> {
    let httpParams = new HttpParams();

    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.perPage) httpParams = httpParams.set('perPage', String(params.perPage));
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<NewsletterSubscribersListResponse>(`${this.base}/subscribers`, {
      params: httpParams,
    });
  }

  unsubscribeSubscriber(id: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.base}/subscribers/${id}/unsubscribe`, {});
  }

  listCampaigns(): Observable<NewsletterCampaignsResponse> {
    return this.http.get<NewsletterCampaignsResponse>(`${this.base}/campaigns`);
  }

  sendCampaign(payload: SendNewsletterCampaignPayload): Observable<{
    success: boolean;
    recipientCount: number;
    campaign: NewsletterCampaignsResponse['campaigns'][number];
  }> {
    return this.http.post<{
      success: boolean;
      recipientCount: number;
      campaign: NewsletterCampaignsResponse['campaigns'][number];
    }>(`${this.base}/campaigns/send`, payload);
  }
}
