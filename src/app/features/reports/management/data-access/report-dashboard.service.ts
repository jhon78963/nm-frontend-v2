import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  EMPTY_REPORT_DASHBOARD,
  ReportDashboard,
} from '../models/report-dashboard.model';
import { adaptReportDashboard } from './report-dashboard.adapter';

@Service()
export class ReportDashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reports`;

  private readonly dashboardState = signal<ReportDashboard>(EMPTY_REPORT_DASHBOARD);
  readonly dashboard = this.dashboardState.asReadonly();

  loadDashboard(startDate: string, endDate: string): Observable<ReportDashboard> {
    const url = `${this.base}/dashboard?start_date=${startDate}&end_date=${endDate}`;

    return this.http.get<unknown>(url).pipe(
      map((response) => adaptReportDashboard(response)),
      tap((dashboard) => this.dashboardState.set(dashboard)),
    );
  }

  clearDashboard(): void {
    this.dashboardState.set(EMPTY_REPORT_DASHBOARD);
  }
}
