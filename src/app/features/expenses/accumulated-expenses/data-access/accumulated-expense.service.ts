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
  private readonly cashFlowBase = `${environment.apiUrl}/cash-flow`;
  private readonly accountBase = `${environment.apiUrl}/accumulated-account`;

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
    return this.http.post<unknown>(`${this.accountBase}/initialize`, payload).pipe(
      map((response) => adaptAccountSettings(response)),
      tap((settings) => this.accountState.set(settings)),
    );
  }

  updateAccountSettings(
    payload: AccumulatedAccountUpdatePayload,
  ): Observable<AccumulatedAccountSettings> {
    return this.http.put<unknown>(`${this.accountBase}/settings`, payload).pipe(
      map((response) => adaptAccountSettings(response)),
      tap((settings) => this.accountState.set(settings)),
    );
  }

  loadMonthEndTransferPreview(month: string): Observable<MonthEndTransferPreview> {
    const url = `${this.accountBase}/month-end-transfer/preview?month=${encodeURIComponent(month)}`;

    return this.http.get<unknown>(url).pipe(
      map((response) => {
        const data = (response as { data?: Record<string, unknown> })?.data;
        return adaptMonthEndTransferPreview(data);
      }),
    );
  }

  listMonthEndTransfers(month?: string, limit = 6): Observable<MonthEndTransferRecord[]> {
    let url = `${this.accountBase}/month-end-transfers?limit=${limit}`;
    if (month) {
      url += `&month=${encodeURIComponent(month)}`;
    }

    return this.http.get<unknown>(url).pipe(
      map((response) => {
        const rows = (response as { data?: unknown[] })?.data ?? [];
        return Array.isArray(rows)
          ? rows.map((row) => adaptMonthEndTransferRecord(row as Record<string, unknown>))
          : [];
      }),
    );
  }

  recordMonthEndTransfer(payload: MonthEndTransferPayload): Observable<MonthEndTransferResult> {
    return this.http.post<unknown>(`${this.accountBase}/month-end-transfer`, payload).pipe(
      map((response) => {
        const data = (response as { data?: Record<string, unknown> })?.data ?? {};
        const settings = (data['settings'] as Record<string, number>) ?? {};

        return {
          preview: adaptMonthEndTransferPreview(
            data['preview'] as Record<string, unknown>,
          ),
          settings: {
            cash_balance: Number(settings['cash_balance'] ?? 0),
            digital_balance: Number(settings['digital_balance'] ?? 0),
            current_cash: Number(settings['current_cash'] ?? 0),
            current_digital: Number(settings['current_digital'] ?? 0),
            current_total: Number(settings['current_total'] ?? 0),
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
    const formData = this.buildFormData(payload, files);

    return this.http.post<unknown>(this.cashFlowBase, formData).pipe(
      switchMap(() => this.loadMonthlyReport(viewMonth)),
    );
  }

  updateExpense(
    id: number,
    payload: AccumulatedExpensePayload,
    files: File[] | null,
    viewMonth: string,
  ): Observable<AccumulatedExpenseReport> {
    const formData = this.buildFormData(payload, files);
    formData.append('_method', 'PUT');

    return this.http.post<unknown>(`${this.cashFlowBase}/${id}`, formData).pipe(
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

  private buildFormData(payload: AccumulatedExpensePayload, files: File[] | null): FormData {
    const formData = new FormData();
    formData.append('type', payload.type);
    formData.append('category', payload.category);
    formData.append('amount', payload.amount.toString());
    formData.append('description', payload.description);
    formData.append('date', payload.date);
    formData.append('payment_method', payload.payment_method);

    for (const file of files ?? []) {
      formData.append('images[]', file);
    }

    return formData;
  }
}
