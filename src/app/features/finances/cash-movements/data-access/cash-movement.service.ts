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
  private readonly base = `${environment.apiUrl}/cashflow`;

  private readonly reportState = signal<CashDailyReport>(EMPTY_CASH_DAILY_REPORT);
  readonly report = this.reportState.asReadonly();

  loadDailyReport(date: string): Observable<CashDailyReport> {
    const url = `${this.base}/daily?date=${date}`;

    return this.http.get<unknown>(url).pipe(
      map((response) => adaptCashDailyReport(response)),
      tap((report) => this.reportState.set(report)),
    );
  }

  registerMovement(
    payload: MovementPayload,
    viewDate: string,
  ): Observable<CashDailyReport> {
    const body = this.buildJsonPayload(payload);

    return this.http.post<unknown>(this.base, body).pipe(
      switchMap(() => this.loadDailyReport(viewDate)),
    );
  }

  updateMovement(
    id: string,
    payload: MovementPayload,
    viewDate: string,
  ): Observable<CashDailyReport> {
    const body = this.buildJsonPayload(payload);

    return this.http.patch<unknown>(`${this.base}/${id}`, body).pipe(
      switchMap(() => this.loadDailyReport(viewDate)),
    );
  }

  deleteMovement(
    id: string,
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

  private buildJsonPayload(payload: MovementPayload): Record<string, unknown> {
    return {
      type: payload.type,
      category: payload.category satisfies MovementCategory,
      amount: payload.amount,
      description: payload.description,
      date: payload.date,
      paymentMethod: payload.payment_method,
      accountingMonth: payload.date.slice(0, 7),
    };
  }
}
