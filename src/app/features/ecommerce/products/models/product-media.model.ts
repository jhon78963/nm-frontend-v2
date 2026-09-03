export interface ProductMediaUploadResponse {
  message: string;
  productId: string;
  media: PublishMediaItem;
}

export interface ProductMediaDeleteResponse {
  message: string;
  productId: string;
  deletedMediaId: string;
}

export interface PublishMediaItem {
  id: string;
  filePath: string;
  publicUrl: string | null;
  fileName: string | null;
}
