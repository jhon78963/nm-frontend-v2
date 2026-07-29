export type SunatStatus =
  | 'PENDING'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'VOIDED';

export type SaleDocumentType = 'BOLETA' | 'FACTURA' | 'TICKET_INTERNO';

export type SaleStatus = 'ACTIVE' | 'CANCELED' | string;

export type PaymentMethod = 'CASH' | 'YAPE' | 'CARD';

export interface Sale {
  id: number;
  code: string;
  creationTime: string;
  total: number;
  status: SaleStatus;
  paymentMethod: string;
  customer: string;
  documentType?: SaleDocumentType | null;
  fullInvoiceNumber?: string | null;
  serie?: string | null;
  correlativo?: number | null;
  taxableBase?: number | null;
  igvAmount?: number | null;
  sunatStatus?: SunatStatus | null;
}

export interface SaleListResponse {
  data: Sale[];
  paginate: { total: number; pages: number };
}

export interface SaleFilterState {
  limit: number;
  page: number;
  search: string;
}

export interface SaleItem {
  id?: number | null;
  productName: string;
  descriptionFull: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  productSizeId?: number | null;
  colorId?: number | null;
  isNew?: boolean;
}

export interface SalePayment {
  method: PaymentMethod | string;
  amount: number;
}

export interface SaleDetail extends Sale {
  datetimeIso?: string | null;
  items: SaleItem[];
  payments: SalePayment[];
}

export interface SaleUpdatePayload {
  id: number;
  code: string;
  total: number;
  status: SaleStatus;
  creationTime: string;
  items: Array<{
    id?: number;
    quantity: number;
    unit_price: number;
    product_size_id?: number;
    color_id?: number;
  }>;
  payments: Array<{ method: string; amount: number }>;
}

export interface ProductVariantSelection {
  productSizeId: number;
  colorId: number;
  name: string;
  sizeName: string;
  colorName: string;
  salePrice: number;
  sku: string;
  availableQuantity: number;
}
