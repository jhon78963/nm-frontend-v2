import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  PayrollApiResponse,
  PayrollPaymentItem,
  PayrollPeriod,
  PayrollQuincena,
  PaymentType,
} from '../models/payroll.model';
import { adaptPaymentItemResponse, adaptPayrollResponse } from './payroll.adapter';

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

  return http?.message ?? 'No se pudo procesar el movimiento de nómina.';
}

@Service()
export class PayrollService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/payments`;

  getPayroll(
    teamId: number,
    month: number,
    year: number,
    period: PayrollPeriod,
  ): Observable<PayrollApiResponse> {
    const q = new URLSearchParams({
      team_id: String(teamId),
      month: String(month),
      year: String(year),
      period,
    });

    return this.http
      .get<unknown>(`${this.base}/payroll?${q.toString()}`)
      .pipe(map(adaptPayrollResponse));
  }

  registerPayment(payload: {
    teamId: number;
    type: PaymentType;
    amount: number;
    date: string;
    description: string;
    paymentMethod: string;
    payrollPeriod: PayrollQuincena;
    accountingMonth: string;
    syncCashMovement: boolean;
    images: File[];
  }): Observable<{ message: string }> {
    const formData = new FormData();
    formData.append('team_id', String(payload.teamId));
    formData.append('type', payload.type);
    formData.append('amount', String(payload.amount));
    formData.append('date', payload.date);
    formData.append('payroll_period', payload.payrollPeriod);
    formData.append('accounting_month', payload.accountingMonth);
    formData.append('description', payload.description ?? '');
    formData.append('payment_method', payload.paymentMethod);
    formData.append('sync_cash_movement', payload.syncCashMovement ? '1' : '0');
    payload.images.forEach((file) => formData.append('images[]', file));

    return this.http.post<{ message: string }>(this.base, formData).pipe(
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  updatePayment(
    id: number,
    payload: {
      type: PaymentType;
      amount: number;
      date: string;
      payrollPeriod: PayrollQuincena;
      accountingMonth: string;
      paymentMethod: string;
      description: string;
    },
  ): Observable<PayrollPaymentItem> {
    return this.http
      .patch<unknown>(`${this.base}/${id}`, {
        type: payload.type,
        amount: payload.amount,
        date: payload.date,
        payroll_period: payload.payrollPeriod,
        accounting_month: payload.accountingMonth,
        payment_method: payload.paymentMethod,
        description: payload.description,
      })
      .pipe(
        map(adaptPaymentItemResponse),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  deletePayment(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`).pipe(
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }
}
