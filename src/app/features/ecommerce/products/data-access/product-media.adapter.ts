import {
  ProductMediaDeleteResponse,
  ProductMediaUploadResponse,
  PublishMediaItem,
  WooCommerceSyncResponse,
  WooCommerceSyncResult,
} from '../models/product-media.model';

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

function adaptWooCommerceSync(raw: unknown): WooCommerceSyncResult {
  const r = raw as Record<string, unknown>;
  return {
    attempted: readBoolean(r['attempted']),
    products: readNumber(r['products']),
    variations: readNumber(r['variations']),
    errors: readNumber(r['errors']),
    error: r['error'] ? readString(r['error']) : null,
  };
}

export function adaptPublishMediaItem(raw: unknown): PublishMediaItem {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r['id'] ?? ''),
    filePath: readString(r['filePath']),
    publicUrl: r['publicUrl'] ? readString(r['publicUrl']) : null,
    fileName: r['fileName'] ? readString(r['fileName']) : null,
  };
}

export function adaptMediaUploadResponse(raw: unknown): ProductMediaUploadResponse {
  const r = raw as Record<string, unknown>;
  return {
    message: readString(r['message']),
    productId: String(r['productId'] ?? ''),
    media: adaptPublishMediaItem(r['media']),
    wooCommerceSync: adaptWooCommerceSync(r['wooCommerceSync']),
  };
}

export function adaptMediaDeleteResponse(raw: unknown): ProductMediaDeleteResponse {
  const r = raw as Record<string, unknown>;
  return {
    message: readString(r['message']),
    productId: String(r['productId'] ?? ''),
    deletedMediaId: String(r['deletedMediaId'] ?? ''),
    wooCommerceSync: adaptWooCommerceSync(r['wooCommerceSync']),
  };
}

export function adaptWooCommerceSyncResponse(raw: unknown): WooCommerceSyncResponse {
  const r = raw as Record<string, unknown>;
  return {
    message: readString(r['message']),
    wooCommerceSync: adaptWooCommerceSync(r['wooCommerceSync']),
    wooProductId: r['wooProductId'] != null ? String(r['wooProductId']) : null,
    lastSyncedAt: r['lastSyncedAt'] ? readString(r['lastSyncedAt']) : null,
  };
}
