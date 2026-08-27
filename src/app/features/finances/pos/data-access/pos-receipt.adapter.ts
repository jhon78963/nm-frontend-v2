import {
  CartItem,
  Customer,
  DocumentType,
  PaymentEntry,
  ReceiptData,
  ReceiptPayment,
} from '../models/pos.model';

export interface CheckoutReceiptContext {
  saleId: string;
  invoiceNumber?: string;
  documentType: DocumentType;
  cart: CartItem[];
  customer: Customer | null;
  payments: PaymentEntry[];
  cashierName: string;
  warehouseName: string;
  warehouseAddress: string;
  warehouseRuc: string;
}

const PAYMENT_LABELS: Record<PaymentEntry['method'], ReceiptPayment['method']> = {
  CASH: 'Efectivo',
  YAPE: 'Yape',
  CARD: 'Tarjeta',
};

function mapDocumentType(documentType: DocumentType): ReceiptData['documentType'] {
  switch (documentType) {
    case 'BOLETA':
      return 'boleta';
    case 'FACTURA':
      return 'factura';
    default:
      return 'ticket';
  }
}

function splitDateTime(now: Date): { date: string; time: string } {
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    date: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

export function adaptCheckoutToReceiptData(context: CheckoutReceiptContext): ReceiptData {
  const total = context.cart.reduce((acc, item) => acc + item.total, 0);
  const subtotal = total / 1.18;
  const igv = total - subtotal;
  const paid = context.payments.reduce((acc, payment) => acc + payment.amount, 0);
  const { date, time } = splitDateTime(new Date());

  return {
    receiptNumber: context.invoiceNumber ?? `TKT-${String(context.saleId).padStart(6, '0')}`,
    documentType: mapDocumentType(context.documentType),
    date,
    time,
    cashierName: context.cashierName,
    warehouseName: context.warehouseName,
    warehouseAddress: context.warehouseAddress,
    warehouseRuc: context.warehouseRuc,
    customerName: context.customer?.name ?? null,
    customerDocument:
      context.customer?.document_number ?? context.customer?.dni ?? null,
    items: context.cart.map((item) => ({
      description: item.name,
      size: item.size,
      color: item.color.colorName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.total,
    })),
    subtotal,
    igv,
    total,
    payments: context.payments.map((payment) => ({
      method: PAYMENT_LABELS[payment.method],
      amount: payment.amount,
    })),
    change: Math.max(0, paid - total),
  };
}
