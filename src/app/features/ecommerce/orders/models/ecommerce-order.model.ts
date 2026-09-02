export type EcommerceOrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'out-for-delivery'
  | 'delivered'
  | 'cancelled';

export interface EcommerceOrderItem {
  id: string;
  productId: string;
  productSizeId: string;
  colorId?: string | null;
  name: string;
  variation?: string | null;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface EcommerceOrderAddress {
  firstName: string;
  lastName: string;
  country: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postcode: string;
  phone?: string;
}

export interface EcommerceOrder {
  id: string;
  orderNumber: string;
  warehouseId?: string;
  status: EcommerceOrderStatus;
  statusLabel?: string;
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
  updatedAt?: string;
  cancelledAt?: string | null;
  email: string;
  billing: EcommerceOrderAddress;
  shipping: EcommerceOrderAddress;
  orderNotes?: string | null;
  shippingMethodTitle: string;
  shippingTotal: number;
  paymentMethodTitle: string;
  subtotal: number;
  couponCode?: string | null;
  couponDiscount: number;
  total: number;
  items: EcommerceOrderItem[];
}

export interface EcommerceOrdersListResponse {
  orders: EcommerceOrder[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export const ORDER_STATUS_OPTIONS: Array<{ value: EcommerceOrderStatus; label: string }> = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'processing', label: 'En proceso' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'out-for-delivery', label: 'En reparto' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
];
