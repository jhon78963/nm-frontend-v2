import {
  Product,
  ProductListResponse,
  ProductVariantInventory,
  ProductSize,
  ProductColor,
  ProductColorVariantRow,
  ProductMediaItem,
  Gender,
  Warehouse,
  SizeType,
  ProductImportResponse,
  ProductHistoryChange,
  ProductHistoryEvent,
  ProductHistoryIcon,
  ProductHistoryResponse,
  ProductHistorySeverity,
} from '../models/product.model';

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

export function extractApiList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (raw && typeof raw === 'object' && 'data' in raw) {
    const data = (raw as { data?: unknown }).data;
    return Array.isArray(data) ? data : [];
  }

  return [];
}

function readBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function adaptProductVariantInventory(
  raw: unknown,
): ProductVariantInventory | undefined {
  if (!raw) return undefined;
  const r = raw as Record<string, unknown>;
  return {
    availableQuantity: readNumber(r['available_quantity']),
    warehouseId: readNumber(r['warehouse_id']),
  };
}

function readStock(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.trunc(n));
}

export function adaptProductColor(raw: unknown): ProductColor {
  const r = raw as Record<string, unknown>;
  const hash =
    r['hash'] != null && `${r['hash']}`.trim()
      ? readString(r['hash'])
      : r['value'] != null && `${r['value']}`.trim()
        ? readString(r['value'])
        : undefined;

  return {
    id: readNumber(r['id']),
    description: readString(r['description']),
    hash,
    value: r['value'] ? readString(r['value']) : undefined,
    stock: r['stock'] !== undefined ? readStock(r['stock']) : undefined,
    productSizeId:
      r['productSizeId'] != null && r['productSizeId'] !== ''
        ? readNumber(r['productSizeId'])
        : undefined,
    isExists:
      r['isExists'] !== undefined ? readBoolean(r['isExists']) : undefined,
    price: r['price'] != null ? readNumber(r['price']) : undefined,
    inventory: adaptProductVariantInventory(r['inventory']),
  };
}

export function adaptProductColorVariantRow(raw: unknown): ProductColorVariantRow {
  const color = adaptProductColor(raw);
  const isExists = !!color.isExists;
  return {
    ...color,
    stock: readStock(color.stock),
    variantAttached: isExists,
  };
}

export function adaptProductSize(raw: unknown): ProductSize {
  const r = raw as Record<string, unknown>;
  const colors = Array.isArray(r['colors'])
    ? (r['colors'] as unknown[]).map(adaptProductColor)
    : undefined;

  return {
    id: readNumber(r['id']),
    productSizeId:
      r['productSizeId'] != null && r['productSizeId'] !== ''
        ? readNumber(r['productSizeId'])
        : undefined,
    description: readString(r['description']),
    price: r['price'] != null ? readNumber(r['price']) : undefined,
    colors,
    inventory: adaptProductVariantInventory(r['inventory']),
    barcode: r['barcode'] != null ? readString(r['barcode']) : undefined,
    stock:
      r['stock'] !== undefined && r['stock'] !== null
        ? readNumber(r['stock'])
        : undefined,
    purchasePrice:
      r['purchasePrice'] !== undefined && r['purchasePrice'] !== null
        ? readNumber(r['purchasePrice'])
        : undefined,
    salePrice:
      r['salePrice'] !== undefined && r['salePrice'] !== null
        ? readNumber(r['salePrice'])
        : undefined,
    minSalePrice:
      r['minSalePrice'] !== undefined && r['minSalePrice'] !== null
        ? readNumber(r['minSalePrice'])
        : undefined,
    isExists:
      r['isExists'] !== undefined ? readBoolean(r['isExists']) : undefined,
  };
}

function adaptProductMediaItem(raw: unknown): ProductMediaItem {
  const r = raw as Record<string, unknown>;
  return {
    id: readNumber(r['id']),
    url: readString(r['url']),
    type: r['type'] === 'video' ? 'video' : 'image',
    isPrimary: readBoolean(r['isPrimary']),
  };
}

export function adaptProduct(raw: unknown): Product {
  const r = raw as Record<string, unknown>;

  const sizes = Array.isArray(r['sizes'])
    ? (r['sizes'] as unknown[]).map(adaptProductSize)
    : [];

  const media = Array.isArray(r['media'])
    ? (r['media'] as unknown[]).map(adaptProductMediaItem)
    : undefined;

  const gallery = Array.isArray(r['gallery'])
    ? (r['gallery'] as string[])
    : undefined;

  const sizeTypeId = Array.isArray(r['sizeTypeId'])
    ? (r['sizeTypeId'] as number[])
    : [];

  const wooCommerce = r['wooCommerce']
    ? {
        productId: readNumber((r['wooCommerce'] as Record<string, unknown>)['productId'], null as any),
        lastSyncedAt: readString((r['wooCommerce'] as Record<string, unknown>)['lastSyncedAt'], null as any),
      }
    : undefined;

  return {
    id: readNumber(r['id']),
    name: readString(r['name']),
    barcode: readString(r['barcode']),
    description: readString(r['description']),
    purchasePrice: readNumber(r['purchasePrice']),
    salePrice: readNumber(r['salePrice']),
    minSalePrice: readNumber(r['minSalePrice']),
    status: readString(r['status']),
    genderId: readNumber(r['genderId']),
    gender: readString(r['gender']),
    stock: readStock(r['stock']),
    sizes,
    filter: readBoolean(r['filter']),
    sizeTypeId,
    percentageDiscount: readNumber(r['percentageDiscount']),
    cashDiscount: readNumber(r['cashDiscount']),
    warehouseId: readNumber(r['warehouseId']),
    inventory: adaptProductVariantInventory(r['inventory']),
    thumbnail: r['thumbnail'] ? readString(r['thumbnail']) : null,
    gallery,
    media,
    isFeatured: r['isFeatured'] ? readBoolean(r['isFeatured']) : undefined,
    isOnSale: r['isOnSale'] ? readBoolean(r['isOnSale']) : undefined,
    wooStatus:
      r['wooStatus'] === 'draft' || r['wooStatus'] === 'publish'
        ? r['wooStatus']
        : null,
    wooCommerce,
  };
}

export function adaptProductList(raw: unknown): ProductListResponse {
  const r = raw as {
    data: unknown[];
    paginate: { total: number; pages: number };
  };

  return {
    data: (r.data ?? []).map(adaptProduct),
    paginate: {
      total: r.paginate?.total ?? 0,
      pages: r.paginate?.pages ?? 0,
    },
  };
}

export function adaptGender(raw: unknown): Gender {
  const r = raw as Record<string, unknown>;
  return {
    id: readNumber(r['id']),
    description: readString(r['description']),
  };
}

export function adaptWarehouse(raw: unknown): Warehouse {
  const r = raw as Record<string, unknown>;
  return {
    id: readNumber(r['id']),
    name: readString(r['name']),
  };
}

export function adaptSizeType(raw: unknown): SizeType {
  const r = raw as Record<string, unknown>;
  return {
    id: readNumber(r['id']),
    description: readString(r['description']),
  };
}

export function adaptProductImportResponse(
  raw: unknown,
): ProductImportResponse {
  const r = raw as Record<string, unknown>;
  return {
    message: readString(r['message']),
    updated: readNumber(r['updated']),
    skipped: readNumber(r['skipped']),
    errors: Array.isArray(r['errors']) ? (r['errors'] as string[]) : [],
  };
}

function adaptProductHistorySeverity(value: unknown): ProductHistorySeverity {
  const severity = readString(value, 'secondary');
  if (
    severity === 'success' ||
    severity === 'info' ||
    severity === 'danger' ||
    severity === 'warning'
  ) {
    return severity;
  }
  return 'secondary';
}

function adaptProductHistoryIcon(iconClass: unknown): ProductHistoryIcon {
  const icon = readString(iconClass).toLowerCase();

  if (icon.includes('shopping-cart')) return 'sale';
  if (icon.includes('sync')) return 'exchange';
  if (icon.includes('undo')) return 'return';
  if (icon.includes('trash')) return 'delete';
  if (icon.includes('plus')) return 'in';
  if (icon.includes('minus')) return 'out';
  if (icon.includes('pencil')) return 'update';
  if (icon.includes('plus-circle') || icon.endsWith(' pi-plus')) return 'create';

  return 'default';
}

function adaptProductHistoryChange(raw: unknown): ProductHistoryChange {
  const r = raw as Record<string, unknown>;
  return {
    field: readString(r['field']),
    from: r['from'] as string | number,
    to: r['to'] as string | number,
  };
}

export function adaptProductHistoryEvent(raw: unknown): ProductHistoryEvent {
  const r = raw as Record<string, unknown>;
  const changes = Array.isArray(r['changes'])
    ? (r['changes'] as unknown[]).map(adaptProductHistoryChange)
    : [];

  const id = r['id'];
  const parsedId =
    typeof id === 'string' || typeof id === 'number' ? id : readNumber(id);

  return {
    id: parsedId,
    date: readString(r['date']),
    time: readString(r['time']),
    user: readString(r['user'], 'Sistema'),
    actionTitle: readString(r['action_title']),
    changes,
    severity: adaptProductHistorySeverity(r['severity']),
    icon: adaptProductHistoryIcon(r['icon']),
  };
}

export function adaptProductHistoryResponse(raw: unknown): ProductHistoryEvent[] {
  const r = raw as ProductHistoryResponse;
  if (!r?.success || !Array.isArray(r.data)) {
    return [];
  }

  return r.data.map(adaptProductHistoryEvent);
}
