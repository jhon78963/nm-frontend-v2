import { MediaLibraryItem } from '../models/media-library.model';

export function formatMediaSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function mediaDisplayName(item: MediaLibraryItem): string {
  return item.originalName?.trim() || item.name;
}

export function mediaTypeLabel(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Imagen';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Excel';
  if (mimeType.includes('word')) return 'Documento';
  if (mimeType === 'application/pdf') return 'PDF';
  return 'Archivo';
}
