import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ActionLogListResponse } from '../models/action-log.model';
import { adaptActionLogList } from './action-log.adapter';

@Service()
export class ActionLogService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/user-action-logs`;

  getAll(params: {
    limit: number;
    page: number;
    search?: string;
    action?: string;
    actionGroup?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<ActionLogListResponse> {
    let url = `${this.base}?limit=${params.limit}&page=${params.page}`;
    if (params.search?.trim()) {
      url += `&search=${encodeURIComponent(params.search.trim())}`;
    }
    if (params.action?.trim()) {
      url += `&action=${encodeURIComponent(params.action.trim())}`;
    } else if (params.actionGroup?.trim()) {
      url += `&action_group=${encodeURIComponent(params.actionGroup.trim())}`;
    }
    if (params.startDate?.trim()) {
      url += `&start_date=${encodeURIComponent(params.startDate.trim())}`;
    }
    if (params.endDate?.trim()) {
      url += `&end_date=${encodeURIComponent(params.endDate.trim())}`;
    }

    return this.http.get<unknown>(url).pipe(map(adaptActionLogList));
  }
}
