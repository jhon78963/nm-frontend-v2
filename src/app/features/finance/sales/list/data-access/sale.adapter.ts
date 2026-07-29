import {
  PaymentMethod,
  Sale,
  SaleDetail,
  SaleDocumentType,
  SaleItem,
  SaleListResponse,
  SalePayment,
  SunatStatus,
} from '../models/sale.model';

function readNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readOptionalString(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  return str || null;
}

function readSunatStatus(value: unknown): SunatStatus | null {
  const status = readOptionalString(value);
  if (
    status === 'PENDING' ||
    status === 'SENT' ||
    status === 'ACCEPTED' ||
    status === 'REJECTED' ||
    status === 'VOIDED'
  ) {
    return status;
  }
  return null;
}

function readCustomerName(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object') {
    const customer = value as Record<string, unknown>;
    return readString(customer['name']);
  }

  return '';
}

export function normalizePaymentMethod(value: unknown): PaymentMethod {
  const raw = readOptionalString(value)?.toUpperCase().trim() ?? '';

  if (!raw || raw === 'CASH' || raw === 'EFECTIVO') {
    return 'CASH';
  }

  if (
    raw === 'YAPE' ||
    raw === 'YAPE/PLIN' ||
    raw === 'PLIN' ||
    raw.includes('YAPE') ||
    raw.includes('PLIN')
  ) {
    return 'YAPE';
  }

  if (raw === 'CARD' || raw === 'TARJETA') {
    return 'CARD';
  }

  return 'CASH';
}

function readDocumentType(value: unknown): SaleDocumentType | null {
  const type = readOptionalString(value);
  if (type === 'BOLETA' || type === 'FACTURA' || type === 'TICKET_INTERNO') {
    return type;
  }
  return null;
}

export function adaptSale(raw: unknown): Sale {
  const r = raw as Record<string, unknown>;

  return {
    id: readNumber(r['id']),
    code: readString(r['code']),
    creationTime: readString(r['creationTime'] ?? r['creation_time'] ?? r['date']),
    total: readNumber(r['total']),
    status: readString(r['status'], 'ACTIVE'),
    paymentMethod: readString(r['paymentMethod'] ?? r['payment_method']),
    customer: readCustomerName(r['customer']),
    documentType: readDocumentType(r['document_type'] ?? r['documentType']),
    fullInvoiceNumber: readOptionalString(
      r['full_invoice_number'] ?? r['fullInvoiceNumber'],
    ),
    serie: readOptionalString(r['serie']),
    correlativo:
      r['correlativo'] != null ? readNumber(r['correlativo']) : null,
    taxableBase:
      r['taxable_base'] != null || r['taxableBase'] != null
        ? readNumber(r['taxable_base'] ?? r['taxableBase'])
        : null,
    igvAmount:
      r['igv_amount'] != null || r['igvAmount'] != null
        ? readNumber(r['igv_amount'] ?? r['igvAmount'])
        : null,
    sunatStatus: readSunatStatus(r['sunat_status'] ?? r['sunatStatus']),
  };
}

export function adaptSaleList(raw: unknown): SaleListResponse {
  const r = raw as {
    data: unknown[];
    paginate: { total: number; pages: number };
  };

  return {
    data: r.data.map(adaptSale),
    paginate: {
      total: readNumber(r.paginate?.total),
      pages: readNumber(r.paginate?.pages, 1),
    },
  };
}

function adaptSaleItem(raw: unknown): SaleItem {
  const r = raw as Record<string, unknown>;
  const quantity = readNumber(r['quantity'], 1);
  const unitPrice = readNumber(r['unit_price'] ?? r['unitPrice']);
  const subtotal = readNumber(r['subtotal'], quantity * unitPrice);

  return {
    id: r['id'] != null ? readNumber(r['id']) : null,
    productName: readString(r['product_name'] ?? r['productName']),
    descriptionFull: readString(r['description_full'] ?? r['descriptionFull']),
    quantity,
    unitPrice,
    subtotal,
    productSizeId:
      r['product_size_id'] != null || r['productSizeId'] != null
        ? readNumber(r['product_size_id'] ?? r['productSizeId'])
        : null,
    colorId:
      r['color_id'] != null || r['colorId'] != null
        ? readNumber(r['color_id'] ?? r['colorId'])
        : null,
    isNew: false,
  };
}

function adaptSalePayment(raw: unknown): SalePayment {
  const r = raw as Record<string, unknown>;
  return {
    method: normalizePaymentMethod(r['method']),
    amount: readNumber(r['amount']),
  };
}

export function adaptSaleDetail(raw: unknown): SaleDetail {
  const r = raw as Record<string, unknown>;
  const base = adaptSale(raw);
  const itemsRaw = Array.isArray(r['items']) ? r['items'] : [];
  const paymentsRaw = Array.isArray(r['payments']) ? r['payments'] : [];

  let payments = paymentsRaw.map(adaptSalePayment);

  if (payments.length === 0 && base.paymentMethod) {
    payments = [
      {
        method: normalizePaymentMethod(base.paymentMethod),
        amount: base.total,
      },
    ];
  }

  return {
    ...base,
    datetimeIso: readOptionalString(r['datetime_iso'] ?? r['datetimeIso']),
    items: itemsRaw.map(adaptSaleItem),
    payments,
  };
}
