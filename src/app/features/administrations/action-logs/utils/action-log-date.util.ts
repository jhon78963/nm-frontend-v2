export type ActionLogDatePreset =
  | 'today'
  | 'last-7-days'
  | 'current-month'
  | 'previous-month';

export interface ActionLogDatePresetOption {
  id: ActionLogDatePreset;
  label: string;
}

export interface ActionLogDateRange {
  startDate: string;
  endDate: string;
}

export const ACTION_LOG_DATE_PRESETS: ActionLogDatePresetOption[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'last-7-days', label: 'Últimos 7 días' },
  { id: 'current-month', label: 'Este mes' },
  { id: 'previous-month', label: 'Mes anterior' },
];

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildActionLogDateRange(
  preset: ActionLogDatePreset,
): ActionLogDateRange {
  const now = new Date();

  if (preset === 'today') {
    const today = toIsoDate(now);
    return { startDate: today, endDate: today };
  }

  if (preset === 'last-7-days') {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return { startDate: toIsoDate(start), endDate: toIsoDate(now) };
  }

  if (preset === 'previous-month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function isDateRangeValid(startDate: string, endDate: string): boolean {
  if (!startDate && !endDate) return true;
  if (startDate && !isValidIsoDate(startDate)) return false;
  if (endDate && !isValidIsoDate(endDate)) return false;
  if (startDate && endDate && startDate > endDate) return false;
  return true;
}
