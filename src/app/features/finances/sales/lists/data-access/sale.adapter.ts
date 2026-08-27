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
  const type = readOptionalString(value)?.toUpperCase();
  if (type === 'BOLETA' || type === 'FACTURA') {
    return type;
  }
  if (type === 'TICKET' || type === 'TICKET_INTERNO') {
    return 'TICKET_INTERNO';
  }
  return null;
}

function normalizeSaleStatus(value: unknown): string {
  const status = readString(value, 'ACTIVE').toUpperCase();
  if (status === 'COMPLETED') return 'ACTIVE';
  if (status === 'CANCELLED' || status === 'CANCELED') return 'CANCELED';
  return status;
}

function formatPaymentMethodLabel(value: unknown): string {
  const raw = readOptionalString(value)?.toUpperCase() ?? '';
  switch (raw) {
    case 'CASH':
    case 'EFECTIVO':
      return 'Efectivo';
    case 'YAPE':
    case 'PLIN':
    case 'YAPE/PLIN':
      return 'Yape / Plin';
    case 'CARD':
    case 'TARJETA':
      return 'Tarjeta';
    case 'MIXED':
      return 'Mixto';
    default:
      return raw || '—';
  }
}

function resolveSaleCode(raw: Record<string, unknown>): string {
  const code = readOptionalString(raw['code']);
  if (code) return code;

  const id = readOptionalString(raw['id']);
  if (!id) return '—';

  return `V-${id.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

function resolveCreationTime(raw: Record<string, unknown>): string {
  return readString(
    raw['creationTime'] ??
      raw['creation_time'] ??
      raw['createdAt'] ??
      raw['created_at'] ??
      raw['date'],
  );
}

function resolveSaleTotal(raw: Record<string, unknown>): number {
  return readNumber(raw['total'] ?? raw['totalAmount'] ?? raw['total_amount']);
}

export function adaptSale(raw: unknown): Sale {
  const r = raw as Record<string, unknown>;

  return {
    id: String(r['id'] ?? ''),
    code: resolveSaleCode(r),
    creationTime: resolveCreationTime(r),
    total: resolveSaleTotal(r),
    status: normalizeSaleStatus(r['status']),
    paymentMethod: formatPaymentMethodLabel(r['paymentMethod'] ?? r['payment_method']),
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
      r['igv_amount'] != null ||
      r['igvAmount'] != null ||
      r['igv'] != null
        ? readNumber(r['igv_amount'] ?? r['igvAmount'] ?? r['igv'])
        : null,
    sunatStatus: readSunatStatus(r['sunat_status'] ?? r['sunatStatus']),
  };
}

export function adaptSaleList(raw: unknown): SaleListResponse {
  if (Array.isArray(raw)) {
    return {
      data: (raw as unknown[]).map(adaptSale),
      paginate: { total: raw.length, pages: 1 },
    };
  }

  const r = raw as {
    data?: unknown[];
    paginate?: { total?: number; pages?: number };
    meta?: { total?: number; lastPage?: number };
  };

  const total = readNumber(r.paginate?.total ?? r.meta?.total);
  const pages = readNumber(r.paginate?.pages ?? r.meta?.lastPage, 1);

  return {
    data: (r.data ?? []).map(adaptSale),
    paginate: { total, pages },
  };
}

function adaptSaleItem(raw: unknown): SaleItem {
  const r = raw as Record<string, unknown>;
  const quantity = readNumber(r['quantity'], 1);
  const unitPrice = readNumber(r['unit_price'] ?? r['unitPrice']);
  const subtotal = readNumber(r['subtotal'], quantity * unitPrice);
  const productName = readString(
    r['product_name'] ?? r['productName'] ?? r['productNameSnapshot'],
  );
  const sizeName = readString(r['size_snapshot'] ?? r['sizeSnapshot']);
  const colorName = readString(r['color_snapshot'] ?? r['colorSnapshot']);
  const descriptionFull = readString(
    r['description_full'] ??
      r['descriptionFull'] ??
      [productName, sizeName, colorName].filter(Boolean).join(' · '),
  );

  return {
    id: r['id'] != null ? String(r['id']) : null,
    productName,
    descriptionFull,
    quantity,
    unitPrice,
    subtotal,
    productSizeId:
      r['product_size_id'] != null || r['productSizeId'] != null
        ? String(r['product_size_id'] ?? r['productSizeId'])
        : null,
    colorId:
      r['color_id'] != null || r['colorId'] != null
        ? String(r['color_id'] ?? r['colorId'])
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
  const itemsRaw = Array.isArray(r['items'])
    ? r['items']
    : Array.isArray(r['details'])
      ? r['details']
      : [];
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
