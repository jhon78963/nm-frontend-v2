import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { map, Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  formatDateTime,
} from '../../../finances/cash-movements/data-access/cash-movement.adapter';
import {
  AdminExpensePayload,
  AdminExpenseReport,
  EMPTY_ADMIN_EXPENSE_REPORT,
} from '../models/admin-expense.model';
import { adaptAdminExpenseReport } from './admin-expense.adapter';

@Service()
export class AdminExpenseService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/cashflow`;

  private readonly reportState = signal<AdminExpenseReport>(EMPTY_ADMIN_EXPENSE_REPORT);
  readonly report = this.reportState.asReadonly();

  loadMonthlyReport(month: string): Observable<AdminExpenseReport> {
    const url = `${this.base}/monthly?month=${encodeURIComponent(month)}`;

    return this.http.get<unknown>(url).pipe(
      map((response) => adaptAdminExpenseReport(response)),
      tap((report) => this.reportState.set(report)),
    );
  }

  registerExpense(
    payload: AdminExpensePayload,
    files: File[] | null,
    viewMonth: string,
  ): Observable<AdminExpenseReport> {
    const body = this.buildJsonPayload(payload);

    return this.http.post<unknown>(this.base, body).pipe(
      switchMap(() => this.loadMonthlyReport(viewMonth)),
    );
  }

  updateExpense(
    id: string,
    payload: AdminExpensePayload,
    files: File[] | null,
    viewMonth: string,
  ): Observable<AdminExpenseReport> {
    const body = this.buildJsonPayload(payload);

    return this.http.patch<unknown>(`${this.base}/${id}`, body).pipe(
      switchMap(() => this.loadMonthlyReport(viewMonth)),
    );
  }

  buildPayloadFromForm(
    form: {
      category: AdminExpensePayload['category'];
      description: string;
      amount: number;
      date: string;
      accountingMonth: string;
      payrollPeriod: AdminExpensePayload['payroll_period'];
      paymentMethod: AdminExpensePayload['payment_method'];
    },
  ): AdminExpensePayload {
    const paymentDate = new Date(form.date.replace(' ', 'T'));

    return {
      type: 'EXPENSE',
      category: form.category,
      amount: form.amount,
      description: form.description.trim(),
      date: formatDateTime(paymentDate),
      accounting_month: form.accountingMonth,
      payroll_period: form.payrollPeriod,
      payment_method: form.paymentMethod,
    };
  }

  clearReport(): void {
    this.reportState.set(EMPTY_ADMIN_EXPENSE_REPORT);
  }

  private buildJsonPayload(payload: AdminExpensePayload): Record<string, unknown> {
    return {
      type: payload.type,
      category: payload.category,
      amount: payload.amount,
      description: payload.description,
      date: payload.date.slice(0, 10),
      paymentMethod: payload.payment_method,
      accountingMonth: payload.accounting_month,
      ...(payload.payroll_period ? { payrollPeriod: payload.payroll_period } : {}),
    };
  }
}
