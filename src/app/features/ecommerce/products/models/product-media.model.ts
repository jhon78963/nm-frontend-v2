export interface WooCommerceSyncResult {
  attempted: boolean;
  products: number;
  variations: number;
  errors: number;
  error: string | null;
}

export interface ProductMediaUploadResponse {
  message: string;
  productId: number;
  media: PublishMediaItem;
  wooCommerceSync: WooCommerceSyncResult;
}

export interface ProductMediaDeleteResponse {
  message: string;
  productId: number;
  deletedMediaId: number;
  wooCommerceSync: WooCommerceSyncResult;
}

export interface PublishMediaItem {
  id: number;
  filePath: string;
  publicUrl: string | null;
  fileName: string | null;
}

export interface WooCommerceSyncResponse {
  message: string;
  wooCommerceSync: WooCommerceSyncResult;
  wooProductId: number | null;
  lastSyncedAt: string | null;
}
