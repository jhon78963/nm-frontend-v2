import {
  CashDailyReport,
  CashMovementItem,
  CashDailySummary,
  PaymentMethod,
} from '../models/cash-movement.model';

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function adaptMovementItem(raw: Record<string, unknown>): CashMovementItem {
  const method = String(raw['method'] ?? raw['payment_method'] ?? 'CASH');

  return {
    id: toNumber(raw['id']),
    time: String(raw['time'] ?? ''),
    description: String(raw['description'] ?? ''),
    method,
    amount: toNumber(raw['amount']),
    date: raw['date'] != null ? String(raw['date']) : undefined,
    payment_method: method as PaymentMethod,
  };
}

function adaptSummary(raw: Record<string, unknown> | null | undefined): CashDailySummary {
  const source = raw ?? {};

  return {
    openingBalance: toNumber(source['opening_balance'] ?? source['openingBalance']),
    finalBalance: toNumber(source['final_balance'] ?? source['finalBalance']),
    totalSales: toNumber(source['total_sales'] ?? source['totalSales']),
    totalIncomes: toNumber(source['total_incomes'] ?? source['totalIncomes']),
    totalExpenses: toNumber(source['total_expenses'] ?? source['totalExpenses']),
  };
}

export function adaptCashDailyReport(raw: unknown): CashDailyReport {
  const data = (raw as { data?: Record<string, unknown> })?.data ?? raw;
  const record = (data ?? {}) as Record<string, unknown>;
  const lists = (record['lists'] ?? {}) as Record<string, unknown>;

  const mapList = (items: unknown): CashMovementItem[] =>
    Array.isArray(items)
      ? items.map((item) => adaptMovementItem(item as Record<string, unknown>))
      : [];

  return {
    lists: {
      sales: mapList(lists['sales']),
      incomes: mapList(lists['incomes']),
      expenses: mapList(lists['expenses']),
    },
    summary: adaptSummary(record['summary'] as Record<string, unknown>),
  };
}

export function matchesPaymentFilter(
  method: string,
  filters: { cash: boolean; yape: boolean; card: boolean },
): boolean {
  const normalized = method.toUpperCase();

  if (normalized.includes('CASH') || normalized.includes('EFECTIVO')) {
    return filters.cash;
  }

  if (normalized.includes('YAPE') || normalized.includes('PLIN')) {
    return filters.yape;
  }

  if (normalized.includes('CARD') || normalized.includes('TARJETA')) {
    return filters.card;
  }

  return true;
}

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date: Date): string {
  const datePart = formatIsoDate(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${datePart} ${hours}:${minutes}:${seconds}`;
}

export function toDatetimeLocalValue(date: Date): string {
  const datePart = formatIsoDate(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${datePart}T${hours}:${minutes}`;
}

export function parseDatetimeLocalValue(value: string): Date {
  return new Date(value);
}

export function formatViewDate(date: Date): string {
  const weekday = new Intl.DateTimeFormat('es-PE', { weekday: 'long' }).format(date);
  const month = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(date);
  const day = String(date.getDate()).padStart(2, '0');
  const cap = (text: string) =>
    text.charAt(0).toLocaleUpperCase('es-PE') + text.slice(1);

  return `${cap(weekday)} ${day} de ${cap(month)}, ${date.getFullYear()}`;
}
