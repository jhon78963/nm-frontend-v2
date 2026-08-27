import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  AttendanceMonthResponse,
  AttendancePayload,
  AttendanceRecord,
  DailyAttendanceRow,
} from '../models/attendance.model';
import {
  adaptAttendanceMonth,
  adaptDailySummary,
  adaptStoredAttendance,
} from './attendance.adapter';

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

  return http?.message ?? 'No se pudo procesar la asistencia.';
}

@Service()
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/attendance`;

  getByMonth(
    teamId: string,
    month: number,
    year: number,
  ): Observable<AttendanceMonthResponse> {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return this.http
      .get<unknown>(
        `${this.base}/monthly?month=${monthStr}&teamId=${encodeURIComponent(teamId)}`,
      )
      .pipe(map(adaptAttendanceMonth));
  }

  getDailySummary(dateYmd: string): Observable<DailyAttendanceRow[]> {
    return this.http
      .get<unknown>(`${this.base}/daily?date=${encodeURIComponent(dateYmd)}`)
      .pipe(map(adaptDailySummary));
  }

  store(payload: AttendancePayload): Observable<AttendanceRecord> {
    return this.http
      .post<unknown>(this.base, {
        teamId: payload.teamId,
        date: payload.date,
        status: payload.status,
        checkIn: payload.checkInTime,
        checkOut: payload.checkOutTime,
        delayMinutes: payload.delayMinutes,
        notes: payload.notes,
      })
      .pipe(
        map(adaptStoredAttendance),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }
}
