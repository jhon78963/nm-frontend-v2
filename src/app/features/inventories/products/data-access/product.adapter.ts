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
  ProductApiWritePayload,
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
    warehouseId: String(r['warehouse_id'] ?? ''),
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

function sumInventoryBalances(balances: unknown): number {
  if (!Array.isArray(balances)) {
    return 0;
  }

  return balances.reduce((sum, balance) => {
    const qty = (balance as Record<string, unknown>)['quantity'];
    return sum + readStock(qty);
  }, 0);
}

function buildColorStockMap(balances: unknown): Map<string, number> {
  const map = new Map<string, number>();
  if (!Array.isArray(balances)) {
    return map;
  }

  for (const balance of balances) {
    const row = balance as Record<string, unknown>;
    const colorId = String(row['colorId'] ?? '');
    if (!colorId) continue;
    map.set(colorId, readStock(row['quantity']));
  }

  return map;
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
    id: String(r['id'] ?? ''),
    description: readString(r['description']),
    hash,
    value: r['value'] ? readString(r['value']) : undefined,
    stock: r['stock'] !== undefined ? readStock(r['stock']) : undefined,
    productSizeId:
      r['productSizeId'] != null && r['productSizeId'] !== ''
        ? String(r['productSizeId'])
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
  const balances = r['inventoryBalances'];
  const balanceStock = sumInventoryBalances(balances);

  return {
    id: String(r['id'] ?? ''),
    productSizeId:
      r['productSizeId'] != null && r['productSizeId'] !== ''
        ? String(r['productSizeId'])
        : undefined,
    description: readString(r['description']),
    price: r['price'] != null ? readNumber(r['price']) : undefined,
    colors,
    inventory: adaptProductVariantInventory(r['inventory']),
    barcode: r['barcode'] != null ? readString(r['barcode']) : undefined,
    stock:
      r['stock'] !== undefined && r['stock'] !== null
        ? readNumber(r['stock'])
        : balanceStock > 0
          ? balanceStock
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
    id: String(r['id'] ?? ''),
    url: readString(r['url']),
    type: r['type'] === 'video' ? 'video' : 'image',
    isPrimary: readBoolean(r['isPrimary']),
  };
}

function adaptProductSizeFromNest(raw: unknown): ProductSize {
  const r = raw as Record<string, unknown>;
  const sizeRec = (r['size'] as Record<string, unknown>) ?? {};
  const colorLinks = Array.isArray(r['productSizeColors'])
    ? (r['productSizeColors'] as unknown[])
    : [];
  const balances = r['inventoryBalances'];
  const colorStockMap = buildColorStockMap(balances);
  const sizeStock = sumInventoryBalances(balances);

  const colors: ProductColor[] = colorLinks.map((link) => {
    const l = link as Record<string, unknown>;
    const colorRec = (l['color'] as Record<string, unknown>) ?? {};
    const colorId = String(colorRec['id'] ?? l['colorId'] ?? '');
    return {
      id: colorId,
      description: readString(colorRec['description']),
      hash: colorRec['hash'] ? readString(colorRec['hash']) : undefined,
      productSizeId: String(r['id'] ?? ''),
      isExists: true,
      stock: colorStockMap.get(colorId) ?? 0,
    };
  });

  return {
    id: String(sizeRec['id'] ?? r['sizeId'] ?? r['id'] ?? ''),
    productSizeId: String(r['id'] ?? ''),
    description: readString(sizeRec['description'] ?? r['description']),
    price: r['salePrice'] != null ? readNumber(r['salePrice']) : undefined,
    purchasePrice: r['purchasePrice'] != null ? readNumber(r['purchasePrice']) : undefined,
    salePrice: r['salePrice'] != null ? readNumber(r['salePrice']) : undefined,
    minSalePrice: r['minSalePrice'] != null ? readNumber(r['minSalePrice']) : undefined,
    barcode: r['barcode'] ? readString(r['barcode']) : undefined,
    stock: sizeStock,
    colors: colors.length > 0 ? colors : undefined,
    inventory: adaptProductVariantInventory(r['inventory']),
  };
}

export function adaptProduct(raw: unknown): Product {
  const r = raw as Record<string, unknown>;

  // Nest returns productSizes; legacy uses sizes
  const sizesRaw = Array.isArray(r['productSizes'])
    ? r['productSizes']
    : Array.isArray(r['sizes'])
      ? r['sizes']
      : [];
  const sizes = (sizesRaw as unknown[]).map((s) => {
    const sr = s as Record<string, unknown>;
    // Nest nested shape has 'size' sub-object; flat shape has 'description' directly
    if ('size' in sr && sr['size'] && typeof sr['size'] === 'object') {
      return adaptProductSizeFromNest(s);
    }
    return adaptProductSize(s);
  });

  const media = Array.isArray(r['media'])
    ? (r['media'] as unknown[]).map(adaptProductMediaItem)
    : undefined;

  const gallery = Array.isArray(r['gallery'])
    ? (r['gallery'] as string[])
    : undefined;

  const sizeTypeId = Array.isArray(r['sizeTypeId'])
    ? (r['sizeTypeId'] as string[])
    : [];

  const wooCommerce = r['wooCommerce']
    ? {
        productId: (r['wooCommerce'] as Record<string, unknown>)['productId'] != null
          ? String((r['wooCommerce'] as Record<string, unknown>)['productId'])
          : null,
        lastSyncedAt: readString((r['wooCommerce'] as Record<string, unknown>)['lastSyncedAt'], null as any),
      }
    : undefined;

  // Nest returns gender as { id, name }; legacy returns string
  const genderRaw = r['gender'];
  const genderId = String(r['genderId'] ?? (genderRaw as Record<string, unknown>)?.['id'] ?? '');
  const genderLabel =
    typeof genderRaw === 'string'
      ? genderRaw
      : readString((genderRaw as Record<string, unknown>)?.['name']);

  const hasRootStock = r['stock'] !== undefined && r['stock'] !== null;
  const stock = hasRootStock
    ? readStock(r['stock'])
    : sizes.reduce((sum, size) => sum + (size.stock ?? 0), 0);

  return {
    id: String(r['id'] ?? ''),
    name: readString(r['name']),
    barcode: readString(r['barcode']),
    description: readString(r['description']),
    purchasePrice: readNumber(r['purchasePrice']),
    salePrice: readNumber(r['salePrice']),
    minSalePrice: readNumber(r['minSalePrice']),
    status: readString(r['status']),
    genderId,
    gender: genderLabel,
    stock,
    sizes,
    filter: readBoolean(r['filter']),
    sizeTypeId,
    percentageDiscount: readNumber(r['percentageDiscount']),
    cashDiscount: readNumber(r['cashDiscount']),
    warehouseId: String(r['warehouseId'] ?? ''),
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

export function toProductWritePayload(
  data: unknown,
  options?: { forCreate?: boolean },
): ProductApiWritePayload {
  const source = data as Record<string, unknown>;
  const payload: ProductApiWritePayload = {};

  if (source['name'] !== undefined) {
    payload.name = readString(source['name']);
  }
  if (source['description'] !== undefined) {
    payload.description = readString(source['description']);
  }
  if (source['barcode'] !== undefined) {
    payload.barcode = readString(source['barcode']);
  }
  if (source['status'] !== undefined) {
    payload.status = readString(source['status']);
  }
  if (source['genderId'] !== undefined) {
    payload.genderId = readString(source['genderId']);
  }
  if (source['warehouseId'] !== undefined) {
    payload.warehouseId = readString(source['warehouseId']);
  }
  if (source['vendorId'] !== undefined) {
    payload.vendorId = readString(source['vendorId']);
  }
  if (source['percentageDiscount'] !== undefined) {
    payload.percentageDiscount = readNumber(source['percentageDiscount']);
  }
  if (source['cashDiscount'] !== undefined) {
    payload.cashDiscount = readNumber(source['cashDiscount']);
  }
  if (source['isFeatured'] !== undefined) {
    payload.isFeatured = readBoolean(source['isFeatured']);
  }
  if (source['isOnSale'] !== undefined) {
    payload.isOnSale = readBoolean(source['isOnSale']);
  }
  const wooStatus = source['wooStatus'];
  if (wooStatus === 'draft' || wooStatus === 'publish') {
    payload.wooStatus = wooStatus;
  } else if (wooStatus === null) {
    payload.wooStatus = null;
  }

  if (options?.forCreate && Array.isArray(source['sizes'])) {
    payload.sizes = source['sizes'];
  }

  return payload;
}

export function adaptProductList(raw: unknown): ProductListResponse {
  if (Array.isArray(raw)) {
    return {
      data: (raw as unknown[]).map(adaptProduct),
      paginate: { total: raw.length, pages: 1 },
    };
  }

  const r = raw as {
    data?: unknown[];
    paginate?: { total: number; pages: number };
    meta?: { total: number; lastPage: number };
  };

  const total = r.paginate?.total ?? r.meta?.total ?? 0;
  const pages = r.paginate?.pages ?? r.meta?.lastPage ?? 1;

  return {
    data: (r.data ?? []).map(adaptProduct),
    paginate: { total, pages },
  };
}

export function adaptGender(raw: unknown): Gender {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r['id'] ?? ''),
    description: readString(r['description'] ?? r['name']),
  };
}

export function adaptWarehouse(raw: unknown): Warehouse {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r['id'] ?? ''),
    name: readString(r['name']),
  };
}

export function adaptSizeType(raw: unknown): SizeType {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r['id'] ?? ''),
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
  const parsedId = id != null ? String(id) : '';

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
