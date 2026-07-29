import {
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
  return {
    id: readNumber(r['id']),
    url: readString(r['url']),
    type: r['type'] === 'video' ? 'video' : 'image',
    isPrimary: readBoolean(r['isPrimary']),
  };
}

export function adaptPublishProduct(raw: unknown): PublishProduct {
  const r = raw as Record<string, unknown>;

  const media = Array.isArray(r['media'])
    ? (r['media'] as unknown[]).map(adaptMediaItem)
    : [];

  const wooCommerce = r['wooCommerce']
    ? {
        productId: readNumber(
          (r['wooCommerce'] as Record<string, unknown>)['productId'],
          null as unknown as number,
        ) || null,
        lastSyncedAt:
          readString(
            (r['wooCommerce'] as Record<string, unknown>)['lastSyncedAt'],
            '',
          ) || null,
      }
    : undefined;

  return {
    id: readNumber(r['id']),
    name: readString(r['name']),
    barcode: readString(r['barcode']),
    description: readString(r['description']),
    status: readString(r['status']),
    genderId: readNumber(r['genderId']),
    warehouseId: readNumber(r['warehouseId']),
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

export function adaptGenderOption(raw: unknown): { id: number; description: string } {
  const r = raw as Record<string, unknown>;
  return {
    id: readNumber(r['id']),
    description: readString(r['description']),
  };
}

export function adaptWarehouseOption(raw: unknown): { id: number; name: string } {
  const r = raw as Record<string, unknown>;
  return {
    id: readNumber(r['id']),
    name: readString(r['name']),
  };
}

export function adaptCatalogOption(raw: unknown): { id: number; description: string } {
  const r = raw as Record<string, unknown>;
  return {
    id: readNumber(r['id']),
    description: readString(r['description']),
  };
}
