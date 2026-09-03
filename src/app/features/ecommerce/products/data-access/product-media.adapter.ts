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

function adaptWooCommerceSync(raw: unknown): WooCommerceSyncResult | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

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
  // Nuevo formato: { url, name } — el campo 'url' es la URL pública completa
  const url = r['url'] ? readString(r['url']) : null;
  const filePath = r['filePath'] ? readString(r['filePath']) : (url ?? '');
  const publicUrl = url ?? (r['publicUrl'] ? readString(r['publicUrl']) : null);
  const fileName = r['name']
    ? readString(r['name'])
    : r['fileName']
      ? readString(r['fileName'])
      : null;

  return {
    id: String(r['id'] ?? ''),
    filePath,
    publicUrl,
    fileName,
  };
}

const WOOCOMMERCE_SYNC_DISABLED: WooCommerceSyncResult = {
  attempted: false,
  products: 0,
  variations: 0,
  errors: 0,
  error: 'La sincronización con WooCommerce está desactivada en local.',
};

export function adaptMediaUploadResponse(raw: unknown): ProductMediaUploadResponse {
  const r = raw as Record<string, unknown>;

  // Nuevo formato: { uploaded: [{ id, url, name, isCover, ... }] }
  const uploadedArr = Array.isArray(r['uploaded']) ? r['uploaded'] : null;
  if (uploadedArr && uploadedArr.length > 0) {
    const first = uploadedArr[0] as Record<string, unknown>;
    return {
      message: 'Imagen subida correctamente.',
      productId: readString(first['productId']),
      media: adaptPublishMediaItem(first),
      wooCommerceSync: WOOCOMMERCE_SYNC_DISABLED,
    };
  }

  // Formato legacy
  return {
    message: readString(r['message']),
    productId: String(r['productId'] ?? ''),
    media: adaptPublishMediaItem(r['media']),
    wooCommerceSync:
      adaptWooCommerceSync(r['wooCommerceSync']) ?? WOOCOMMERCE_SYNC_DISABLED,
  };
}

export function adaptMediaDeleteResponse(raw: unknown): ProductMediaDeleteResponse {
  const r = raw as Record<string, unknown>;
  const deletedMediaId = readString(r['deletedMediaId'] ?? r['id'] ?? '');

  return {
    message: readString(r['message'] ?? 'Imagen eliminada correctamente.'),
    productId: readString(r['productId']),
    deletedMediaId,
    wooCommerceSync:
      adaptWooCommerceSync(r['wooCommerceSync']) ?? WOOCOMMERCE_SYNC_DISABLED,
  };
}

export function adaptWooCommerceSyncResponse(raw: unknown): WooCommerceSyncResponse {
  const r = raw as Record<string, unknown>;
  return {
    message: readString(r['message']),
    wooCommerceSync:
      adaptWooCommerceSync(r['wooCommerceSync']) ?? WOOCOMMERCE_SYNC_DISABLED,
    wooProductId: r['wooProductId'] != null ? String(r['wooProductId']) : null,
    lastSyncedAt: r['lastSyncedAt'] ? readString(r['lastSyncedAt']) : null,
  };
}
