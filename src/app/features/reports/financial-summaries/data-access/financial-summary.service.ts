import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { map, Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  EMPTY_FINANCIAL_SUMMARY,
  FinancialSummary,
  QuickMovementInput,
} from '../models/financial-summary.model';
import {
  adaptFinancialSummary,
  buildQuickMovementFormData,
} from './financial-summary.adapter';

@Service()
export class FinancialSummaryService {
  private readonly http = inject(HttpClient);
  private readonly summaryBase = `${environment.apiUrl}/financial-summary`;
  private readonly cashFlowBase = `${environment.apiUrl}/cashflow`;

  private readonly summaryState = signal<FinancialSummary>(EMPTY_FINANCIAL_SUMMARY);
  readonly summary = this.summaryState.asReadonly();

  loadSummary(): Observable<FinancialSummary> {
    return this.http.get<unknown>(this.summaryBase).pipe(
      map((response) => adaptFinancialSummary(response)),
      tap((summary) => this.summaryState.set(summary)),
    );
  }

  registerQuickMovement(input: QuickMovementInput): Observable<FinancialSummary> {
    const body = buildQuickMovementFormData(input);

    return this.http.post<unknown>(this.cashFlowBase, body).pipe(
      switchMap(() => this.loadSummary()),
    );
  }

  clearSummary(): void {
    this.summaryState.set(EMPTY_FINANCIAL_SUMMARY);
  }
}
