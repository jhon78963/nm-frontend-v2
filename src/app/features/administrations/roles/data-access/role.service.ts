import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  adaptPermissionList,
  adaptRole,
  adaptRoleList,
} from './role.adapter';
import { Permission, Role, RoleListResponse } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/roles`;

  getAll(params: {
    limit: number;
    page: number;
    search?: string;
  }): Observable<RoleListResponse> {
    let url = `${this.base}?limit=${params.limit}&page=${params.page}`;
    if (params.search?.trim()) {
      url += `&search=${encodeURIComponent(params.search.trim())}`;
    }
    return this.http.get<unknown>(url).pipe(map(adaptRoleList));
  }

  getOne(id: number): Observable<Role> {
    return this.http
      .get<unknown>(`${this.base}/${id}`)
      .pipe(map(adaptRole));
  }

  getPermissions(): Observable<Permission[]> {
    return this.http
      .get<unknown[]>(`${this.base}/permissions`)
      .pipe(map(adaptPermissionList));
  }

  create(data: { name: string; permissions?: string[] }): Observable<Role> {
    return this.http
      .post<unknown>(this.base, data)
      .pipe(map(adaptRole));
  }

  update(
    id: number,
    data: { name?: string; permissions?: string[] },
  ): Observable<Role> {
    return this.http
      .patch<unknown>(`${this.base}/${id}`, data)
      .pipe(map(adaptRole));
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  syncPermissions(
    id: number,
    permissions: string[],
  ): Observable<Role> {
    return this.http
      .post<{ role: unknown }>(`${this.base}/${id}/sync-permissions`, {
        permissions,
      })
      .pipe(map((res) => adaptRole(res.role)));
  }
}
