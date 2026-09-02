import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  MediaLibraryItem,
  MediaLibraryListParams,
  MediaLibraryListResult,
  MediaLibraryUploadResult,
} from '../models/media-library.model';
import {
  adaptMediaLibraryListResponse,
  adaptMediaLibraryUploadResponse,
} from './media-library.adapter';

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'string' && err.trim()) {
    return err;
  }

  const http = err as {
    error?: { message?: string | string[] };
    message?: string;
  };

  const backendMessage = http?.error?.message;
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage;
  }
  if (Array.isArray(backendMessage) && backendMessage.length > 0) {
    return backendMessage.join(' ');
  }

  return http?.message ?? 'Error al procesar la solicitud.';
}

@Service()
export class MediaLibraryService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ecommerce/media`;

  list(params: MediaLibraryListParams = {}): Observable<MediaLibraryListResult> {
    let httpParams = new HttpParams();

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.mimeType?.trim()) {
      httpParams = httpParams.set('mimeType', params.mimeType.trim());
    }
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    if (params.page) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params.limit) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    return this.http
      .get<unknown>(this.base, { params: httpParams })
      .pipe(map(adaptMediaLibraryListResponse));
  }

  upload(files: File[]): Observable<MediaLibraryUploadResult> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file, file.name);
    }

    return this.http.post<unknown>(this.base, formData).pipe(
      map(adaptMediaLibraryUploadResponse),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  delete(mediaId: string): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.base}/${mediaId}`)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  deleteMany(ids: string[]): Observable<{ deleted: number }> {
    return this.http
      .delete<{ deleted: number }>(`${this.base}/bulk`, { body: { ids } })
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  isImage(item: MediaLibraryItem): boolean {
    return item.mimeType.startsWith('image/');
  }
}
