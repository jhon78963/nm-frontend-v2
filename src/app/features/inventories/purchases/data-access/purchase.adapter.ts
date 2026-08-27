import {
  ProductColorOption,
  ProductSizeOption,
  PurchaseDetail,
  PurchaseLineColorDeltaRow,
  PurchaseLineRow,
  PurchaseLinkedPayment,
  PurchaseListResponse,
  PurchaseRegisterBulkResponse,
  PurchaseRow,
  PurchaseStatus,
} from '../models/purchase.model';

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readId(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function readOptionalId(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function readString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function readOptionalString(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  const s = String(value).trim();
  return s || null;
}

function readBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function adaptPurchaseRow(raw: unknown): PurchaseRow {
  const r = raw as Record<string, unknown>;
  return {
    id: readId(r['id']),
    supplierName: readString(r['supplierName'] ?? r['supplier_name']),
    vendorId: readOptionalId(r['vendorId'] ?? r['vendor_id']),
    documentNote: readOptionalString(r['documentNote'] ?? r['document_note']),
    registeredAt: readOptionalString(r['registeredAt'] ?? r['registered_at']),
    warehouseId: readId(r['warehouseId'] ?? r['warehouse_id']),
    warehouseName: readOptionalString(r['warehouseName'] ?? r['warehouse_name']) ?? undefined,
    currency: readString(r['currency'], 'PEN'),
    status: readString(r['status'], 'ACTIVE') as PurchaseStatus,
    totalSubtotal: readNumber(r['totalSubtotal'] ?? r['total_subtotal']),
    creationTime: readOptionalString(r['creationTime'] ?? r['creation_time']),
    cancelledAt: readOptionalString(r['cancelledAt'] ?? r['cancelled_at']),
  };
}

function adaptColorDelta(raw: unknown): PurchaseLineColorDeltaRow {
  const r = raw as Record<string, unknown>;
  return {
    id: readId(r['id']),
    colorId: readId(r['colorId'] ?? r['color_id']),
    colorDescription: readOptionalString(r['colorDescription'] ?? r['color_description']) ?? undefined,
    quantity: readNumber(r['quantity'], 1),
  };
}

export function adaptPurchaseLineRow(raw: unknown): PurchaseLineRow {
  const r = raw as Record<string, unknown>;
  const deltasRaw = r['colorDeltas'] ?? r['color_deltas'];
  return {
    id: readId(r['id']),
    lineId: readOptionalString(r['lineId'] ?? r['line_id']),
    productId: readId(r['productId'] ?? r['product_id']),
    productName: readOptionalString(r['productName'] ?? r['product_name']) ?? undefined,
    sizeId: readId(r['sizeId'] ?? r['size_id']),
    sizeDescription: readOptionalString(r['sizeDescription'] ?? r['size_description']) ?? undefined,
    sizeTypeId: readOptionalId(r['sizeTypeId'] ?? r['size_type_id']) ?? undefined,
    productSizeId: readId(r['productSizeId'] ?? r['product_size_id']),
    barcode: readOptionalString(r['barcode']),
    purchasePrice: readOptionalNumber(r['purchasePrice'] ?? r['purchase_price']),
    salePrice: readOptionalNumber(r['salePrice'] ?? r['sale_price']),
    minSalePrice: readOptionalNumber(r['minSalePrice'] ?? r['min_sale_price']),
    subtotal: readNumber(r['subtotal']),
    sizeStockDelta: readNumber(r['sizeStockDelta'] ?? r['size_stock_delta']),
    hasColorBreakdown: readBool(r['hasColorBreakdown'] ?? r['has_color_breakdown']),
    colorDeltas: Array.isArray(deltasRaw)
      ? deltasRaw.map(adaptColorDelta)
      : undefined,
  };
}

function adaptLinkedPayment(raw: unknown): PurchaseLinkedPayment | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const r = raw as Record<string, unknown>;
  const pathsRaw = r['voucherPaths'] ?? r['voucher_paths'];
  return {
    cashMovementId: readId(r['cashMovementId'] ?? r['cash_movement_id']),
    amount: readNumber(r['amount']),
    paymentMethod: readString(r['paymentMethod'] ?? r['payment_method']),
    description: readString(r['description']),
    date: readOptionalString(r['date']),
    voucherPath: readOptionalString(r['voucherPath'] ?? r['voucher_path']),
    voucherPaths: Array.isArray(pathsRaw) ? pathsRaw.map(String) : undefined,
  };
}

export function adaptPurchaseDetail(raw: unknown): PurchaseDetail {
  const r = raw as Record<string, unknown>;
  const linesRaw = r['lines'];
  const paymentRaw = r['linkedPayment'] ?? r['linked_payment'];
  const base = adaptPurchaseRow(raw);

  return {
    ...base,
    cancellationReason: readOptionalString(r['cancellationReason'] ?? r['cancellation_reason']),
    lines: Array.isArray(linesRaw) ? linesRaw.map(adaptPurchaseLineRow) : [],
    payloadSnapshot: r['payloadSnapshot'] ?? r['payload_snapshot'] ?? null,
    linkedPayment: adaptLinkedPayment(paymentRaw),
  };
}

export function adaptPurchaseList(raw: unknown): PurchaseListResponse {
  if (Array.isArray(raw)) {
    return {
      data: (raw as unknown[]).map(adaptPurchaseRow),
      paginate: { total: raw.length, pages: 1 },
    };
  }

  const r = raw as {
    data?: unknown[];
    paginate?: { total?: number; pages?: number };
    meta?: { total?: number; lastPage?: number };
  };

  const total = r.paginate?.total ?? r.meta?.total ?? 0;
  const pages = r.paginate?.pages ?? r.meta?.lastPage ?? 1;

  return {
    data: (r.data ?? []).map(adaptPurchaseRow),
    paginate: { total, pages },
  };
}

export function adaptPurchaseRegisterBulkResponse(
  raw: unknown,
): PurchaseRegisterBulkResponse {
  const r = raw as Record<string, unknown>;
  return {
    message: readString(r['message'], 'Compra registrada.'),
    purchaseId: readId(r['purchaseId'] ?? r['purchase_id']),
  };
}

export function adaptProductSizeOption(raw: unknown): ProductSizeOption {
  const row = raw as Record<string, unknown>;
  return {
    id: readId(row['id']),
    description: readString(row['description']),
    productSizeId: readOptionalId(row['productSizeId'] ?? row['product_size_id']) ?? undefined,
    stock: readOptionalNumber(row['stock']) ?? undefined,
    barcode: readOptionalString(row['barcode'] ?? row['bar_code']),
    purchasePrice: readOptionalNumber(row['purchasePrice'] ?? row['purchase_price']),
    salePrice: readOptionalNumber(row['salePrice'] ?? row['sale_price']),
    minSalePrice: readOptionalNumber(row['minSalePrice'] ?? row['min_sale_price']),
  };
}

export function adaptProductColorOption(raw: unknown): ProductColorOption {
  const row = raw as Record<string, unknown>;
  return {
    id: readId(row['id']),
    description: readString(row['description']),
    hash: readOptionalString(row['hash']),
    isExists: readBool(row['isExists'] ?? row['is_exists']),
    stock: readOptionalNumber(row['stock']),
    productSizeId: readOptionalId(row['productSizeId'] ?? row['product_size_id']),
  };
}

export function unwrapArrayPayload(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>)['data'])) {
    return (raw as Record<string, unknown>)['data'] as unknown[];
  }
  return [];
}
