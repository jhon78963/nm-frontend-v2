import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { map, Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { formatDateTime, parseDatetimeLocalValue } from '../../../finances/cash-movements/data-access/cash-movement.adapter';
import {
  AccumulatedAccountInitPayload,
  AccumulatedAccountSettings,
  AccumulatedAccountUpdatePayload,
  AccumulatedExpensePayload,
  AccumulatedExpenseReport,
  EMPTY_ACCUMULATED_EXPENSE_REPORT,
  EMPTY_ACCOUNT_SETTINGS,
} from '../models/accumulated-expense.model';
import {
  MonthEndTransferPayload,
  MonthEndTransferPreview,
  MonthEndTransferRecord,
  MonthEndTransferResult,
} from '../models/month-end-transfer.model';
import {
  adaptAccountSettings,
  adaptAccumulatedExpenseReport,
  adaptMonthEndTransferPreview,
  adaptMonthEndTransferRecord,
} from './accumulated-expense.adapter';

@Service()
export class AccumulatedExpenseService {
  private readonly http = inject(HttpClient);
  private readonly cashFlowBase = `${environment.apiUrl}/cashflow`;
  private readonly accountBase = `${environment.apiUrl}/accumulated`;

  private readonly reportState = signal<AccumulatedExpenseReport>(EMPTY_ACCUMULATED_EXPENSE_REPORT);
  private readonly accountState = signal<AccumulatedAccountSettings>(EMPTY_ACCOUNT_SETTINGS);

  readonly report = this.reportState.asReadonly();
  readonly account = this.accountState.asReadonly();

  loadMonthlyReport(month: string): Observable<AccumulatedExpenseReport> {
    const url = `${this.cashFlowBase}/accumulated/monthly?month=${encodeURIComponent(month)}`;

    return this.http.get<unknown>(url).pipe(
      map((response) => adaptAccumulatedExpenseReport(response)),
      tap((report) => this.reportState.set(report)),
    );
  }

  loadAccountSettings(): Observable<AccumulatedAccountSettings> {
    return this.http.get<unknown>(`${this.accountBase}/settings`).pipe(
      map((response) => adaptAccountSettings(response)),
      tap((settings) => this.accountState.set(settings)),
    );
  }

  initializeAccount(payload: AccumulatedAccountInitPayload): Observable<AccumulatedAccountSettings> {
    return this.http.post<unknown>(`${this.accountBase}/settings`, payload).pipe(
      map((response) => adaptAccountSettings(response)),
      tap((settings) => this.accountState.set(settings)),
    );
  }

  updateAccountSettings(
    payload: AccumulatedAccountUpdatePayload,
  ): Observable<AccumulatedAccountSettings> {
    return this.http.patch<unknown>(`${this.accountBase}/settings`, payload).pipe(
      map((response) => adaptAccountSettings(response)),
      tap((settings) => this.accountState.set(settings)),
    );
  }

  loadMonthEndTransferPreview(month: string): Observable<MonthEndTransferPreview> {
    const url = `${this.accountBase}/preview?month=${encodeURIComponent(month)}`;

    return this.http.get<unknown>(url).pipe(
      map((response) => {
        const data =
          (response as { data?: Record<string, unknown> })?.data ??
          (response as Record<string, unknown>);
        return adaptMonthEndTransferPreview(data);
      }),
    );
  }

  listMonthEndTransfers(month?: string, limit = 6): Observable<MonthEndTransferRecord[]> {
    let url = `${this.accountBase}/transfers?limit=${limit}`;
    if (month) {
      url += `&month=${encodeURIComponent(month)}`;
    }

    return this.http.get<unknown>(url).pipe(
      map((response) => {
        const rows =
          (response as { data?: unknown[] })?.data ??
          (Array.isArray(response) ? (response as unknown[]) : []);
        return Array.isArray(rows)
          ? rows.map((row) => adaptMonthEndTransferRecord(row as Record<string, unknown>))
          : [];
      }),
    );
  }

  recordMonthEndTransfer(payload: MonthEndTransferPayload): Observable<MonthEndTransferResult> {
    return this.http.post<unknown>(`${this.accountBase}/transfers`, payload).pipe(
      map((response) => {
        const raw = (response as { data?: Record<string, unknown> })?.data ??
          (response as Record<string, unknown>) ?? {};
        const settings = (raw['settings'] as Record<string, number>) ?? {};

        return {
          preview: adaptMonthEndTransferPreview(
            raw['preview'] as Record<string, unknown>,
          ),
          settings: {
            cash_balance: Number(settings['cashBalance'] ?? settings['cash_balance'] ?? 0),
            digital_balance: Number(settings['digitalBalance'] ?? settings['digital_balance'] ?? 0),
            current_cash: Number(settings['currentCash'] ?? settings['current_cash'] ?? 0),
            current_digital: Number(settings['currentDigital'] ?? settings['current_digital'] ?? 0),
            current_total: Number(settings['currentTotal'] ?? settings['current_total'] ?? 0),
          },
        };
      }),
      tap((result) => {
        this.accountState.update((current) => ({
          ...current,
          cashBalance: result.settings.cash_balance,
          digitalBalance: result.settings.digital_balance,
          currentCash: result.settings.current_cash,
          currentDigital: result.settings.current_digital,
          currentTotal: result.settings.current_total,
        }));
      }),
    );
  }

  registerExpense(
    payload: AccumulatedExpensePayload,
    files: File[] | null,
    viewMonth: string,
  ): Observable<AccumulatedExpenseReport> {
    const body = this.buildJsonPayload(payload);

    return this.http.post<unknown>(this.cashFlowBase, body).pipe(
      switchMap(() => this.loadMonthlyReport(viewMonth)),
    );
  }

  updateExpense(
    id: string,
    payload: AccumulatedExpensePayload,
    files: File[] | null,
    viewMonth: string,
  ): Observable<AccumulatedExpenseReport> {
    const body = this.buildJsonPayload(payload);

    return this.http.patch<unknown>(`${this.cashFlowBase}/${id}`, body).pipe(
      switchMap(() => this.loadMonthlyReport(viewMonth)),
    );
  }

  buildPayloadFromForm(form: {
    description: string;
    amount: number;
    date: string;
    paymentMethod: AccumulatedExpensePayload['payment_method'];
  }): AccumulatedExpensePayload {
    const paymentDate = parseDatetimeLocalValue(form.date);

    return {
      type: 'EXPENSE',
      category: 'ACCUMULATED',
      amount: form.amount,
      description: form.description.trim(),
      date: formatDateTime(paymentDate),
      payment_method: form.paymentMethod,
    };
  }

  refreshAccountAfterExpenses(): Observable<AccumulatedAccountSettings> {
    return this.loadAccountSettings();
  }

  private buildJsonPayload(payload: AccumulatedExpensePayload): Record<string, unknown> {
    return {
      type: payload.type,
      category: payload.category,
      amount: payload.amount,
      description: payload.description,
      date: payload.date.slice(0, 10),
      paymentMethod: payload.payment_method,
      accountingMonth: payload.date.slice(0, 7),
    };
  }
}
