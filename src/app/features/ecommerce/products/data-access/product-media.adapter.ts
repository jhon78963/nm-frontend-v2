import {
  ProductMediaDeleteResponse,
  ProductMediaUploadResponse,
  PublishMediaItem,
} from '../models/product-media.model';

function readString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

export function adaptPublishMediaItem(raw: unknown): PublishMediaItem {
  const r = raw as Record<string, unknown>;
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

export function adaptMediaUploadResponse(raw: unknown): ProductMediaUploadResponse {
  const r = raw as Record<string, unknown>;

  const uploadedArr = Array.isArray(r['uploaded']) ? r['uploaded'] : null;
  if (uploadedArr && uploadedArr.length > 0) {
    const first = uploadedArr[0] as Record<string, unknown>;
    return {
      message: 'Imagen subida correctamente.',
      productId: readString(first['productId']),
      media: adaptPublishMediaItem(first),
    };
  }

  return {
    message: readString(r['message'], 'Imagen subida correctamente.'),
    productId: String(r['productId'] ?? ''),
    media: adaptPublishMediaItem(r['media']),
  };
}

export function adaptMediaDeleteResponse(raw: unknown): ProductMediaDeleteResponse {
  const r = raw as Record<string, unknown>;

  return {
    message: readString(r['message'], 'Imagen eliminada correctamente.'),
    productId: readString(r['productId']),
    deletedMediaId: readString(r['deletedMediaId'] ?? r['id'] ?? ''),
  };
}
