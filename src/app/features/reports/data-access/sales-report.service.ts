import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DailySalesReport,
  MonthlySalesReport,
  PeriodSalesReport,
  SalesPeriodFilters,
  SalesReportFilters,
} from '../models/sales-report.model';
import {
  adaptDailySalesReport,
  adaptMonthlySalesReport,
  adaptPeriodSalesReport,
} from './sales-report.adapter';

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

function appendWarehouseParams(
  params: HttpParams,
  warehouseId: number | undefined,
): HttpParams {
  if (warehouseId && warehouseId > 0) {
    return params.set('warehouse_id', String(warehouseId));
  }

  return params;
}

@Service()
export class SalesReportService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reports/sales`;

  getDailyReport(filters: SalesReportFilters): Observable<DailySalesReport> {
    let params = new HttpParams().set('date', filters.date ?? '');
    params = appendWarehouseParams(params, filters.warehouseId);

    return this.http.get<unknown>(`${this.base}/daily`, { params }).pipe(
      map((raw) => adaptDailySalesReport(raw, filters.warehouseId ?? 0)),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  getMonthlyReport(filters: SalesReportFilters): Observable<MonthlySalesReport> {
    const month =
      filters.year && filters.month
        ? `${filters.year}-${String(filters.month).padStart(2, '0')}`
        : '';

    let params = new HttpParams().set('month', month);
    params = appendWarehouseParams(params, filters.warehouseId);

    return this.http.get<unknown>(`${this.base}/monthly`, { params }).pipe(
      map((raw) => adaptMonthlySalesReport(raw, filters.warehouseId ?? 0)),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  getPeriodReport(filters: SalesPeriodFilters): Observable<PeriodSalesReport> {
    let params = new HttpParams()
      .set('start_date', filters.from)
      .set('end_date', filters.to);
    params = appendWarehouseParams(params, filters.warehouseId);

    return this.http
      .get<unknown>(`${environment.apiUrl}/reports/sales/daily-period`, { params })
      .pipe(
        map((raw) => adaptPeriodSalesReport(raw, filters.warehouseId ?? 0)),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  exportDailyPdf(filters: SalesReportFilters): Observable<Blob> {
    return this.exportPdf(`${this.base}/daily/pdf`, filters.date, filters.warehouseId);
  }

  exportMonthlyPdf(filters: SalesReportFilters): Observable<Blob> {
    const month =
      filters.year && filters.month
        ? `${filters.year}-${String(filters.month).padStart(2, '0')}`
        : undefined;

    return this.exportPdf(`${this.base}/monthly/pdf`, month, filters.warehouseId, 'month');
  }

  exportPeriodPdf(filters: SalesPeriodFilters): Observable<Blob> {
    let params = new HttpParams()
      .set('start_date', filters.from)
      .set('end_date', filters.to);
    params = appendWarehouseParams(params, filters.warehouseId);

    return this.http
      .get(`${environment.apiUrl}/reports/sales/period/pdf`, {
        params,
        responseType: 'blob',
      })
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }

  private exportPdf(
    url: string,
    value: string | undefined,
    warehouseId: number | undefined,
    paramName: 'date' | 'month' = 'date',
  ): Observable<Blob> {
    let params = new HttpParams();
    if (value) {
      params = params.set(paramName, value);
    }
    params = appendWarehouseParams(params, warehouseId);

    return this.http
      .get(url, {
        params,
        responseType: 'blob',
      })
      .pipe(catchError((err) => throwError(() => extractErrorMessage(err))));
  }
}
