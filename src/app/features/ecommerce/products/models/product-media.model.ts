export interface WooCommerceSyncResult {
  attempted: boolean;
  products: number;
  variations: number;
  errors: number;
  error: string | null;
}

export interface ProductMediaUploadResponse {
  message: string;
  productId: string;
  media: PublishMediaItem;
  wooCommerceSync: WooCommerceSyncResult;
}

export interface ProductMediaDeleteResponse {
  message: string;
  productId: string;
  deletedMediaId: string;
  wooCommerceSync: WooCommerceSyncResult;
}

export interface PublishMediaItem {
  id: string;
  filePath: string;
  publicUrl: string | null;
  fileName: string | null;
}

export interface WooCommerceSyncResponse {
  message: string;
  wooCommerceSync: WooCommerceSyncResult;
  wooProductId: string | null;
  lastSyncedAt: string | null;
}
