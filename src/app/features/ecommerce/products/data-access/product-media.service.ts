import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ProductMediaDeleteResponse,
  ProductMediaUploadResponse,
  WooCommerceSyncResponse,
} from '../models/product-media.model';
import {
  adaptMediaDeleteResponse,
  adaptMediaUploadResponse,
  adaptWooCommerceSyncResponse,
} from './product-media.adapter';

@Service()
export class ProductMediaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/products`;

  uploadImage(
    productId: string,
    file: File,
  ): Observable<HttpResponse<ProductMediaUploadResponse>> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http
      .post<unknown>(`${this.base}/${productId}/media`, formData, {
        observe: 'response',
      })
      .pipe(
        map((response) =>
          response.clone({
            body: response.body
              ? adaptMediaUploadResponse(response.body)
              : null,
          }),
        ),
      );
  }

  deleteImage(
    productId: string,
    mediaId: string,
  ): Observable<HttpResponse<ProductMediaDeleteResponse>> {
    return this.http
      .delete<unknown>(`${this.base}/${productId}/media/${mediaId}`, {
        observe: 'response',
      })
      .pipe(
        map((response) =>
          response.clone({
            body: response.body
              ? adaptMediaDeleteResponse(response.body)
              : null,
          }),
        ),
      );
  }

  getPreviewBlob(productId: string, mediaId: string): Observable<Blob> {
    return this.http.get(`${this.base}/${productId}/media/${mediaId}/preview`, {
      responseType: 'blob',
    });
  }
}

@Service()
export class WooCommerceService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/products`;

  syncProduct(
    productId: string,
  ): Observable<HttpResponse<WooCommerceSyncResponse>> {
    return this.http
      .post<unknown>(`${this.base}/${productId}/woocommerce/sync`, {}, {
        observe: 'response',
      })
      .pipe(
        map((response) =>
          response.clone({
            body: response.body
              ? adaptWooCommerceSyncResponse(response.body)
              : null,
          }),
        ),
      );
  }
}
