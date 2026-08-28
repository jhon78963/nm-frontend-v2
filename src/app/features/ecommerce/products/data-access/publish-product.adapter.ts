import {
  EcommerceStepState,
  PublishProduct,
  PublishProductListResponse,
  PublishProductMediaItem,
} from '../models/publish-product.model';

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function readBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function adaptMediaItem(raw: unknown): PublishProductMediaItem {
  const r = raw as Record<string, unknown>;
  const mime = readString(r['mimeType']);
  return {
    id: String(r['id'] ?? ''),
    url: readString(r['url']),
    type: mime.startsWith('video/') || r['type'] === 'video' ? 'video' : 'image',
    isPrimary: readBoolean(r['isPrimary'] ?? r['isCover']),
  };
}

export function adaptPublishProduct(raw: unknown): PublishProduct {
  const r = raw as Record<string, unknown>;

  const media = Array.isArray(r['media'])
    ? (r['media'] as unknown[]).map(adaptMediaItem)
    : [];

  const wooCommerce = r['wooCommerce']
    ? {
        productId: (r['wooCommerce'] as Record<string, unknown>)['productId'] != null
          ? String((r['wooCommerce'] as Record<string, unknown>)['productId'])
          : null,
        lastSyncedAt:
          readString(
            (r['wooCommerce'] as Record<string, unknown>)['lastSyncedAt'],
            '',
          ) || null,
      }
    : undefined;

  return {
    id: String(r['id'] ?? ''),
    name: readString(r['name']),
    barcode: readString(r['barcode']),
    description: readString(r['description']),
    status: readString(r['status']),
    genderId: String(r['genderId'] ?? ''),
    warehouseId: String(r['warehouseId'] ?? ''),
    percentageDiscount: readNumber(r['percentageDiscount']),
    cashDiscount: readNumber(r['cashDiscount']),
    isFeatured: readBoolean(r['isFeatured']),
    isOnSale: readBoolean(r['isOnSale']),
    wooStatus:
      r['wooStatus'] === 'draft' || r['wooStatus'] === 'publish'
        ? r['wooStatus']
        : null,
    media,
    wooCommerce,
  };
}

export function adaptPublishProductList(raw: unknown): PublishProductListResponse {
  const r = raw as {
    data: unknown[];
    paginate: { total: number; pages: number };
  };

  return {
    data: (r.data ?? []).map(adaptPublishProduct),
    paginate: {
      total: r.paginate?.total ?? 0,
      pages: r.paginate?.pages ?? 0,
    },
  };
}

export function adaptGenderOption(raw: unknown): { id: string; description: string } {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r['id'] ?? ''),
    description: readString(r['description']),
  };
}

export function adaptWarehouseOption(raw: unknown): { id: string; name: string } {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r['id'] ?? ''),
    name: readString(r['name']),
  };
}

export function adaptCatalogOption(raw: unknown): { id: string; description: string } {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r['id'] ?? ''),
    description: readString(r['description']),
  };
}

export function toEcommerceStepState(
  product: Pick<PublishProduct, 'wooStatus' | 'wooCommerce'>,
  lastError: string | null = null,
): EcommerceStepState {
  const wooProductId = product.wooCommerce?.productId ?? null;
  const lastSyncedAt = product.wooCommerce?.lastSyncedAt ?? null;
  const wantsPublish = product.wooStatus === 'publish';
  const isPublished = wooProductId != null || wantsPublish;

  let syncStatus: EcommerceStepState['syncStatus'] = 'never';
  if (lastError) {
    syncStatus = 'error';
  } else if (wooProductId && lastSyncedAt) {
    syncStatus = 'synced';
  } else if (isPublished) {
    syncStatus = 'pending';
  }

  return {
    isPublished,
    wooProductId,
    wooUrl: null,
    syncStatus,
    lastSyncError: lastError,
    lastSyncedAt,
  };
}
