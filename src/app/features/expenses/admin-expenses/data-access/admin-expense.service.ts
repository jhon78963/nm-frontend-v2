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
  private readonly base = `${environment.apiUrl}/cash-flow`;

  private readonly reportState = signal<AdminExpenseReport>(EMPTY_ADMIN_EXPENSE_REPORT);
  readonly report = this.reportState.asReadonly();

  loadMonthlyReport(month: string): Observable<AdminExpenseReport> {
    const url = `${this.base}/admin/monthly?month=${encodeURIComponent(month)}`;

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
    const formData = this.buildFormData(payload, files);

    return this.http.post<unknown>(this.base, formData).pipe(
      switchMap(() => this.loadMonthlyReport(viewMonth)),
    );
  }

  updateExpense(
    id: number,
    payload: AdminExpensePayload,
    files: File[] | null,
    viewMonth: string,
  ): Observable<AdminExpenseReport> {
    const formData = this.buildFormData(payload, files);
    formData.append('_method', 'PUT');

    return this.http.post<unknown>(`${this.base}/${id}`, formData).pipe(
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

  private buildFormData(payload: AdminExpensePayload, files: File[] | null): FormData {
    const formData = new FormData();
    formData.append('type', payload.type);
    formData.append('category', payload.category);
    formData.append('amount', payload.amount.toString());
    formData.append('description', payload.description);
    formData.append('date', payload.date);
    formData.append('accounting_month', payload.accounting_month);

    if (payload.payroll_period) {
      formData.append('payroll_period', payload.payroll_period);
    }

    formData.append('payment_method', payload.payment_method);

    for (const file of files ?? []) {
      formData.append('images[]', file);
    }

    return formData;
  }
}
