export type EcommerceReviewStatus = 'pending' | 'approved' | 'rejected';

export interface EcommerceReview {
  id: string;
  productId: string;
  productName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  rating: number;
  description: string;
  status: EcommerceReviewStatus;
  rejectionReason?: string | null;
  createdAt: string;
  moderatedAt?: string | null;
}

export interface EcommerceReviewsListResponse {
  reviews: EcommerceReview[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}
