export interface ProductVariantInventory {
  available_quantity: number;
  warehouse_id: number;
}

export interface Variant {
  product_size_id: number;
  color_id: number;
  colorName: string;
  hex: string;
  inventory?: ProductVariantInventory;
  price: number;
  minSalePrice?: number | null;
  sku?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  basePrice: number;
  variants: Record<string, Variant[]>;
}

export interface CartItem {
  cartId: number;
  productId: string;
  sku: string;
  name: string;
  size: string;
  color: Variant;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Customer {
  id: string;
  dni: string;
  name: string;
  document_type?: string | null;
  document_number?: string | null;
}

export interface ModalState {
  isOpen: boolean;
  product: Product | null;
  isEditing: boolean;
  editingCartItem?: CartItem | null;
}

export type DocumentType = 'TICKET_INTERNO' | 'BOLETA' | 'FACTURA';

export type PaymentMethodId = 'CASH' | 'YAPE' | 'CARD';

export interface PaymentEntry {
  method: PaymentMethodId;
  amount: number;
}

export interface CheckoutResponse {
  success: boolean;
  sale_id?: number;
  ticket_url?: string;
  invoice_number?: string;
  sunat_status?: string;
  message?: string | string[];
  error?: string | string[];
}

export interface ReceiptData {
  receiptNumber: string;
  documentType: 'boleta' | 'factura' | 'ticket';
  date: string;
  time: string;
  cashierName: string;
  warehouseName: string;
  warehouseAddress: string;
  warehouseRuc: string;
  customerName: string | null;
  customerDocument: string | null;
  items: ReceiptItem[];
  subtotal: number;
  igv: number;
  total: number;
  payments: ReceiptPayment[];
  change: number;
}

export interface ReceiptItem {
  description: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ReceiptPayment {
  method: 'Efectivo' | 'Yape' | 'Tarjeta';
  amount: number;
}

export type PrintFormat = 'thermal-80mm' | 'a4';
