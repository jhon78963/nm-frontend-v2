import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  PurchaseBulkPayload,
  PurchaseDetail,
  PurchaseHeaderPatch,
  PurchaseLinePatch,
  PurchaseListResponse,
  PurchaseRegisterBulkResponse,
} from '../models/purchase.model';
import {
  adaptPurchaseDetail,
  adaptPurchaseList,
  adaptPurchaseRegisterBulkResponse,
} from './purchase.adapter';

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'string' && err.trim()) {
    return err;
  }

  const http = err as {
    error?: {
      message?: string | string[];
      errors?: Record<string, string[]>;
    };
    message?: string;
  };

  const backendMessage = http?.error?.message;
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage;
  }
  if (Array.isArray(backendMessage) && backendMessage.length > 0) {
    return backendMessage.join(' ');
  }

  const stockError = http?.error?.errors?.['stock']?.[0];
  if (stockError) {
    return stockError;
  }

  return http?.message ?? 'Error al procesar la solicitud.';
}

@Service()
export class PurchaseService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/purchases`;

  getAll(params: {
    limit: number;
    page: number;
    search?: string;
    warehouseId?: number | null;
    status?: string | null;
  }): Observable<PurchaseListResponse> {
    let url = `${this.base}?limit=${params.limit}&page=${params.page}`;

    if (params.search?.trim()) {
      url += `&search=${encodeURIComponent(params.search.trim())}`;
    }
    if (params.warehouseId != null && params.warehouseId > 0) {
      url += `&warehouseId=${params.warehouseId}`;
    }
    if (params.status) {
      url += `&status=${encodeURIComponent(params.status)}`;
    }

    return this.http.get<unknown>(url).pipe(map(adaptPurchaseList));
  }

  getOne(id: number): Observable<PurchaseDetail> {
    return this.http
      .get<unknown>(`${this.base}/${id}`)
      .pipe(map(adaptPurchaseDetail));
  }

  registerBulk(
    payload: PurchaseBulkPayload,
    paymentMethod = 'CASH',
    voucherFiles: File[] | null = null,
  ): Observable<PurchaseRegisterBulkResponse> {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));
    formData.append('payment_method', paymentMethod);
    (voucherFiles ?? []).forEach((f) => formData.append('images[]', f));

    return this.http.post<unknown>(`${this.base}/bulk`, formData).pipe(
      map(adaptPurchaseRegisterBulkResponse),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  cancel(id: number, reason?: string | null): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.base}/${id}/cancel`, {
        reason: reason?.trim() || null,
      })
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  patchHeader(
    id: number,
    body: PurchaseHeaderPatch,
  ): Observable<{ message: string }> {
    return this.http
      .patch<{ message: string }>(`${this.base}/${id}`, body)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  addVouchers(
    purchaseId: number,
    files: File[],
  ): Observable<{ message: string }> {
    const formData = new FormData();
    files.forEach((f) => formData.append('images[]', f));

    return this.http
      .post<{ message: string }>(`${this.base}/${purchaseId}/vouchers`, formData)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  updateLine(
    purchaseId: number,
    lineId: number,
    body: PurchaseLinePatch,
  ): Observable<{ message: string }> {
    return this.http
      .patch<{ message: string }>(`${this.base}/${purchaseId}/lines/${lineId}`, body)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  deleteLine(
    purchaseId: number,
    lineId: number,
  ): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.base}/${purchaseId}/lines/${lineId}`)
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  getVoucherPreview(voucherPath: string): Observable<Blob> {
    const params = new HttpParams().set('path', voucherPath);
    return this.http.get(`${environment.apiUrl}/vouchers/preview`, {
      params,
      responseType: 'blob',
    });
  }
}
