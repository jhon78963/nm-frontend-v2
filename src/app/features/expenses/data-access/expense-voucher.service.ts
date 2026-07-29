import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ensureVoucherBlobType } from '../admin-expenses/data-access/admin-expense.adapter';

@Service()
export class ExpenseVoucherService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/cash-flow`;

  getVoucherPreview(voucherPath: string): Observable<Blob> {
    const params = new HttpParams().set('path', voucherPath);

    return this.http
      .get(`${this.base}/vouchers/preview`, {
        params,
        responseType: 'blob',
      })
      .pipe(map((blob) => ensureVoucherBlobType(blob, voucherPath)));
  }
}
