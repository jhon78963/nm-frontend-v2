import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardMetrics } from '../models/dashboard-home.model';
import {
  adaptDashboardMetrics,
  emptyDashboardMetrics,
} from './dashboard-home.adapter';

@Service()
export class DashboardHomeService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/dashboard/metrics`;

  getMetrics(): Observable<DashboardMetrics> {
    return this.http.get<unknown>(this.url).pipe(
      map(adaptDashboardMetrics),
      catchError(() => of(emptyDashboardMetrics())),
    );
  }
}
