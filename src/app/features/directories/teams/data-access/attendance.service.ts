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
    teamId: number,
    month: number,
    year: number,
  ): Observable<AttendanceMonthResponse> {
    return this.http
      .get<unknown>(`${this.base}/${teamId}?month=${month}&year=${year}`)
      .pipe(map(adaptAttendanceMonth));
  }

  getDailySummary(dateYmd: string): Observable<DailyAttendanceRow[]> {
    return this.http
      .get<unknown>(`${this.base}/daily-summary?date=${encodeURIComponent(dateYmd)}`)
      .pipe(map(adaptDailySummary));
  }

  store(payload: AttendancePayload): Observable<AttendanceRecord> {
    return this.http
      .post<unknown>(this.base, {
        team_id: payload.teamId,
        date: payload.date,
        status: payload.status,
        check_in_time: payload.checkInTime,
        check_out_time: payload.checkOutTime,
        delay_minutes: payload.delayMinutes,
        notes: payload.notes,
      })
      .pipe(
        map(adaptStoredAttendance),
        catchError((err) => throwError(() => extractErrorMessage(err))),
      );
  }
}
