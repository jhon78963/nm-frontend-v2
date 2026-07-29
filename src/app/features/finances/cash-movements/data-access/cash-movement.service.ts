import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { map, Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CashDailyReport,
  EMPTY_CASH_DAILY_REPORT,
  MovementCategory,
  MovementPayload,
  PaymentMethod,
} from '../models/cash-movement.model';
import { adaptCashDailyReport, formatIsoDate } from './cash-movement.adapter';

const ALL_PAYMENT_FILTERS: PaymentMethod[] = ['CASH', 'YAPE', 'CARD'];

@Service()
export class CashMovementService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/cash-flow`;

  private readonly reportState = signal<CashDailyReport>(EMPTY_CASH_DAILY_REPORT);
  readonly report = this.reportState.asReadonly();

  loadDailyReport(date: string): Observable<CashDailyReport> {
    const filterParams = ALL_PAYMENT_FILTERS.map((f) => `filters[]=${f}`).join('&');
    const url = `${this.base}/daily?date=${date}&${filterParams}`;

    return this.http.get<unknown>(url).pipe(
      map((response) => adaptCashDailyReport(response)),
      tap((report) => this.reportState.set(report)),
    );
  }

  registerMovement(
    payload: MovementPayload,
    viewDate: string,
  ): Observable<CashDailyReport> {
    const formData = this.buildFormData(payload);

    return this.http.post<unknown>(this.base, formData).pipe(
      switchMap(() => this.loadDailyReport(viewDate)),
    );
  }

  updateMovement(
    id: number,
    payload: MovementPayload,
    viewDate: string,
  ): Observable<CashDailyReport> {
    const formData = this.buildFormData(payload);
    formData.append('_method', 'PUT');

    return this.http.post<unknown>(`${this.base}/${id}`, formData).pipe(
      switchMap(() => this.loadDailyReport(viewDate)),
    );
  }

  deleteMovement(
    id: number,
    viewDate: string,
  ): Observable<CashDailyReport> {
    return this.http.delete<unknown>(`${this.base}/${id}`).pipe(
      switchMap(() => this.loadDailyReport(viewDate)),
    );
  }

  clearReport(): void {
    this.reportState.set(EMPTY_CASH_DAILY_REPORT);
  }

  todayIsoDate(): string {
    return formatIsoDate(new Date());
  }

  private buildFormData(payload: MovementPayload): FormData {
    const formData = new FormData();
    formData.append('type', payload.type);
    formData.append('category', payload.category satisfies MovementCategory);
    formData.append('amount', payload.amount.toString());
    formData.append('description', payload.description);
    formData.append('date', payload.date);
    formData.append('payment_method', payload.payment_method);
    return formData;
  }
}
