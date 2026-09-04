export type NewsletterSubscriberStatus = 'active' | 'unsubscribed';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: NewsletterSubscriberStatus;
  source: string;
  subscribedAt: string;
  unsubscribedAt: string | null;
  customerId: string | null;
  customer: {
    id: string;
    name: string;
  } | null;
}

export interface NewsletterSubscribersListResponse {
  subscribers: NewsletterSubscriber[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    activeCount: number;
  };
}

export interface NewsletterCampaign {
  id: string;
  subject: string;
  title: string;
  status: string;
  sentCount: number;
  failedCount: number;
  sentAt: string | null;
  createdAt: string;
}

export interface NewsletterCampaignsResponse {
  campaigns: NewsletterCampaign[];
}

export interface SendNewsletterCampaignPayload {
  subject: string;
  title: string;
  body: string;
  previewText?: string;
  ctaUrl?: string;
  ctaLabel?: string;
}

export const NEWSLETTER_STATUS_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Activos', value: 'active' },
  { label: 'Dados de baja', value: 'unsubscribed' },
];
