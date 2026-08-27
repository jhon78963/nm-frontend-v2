export type AttendanceStatus =
  | 'PUNTUAL'
  | 'TOLERANCIA'
  | 'TARDE'
  | 'FALTA'
  | 'FALTA_INJUSTIFICADA'
  | 'DESCANSO'
  | 'VACACIONES'
  | 'RECUPERACION'
  | 'VALDEO';

export type QuincenaView = 'full' | 'q1' | 'q2';

export interface AttendanceRecord {
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  delayMinutes: number;
  notes: string | null;
}

export interface AttendanceMonthResponse {
  records: Record<string, AttendanceRecord>;
}

export interface AttendancePayload {
  teamId: string;
  date: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  delayMinutes: number;
  notes: string;
}

export interface AttendanceDayRow {
  dateStr: string;
  day: number;
  weekdayLabel: string;
  weekday: number;
  isSunday: boolean;
  isValdeo: boolean;
  domingoTrabajoRecuperacion: boolean;
  status: AttendanceStatus;
  checkInTime: string;
  checkOutTime: string;
  delayMinutes: number;
  owedMinutes: number;
  note: string;
  saving: boolean;
  targetExitTimeStr: string;
  hasRecord: boolean;
}

export interface AttendanceStats {
  puntual: number;
  tolerancia: number;
  tarde: number;
  falta: number;
  faltaInjustificada: number;
  descanso: number;
  vacaciones: number;
  recuperacion: number;
  valdeo: number;
  domingosEnPeriodo: number;
  domingoTrabajoRecuperacion: number;
}

export interface DailyAttendanceRow {
  teamId: string;
  name: string;
  surname: string;
  date: string;
  attendance: AttendanceRecord | null;
}
