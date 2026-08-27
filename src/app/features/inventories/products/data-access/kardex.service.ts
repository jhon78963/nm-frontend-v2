import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { KardexReport, KardexReportParams } from '../models/kardex.model';
import { adaptKardexReport } from './kardex.adapter';

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

  return http?.message ?? 'No se pudo cargar el kardex.';
}

@Service()
export class KardexService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/kardex`;

  getReport(params: KardexReportParams): Observable<KardexReport> {
    let httpParams = new HttpParams();

    if (params.productId) {
      httpParams = httpParams.set('productId', String(params.productId));
    }
    if (params.productSizeId) {
      httpParams = httpParams.set('productSizeId', String(params.productSizeId));
    }
    if (params.startDate) {
      httpParams = httpParams.set('dateFrom', params.startDate);
    }
    if (params.endDate) {
      httpParams = httpParams.set('dateTo', params.endDate);
    }
    if (params.colorId != null && params.colorId !== '') {
      httpParams = httpParams.set('colorId', String(params.colorId));
    }

    return this.http.get<unknown>(this.base, { params: httpParams }).pipe(
      map((raw) => {
        const report = adaptKardexReport(raw);
        if (!report) {
          throw new Error('Respuesta de kardex inválida.');
        }
        return report;
      }),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }
}
