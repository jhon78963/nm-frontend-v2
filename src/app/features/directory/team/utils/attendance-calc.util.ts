import {
  AttendanceDayRow,
  AttendanceRecord,
  AttendanceStats,
  AttendanceStatus,
  QuincenaView,
} from '../models/attendance.model';
import { toIsoDate, WEEKDAY_SHORT_ES } from './team-format.util';

export const SHIFT_DURATION_MINUTES = 11 * 60 + 30;
const DEBT_NOTE_PATTERN = /\s*\[Debe:[^\]]+\]/g;

export function nthWednesdayOfMonth(year: number, month: number, nth: 1 | 2): Date {
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(year, month, d);
    if (dt.getMonth() !== month) break;
    if (dt.getDay() === 3) {
      count++;
      if (count === nth) return dt;
    }
  }
  return new Date(year, month, 1);
}

export function quincenaDayRange(
  viewMonth: number,
  viewYear: number,
  quincenaView: QuincenaView,
): { start: number; end: number } {
  const last = new Date(viewYear, viewMonth + 1, 0).getDate();
  if (quincenaView === 'q1') return { start: 1, end: 15 };
  if (quincenaView === 'q2') return { start: 16, end: last };
  return { start: 1, end: last };
}

export function defaultMorningTime(): string {
  return '08:00';
}

export function showTimesForStatus(status: AttendanceStatus): boolean {
  return (
    status === 'PUNTUAL' ||
    status === 'TARDE' ||
    status === 'TOLERANCIA' ||
    status === 'RECUPERACION'
  );
}

export function formatOwedHuman(totalMinutes: number): string {
  const n = Math.max(0, Math.floor(totalMinutes));
  if (n === 0) return '';
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const period = h >= 12 ? 'p. m.' : 'a. m.';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function addMinutesToTime(time24: string, minutes: number): string {
  const [hStr, mStr] = time24.split(':');
  const base = new Date();
  base.setHours(Number(hStr), Number(mStr) || 0, 0, 0);
  const target = new Date(base.getTime() + minutes * 60_000);
  return `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;
}

function minutesBetween(startTime24: string, endTime24: string): number {
  const [sh, sm] = startTime24.split(':').map(Number);
  const [eh, em] = endTime24.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return Math.max(0, end - start);
}

function syncOwedMinutesNote(row: AttendanceDayRow): void {
  const base = (row.note || '').replace(DEBT_NOTE_PATTERN, '').trimEnd();
  if (row.owedMinutes > 0) {
    const debt = formatOwedHuman(row.owedMinutes);
    row.note = base ? `${base} [Debe: ${debt}]` : `[Debe: ${debt}]`;
  } else {
    row.note = base;
  }
}

export function calculateDelayForRow(
  row: AttendanceDayRow,
  autoStatusFromTime = true,
): void {
  row.targetExitTimeStr = '';
  row.owedMinutes = 0;

  const usesEntryRules =
    row.status === 'PUNTUAL' ||
    row.status === 'TARDE' ||
    row.status === 'TOLERANCIA';

  if (row.checkInTime && usesEntryRules) {
    const limit = '08:00';
    const toleranceEnd = '08:10';

    if (row.checkInTime <= limit) {
      row.delayMinutes = 0;
      if (autoStatusFromTime) row.status = 'PUNTUAL';
    } else if (row.checkInTime <= toleranceEnd) {
      row.delayMinutes = minutesBetween(limit, row.checkInTime);
      if (autoStatusFromTime) row.status = 'TOLERANCIA';
    } else {
      row.delayMinutes = minutesBetween(limit, row.checkInTime);
      if (autoStatusFromTime) row.status = 'TARDE';
    }
  } else if (!row.checkInTime && usesEntryRules) {
    row.delayMinutes = 0;
  } else if (!usesEntryRules) {
    row.delayMinutes = 0;
  }

  const usesShiftExit =
    row.status === 'PUNTUAL' ||
    row.status === 'TARDE' ||
    row.status === 'TOLERANCIA' ||
    row.status === 'RECUPERACION';

  if (row.checkInTime && usesShiftExit) {
    const targetExit = addMinutesToTime(row.checkInTime, SHIFT_DURATION_MINUTES);
    row.targetExitTimeStr = formatTime12h(targetExit);

    if (row.checkOutTime && row.checkOutTime < targetExit) {
      row.owedMinutes = minutesBetween(row.checkOutTime, targetExit);
    }
  }

  syncOwedMinutesNote(row);
}

export function applyRecordToRow(
  row: AttendanceDayRow,
  record: AttendanceRecord | undefined,
): void {
  if (!record) {
    row.hasRecord = false;
    if (row.isSunday) {
      row.status = 'DESCANSO';
      row.checkInTime = '';
      row.checkOutTime = '';
    } else {
      row.status = 'PUNTUAL';
      row.checkInTime = defaultMorningTime();
      row.checkOutTime = '';
    }
    row.note = '';
    row.delayMinutes = 0;
    row.owedMinutes = 0;
    row.targetExitTimeStr = '';
    calculateDelayForRow(row, false);
    return;
  }

  row.hasRecord = true;
  row.status = record.status;
  row.note = record.notes || '';
  row.checkInTime = normalizeTime(record.checkInTime);
  row.checkOutTime = normalizeTime(record.checkOutTime);
  row.delayMinutes = record.delayMinutes || 0;
  calculateDelayForRow(row, false);
}

function normalizeTime(value: string | null): string {
  if (!value) return '';
  return value.length > 5 ? value.slice(0, 5) : value;
}

export function buildMonthRows(params: {
  viewMonth: number;
  viewYear: number;
  valdeoWednesdayNth: 1 | 2;
  attendanceCache: Record<string, AttendanceRecord>;
  domingoRecuperaMap: Record<string, boolean>;
}): AttendanceDayRow[] {
  const { viewMonth, viewYear, valdeoWednesdayNth, attendanceCache, domingoRecuperaMap } =
    params;
  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const valdeoDate = nthWednesdayOfMonth(viewYear, viewMonth, valdeoWednesdayNth);
  const valdeoStr = toIsoDate(valdeoDate);
  const rows: AttendanceDayRow[] = [];

  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(viewYear, viewMonth, d);
    const dateStr = toIsoDate(date);
    const wd = date.getDay();
    const isSunday = wd === 0;
    const isValdeo = dateStr === valdeoStr;

    let record = attendanceCache[dateStr];
    if (!record) {
      record = attendanceCache[`${dateStr} 00:00:00`];
    }

    const row: AttendanceDayRow = {
      dateStr,
      day: d,
      weekdayLabel: WEEKDAY_SHORT_ES[wd],
      weekday: wd,
      isSunday,
      isValdeo,
      domingoTrabajoRecuperacion: !!domingoRecuperaMap[dateStr],
      status: 'PUNTUAL',
      checkInTime: '',
      checkOutTime: '',
      delayMinutes: 0,
      owedMinutes: 0,
      note: '',
      saving: false,
      targetExitTimeStr: '',
      hasRecord: false,
    };

    applyRecordToRow(row, record);
    rows.push(row);
  }

  return rows;
}

export function recalcStats(params: {
  viewMonth: number;
  viewYear: number;
  quincenaView: QuincenaView;
  attendanceCache: Record<string, AttendanceRecord>;
  domingoRecuperaMap: Record<string, boolean>;
}): AttendanceStats {
  const { viewMonth, viewYear, quincenaView, attendanceCache, domingoRecuperaMap } = params;
  const { start, end } = quincenaDayRange(viewMonth, viewYear, quincenaView);

  const stats: AttendanceStats = {
    puntual: 0,
    tolerancia: 0,
    tarde: 0,
    falta: 0,
    faltaInjustificada: 0,
    descanso: 0,
    vacaciones: 0,
    recuperacion: 0,
    valdeo: 0,
    domingosEnPeriodo: 0,
    domingoTrabajoRecuperacion: 0,
  };

  for (let d = start; d <= end; d++) {
    if (new Date(viewYear, viewMonth, d).getDay() === 0) {
      stats.domingosEnPeriodo++;
    }
  }

  for (const key of Object.keys(attendanceCache)) {
    const dayKey = key.includes(' ') ? key.slice(0, 10) : key;
    const parts = dayKey.split('-').map(Number);
    if (parts.length < 3) continue;
    const [y, m, dom] = parts;
    if (y !== viewYear || m !== viewMonth + 1) continue;
    if (dom < start || dom > end) continue;

    const st = attendanceCache[key]?.status;
    if (st === 'PUNTUAL') stats.puntual++;
    else if (st === 'TOLERANCIA') stats.tolerancia++;
    else if (st === 'TARDE') stats.tarde++;
    else if (st === 'FALTA') stats.falta++;
    else if (st === 'FALTA_INJUSTIFICADA') stats.faltaInjustificada++;
    else if (st === 'DESCANSO') stats.descanso++;
    else if (st === 'VACACIONES') stats.vacaciones++;
    else if (st === 'RECUPERACION') stats.recuperacion++;
    else if (st === 'VALDEO') stats.valdeo++;
  }

  for (let d = start; d <= end; d++) {
    const dt = new Date(viewYear, viewMonth, d);
    if (dt.getDay() !== 0) continue;
    const ds = toIsoDate(dt);
    const flagged = !!domingoRecuperaMap[ds];
    let rec = attendanceCache[ds] ?? attendanceCache[`${ds} 00:00:00`];
    const worked =
      rec &&
      ['PUNTUAL', 'TARDE', 'TOLERANCIA', 'RECUPERACION'].includes(rec.status);
    if (flagged || worked) stats.domingoTrabajoRecuperacion++;
  }

  return stats;
}

export function domingoRecuperaStorageKey(
  teamId: number,
  viewYear: number,
  viewMonth: number,
): string {
  return `nm-domingo-recupera-${teamId}-${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
}

export function valdeoNthStorageKey(viewYear: number, viewMonth: number): string {
  return `nm-valdeo-nth-${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
}

export function quincenaViewStorageKey(
  teamId: number,
  viewYear: number,
  viewMonth: number,
): string {
  return `nm-quincena-view-${teamId}-${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
}

export function readLocalStorageMap(key: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}
