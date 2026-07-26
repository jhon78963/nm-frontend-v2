import {
  AttendanceMonthResponse,
  AttendanceRecord,
  AttendanceStatus,
  DailyAttendanceRow,
} from '../models/attendance.model';

function readString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function adaptAttendanceRecord(raw: unknown): AttendanceRecord {
  const r = raw as Record<string, unknown>;
  return {
    status: readString(r['status'], 'PUNTUAL') as AttendanceStatus,
    checkInTime: (r['checkInTime'] ?? r['check_in_time']) as string | null,
    checkOutTime: (r['checkOutTime'] ?? r['check_out_time']) as string | null,
    delayMinutes: readNumber(r['delayMinutes'] ?? r['delay_minutes']),
    notes: (r['notes'] ?? r['note']) as string | null,
  };
}

export function adaptAttendanceMonth(raw: unknown): AttendanceMonthResponse {
  const r = raw as { data?: Record<string, unknown> };
  const records: Record<string, AttendanceRecord> = {};

  for (const [key, value] of Object.entries(r.data ?? {})) {
    const dateKey = key.includes(' ') ? key.slice(0, 10) : key;
    records[dateKey] = adaptAttendanceRecord(value);
  }

  return { records };
}

export function adaptDailySummary(raw: unknown): DailyAttendanceRow[] {
  const r = raw as { data?: unknown[] };
  return (r.data ?? []).map((item) => {
    const row = item as Record<string, unknown>;
    const attendanceRaw = row['attendance'];
    return {
      teamId: readNumber(row['teamId'] ?? row['team_id']),
      name: readString(row['name']),
      surname: readString(row['surname']),
      date: readString(row['date']),
      attendance:
        attendanceRaw && typeof attendanceRaw === 'object'
          ? adaptAttendanceRecord(attendanceRaw)
          : null,
    };
  });
}

export function adaptStoredAttendance(raw: unknown): AttendanceRecord {
  const r = raw as { data?: unknown };
  return adaptAttendanceRecord(r.data ?? raw);
}
