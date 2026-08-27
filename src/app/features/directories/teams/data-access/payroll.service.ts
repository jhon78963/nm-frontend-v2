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
    teamId: string,
    month: number,
    year: number,
    period: PayrollPeriod,
  ): Observable<PayrollApiResponse> {
    return this.http
      .get<unknown>(
        `${this.base}/payroll?teamId=${encodeURIComponent(teamId)}&month=${month}&year=${year}&period=${encodeURIComponent(period)}`,
      )
      .pipe(map(adaptPayrollResponse));
  }

  registerPayment(payload: {
    teamId: string;
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
    const body: Record<string, unknown> = {
      teamId: payload.teamId,
      type: payload.type,
      amount: payload.amount,
      date: payload.date,
      payrollPeriod: payload.payrollPeriod,
      accountingMonth: payload.accountingMonth,
      paymentMethod: payload.paymentMethod,
    };

    return this.http.post<{ message: string }>(this.base, body).pipe(
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  updatePayment(
    id: string,
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
        payrollPeriod: payload.payrollPeriod,
        accountingMonth: payload.accountingMonth,
        paymentMethod: payload.paymentMethod,
      })
      .pipe(
        map(adaptPaymentItemResponse),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }

  deletePayment(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`).pipe(
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }
}
