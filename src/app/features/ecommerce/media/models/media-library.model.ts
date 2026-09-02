export type MediaLibrarySort = 'newest' | 'oldest' | 'smallest' | 'largest';

export interface MediaLibraryItem {
  id: string;
  url: string;
  path: string;
  mimeType: string;
  size: number;
  name: string;
  originalName?: string | null;
  createdAt: string;
}

export interface MediaLibraryListParams {
  search?: string;
  mimeType?: string;
  sort?: MediaLibrarySort;
  page?: number;
  limit?: number;
}

export interface MediaLibraryListResult {
  data: MediaLibraryItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MediaLibraryUploadResult {
  uploaded: MediaLibraryItem[];
}
