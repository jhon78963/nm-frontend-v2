import {
  MediaLibraryItem,
  MediaLibraryListResult,
  MediaLibraryUploadResult,
} from '../models/media-library.model';

function adaptMediaItem(raw: unknown): MediaLibraryItem {
  const item = raw as Record<string, unknown>;

  return {
    id: String(item['id'] ?? ''),
    url: String(item['url'] ?? ''),
    path: String(item['path'] ?? ''),
    mimeType: String(item['mimeType'] ?? ''),
    size: Number(item['size'] ?? 0),
    name: String(item['name'] ?? ''),
    originalName:
      typeof item['originalName'] === 'string' ? item['originalName'] : null,
    createdAt: String(item['createdAt'] ?? ''),
  };
}

export function adaptMediaLibraryListResponse(raw: unknown): MediaLibraryListResult {
  const data = raw as Record<string, unknown>;
  const items = Array.isArray(data['data']) ? data['data'].map(adaptMediaItem) : [];
  const meta = (data['meta'] ?? {}) as Record<string, unknown>;

  return {
    data: items,
    meta: {
      total: Number(meta['total'] ?? items.length),
      page: Number(meta['page'] ?? 1),
      limit: Number(meta['limit'] ?? (items.length || 50)),
      totalPages: Number(meta['totalPages'] ?? 1),
    },
  };
}

export function adaptMediaLibraryUploadResponse(raw: unknown): MediaLibraryUploadResult {
  const data = raw as Record<string, unknown>;
  const uploaded = Array.isArray(data['uploaded'])
    ? data['uploaded'].map(adaptMediaItem)
    : [];

  return { uploaded };
}
