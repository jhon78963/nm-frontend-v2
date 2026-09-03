export interface EcommerceCustomerListItem {
  id: string;
  email: string;
  name: string;
  isEnabled: boolean;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  orderCount: number;
  refundCount: number;
  reviewCount: number;
  totalSpent: number;
}

export interface EcommerceCustomersListResponse {
  customers: EcommerceCustomerListItem[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export interface EcommerceCustomerAddress {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  country: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  postcode: string;
  phone?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EcommerceCustomerNotificationSettings {
  orderUpdates: boolean;
  promotions: boolean;
  newsletter: boolean;
}

export interface EcommerceCustomerDetail {
  customer: {
    id: string;
    email: string;
    name: string;
    isEnabled: boolean;
    userId: string | null;
    userPhone: string | null;
    userIsEnabled: boolean | null;
    username: string | null;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    orderCount: number;
    refundCount: number;
    reviewCount: number;
    totalSpent: number;
    guestOrderCount: number;
  };
  addresses: EcommerceCustomerAddress[];
  notificationSettings: EcommerceCustomerNotificationSettings;
}

export interface EcommerceCustomerOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  statusLabel: string;
  paymentStatus: 'pending' | 'paid';
  email: string;
  customerId: string | null;
  isGuestOrder: boolean;
  customerName: string;
  total: number;
  itemCount: number;
  createdAt: string;
}

export interface EcommerceCustomerOrdersResponse {
  orders: EcommerceCustomerOrderSummary[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export type EcommerceRefundStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface EcommerceCustomerRefund {
  id: string;
  status: EcommerceRefundStatus;
  reason: string;
  amount: number | null;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    paymentStatus: string;
  } | null;
}

export interface EcommerceCustomerReview {
  id: string;
  productId: string;
  productName: string;
  orderNumber: string;
  rating: number;
  description: string;
  status: string;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EcommerceCustomerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt?: string | null;
  createdAt: string;
}

export const REFUND_STATUS_OPTIONS: Array<{ value: EcommerceRefundStatus; label: string }> = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'completed', label: 'Completado' },
];

export const CUSTOMER_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
];
