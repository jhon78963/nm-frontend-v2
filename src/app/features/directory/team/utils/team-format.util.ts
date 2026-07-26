export const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

export const WEEKDAY_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

export const ATTENDANCE_STATUS_OPTIONS = [
  { label: 'Presente (puntual)', value: 'PUNTUAL' },
  { label: 'Presente (tolerancia 8:00–8:10)', value: 'TOLERANCIA' },
  { label: 'Tardanza', value: 'TARDE' },
  { label: 'Falta', value: 'FALTA' },
  { label: 'Falta injustificada (doble descuento)', value: 'FALTA_INJUSTIFICADA' },
  { label: 'Descanso', value: 'DESCANSO' },
  { label: 'Vacaciones', value: 'VACACIONES' },
  { label: 'Día recuperado', value: 'RECUPERACION' },
  { label: 'Valdeo (mensual)', value: 'VALDEO' },
] as const;

export const QUINCENA_OPTIONS = [
  { label: 'Mes completo', value: 'full' },
  { label: '1ª quincena (1–15)', value: 'q1' },
  { label: '2ª quincena (16–fin)', value: 'q2' },
] as const;

export const VALDEO_NTH_OPTIONS = [
  { label: 'Valdeo: 1.er miércoles', value: 1 },
  { label: 'Valdeo: 2.º miércoles', value: 2 },
] as const;

const STATUS_LABELS: Record<string, string> = {
  PUNTUAL: 'Puntual',
  TOLERANCIA: 'Presente (tolerancia)',
  TARDE: 'Tarde',
  FALTA: 'Falta',
  FALTA_INJUSTIFICADA: 'Falta injustificada',
  DESCANSO: 'Descanso',
  VACACIONES: 'Vacaciones',
  RECUPERACION: 'Día recuperado',
  VALDEO: 'Valdeo',
};

export function attendanceStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function attendanceStatusTone(
  status: string | null | undefined,
): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  if (!status) return 'neutral';
  const map: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
    PUNTUAL: 'success',
    TOLERANCIA: 'info',
    TARDE: 'warning',
    FALTA: 'danger',
    FALTA_INJUSTIFICADA: 'danger',
    DESCANSO: 'neutral',
    VACACIONES: 'neutral',
    RECUPERACION: 'success',
    VALDEO: 'info',
  };
  return map[status] ?? 'neutral';
}

export function formatMoney(n: number | null | undefined): string {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n ?? 0));
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toAccountingMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function parseAccountingMonth(value: string | null | undefined, fallback: Date): Date {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return fallback;
  }
  const [y, m] = value.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

export function formatDateTimeForApi(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

export function splitTimeLabel(block: {
  days: number;
  hours: number;
  minutes: number;
} | null | undefined): string {
  if (!block) return '—';
  const parts: string[] = [];
  if (block.days > 0) parts.push(`${block.days} día${block.days === 1 ? '' : 's'}`);
  if (block.hours > 0) parts.push(`${block.hours} h`);
  if (block.minutes > 0) parts.push(`${block.minutes} min`);
  return parts.length === 0 ? '0 min' : parts.join(' · ');
}

export function formatShortDate(ymd: string): string {
  const p = ymd.split('-').map(Number);
  if (p.length !== 3 || p.some((n) => Number.isNaN(n))) return ymd;
  const [y, m, d] = p;
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
