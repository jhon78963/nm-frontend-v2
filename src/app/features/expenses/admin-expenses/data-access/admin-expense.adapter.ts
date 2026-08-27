import {
  AdminExpense,
  AdminExpenseCategory,
  AdminExpensePaymentMethod,
  AdminExpenseReport,
  PayrollPeriod,
} from '../models/admin-expense.model';

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function adaptPaymentMethod(raw: unknown): AdminExpensePaymentMethod {
  const method = String(raw ?? 'CASH').toUpperCase();
  if (method === 'YAPE' || method === 'CARD' || method === 'TRANSFER') {
    return method;
  }
  return 'CASH';
}

function adaptCategory(raw: unknown): AdminExpenseCategory {
  const category = String(raw ?? 'ADMINISTRATIVE').toUpperCase();
  return category === 'STORE' ? 'STORE' : 'ADMINISTRATIVE';
}

function adaptPayrollPeriod(raw: unknown): PayrollPeriod {
  if (raw === 'q1' || raw === 'q2') {
    return raw;
  }
  return null;
}

function adaptVoucherPaths(raw: Record<string, unknown>): string[] {
  const paths = raw['voucher_paths'] ?? raw['voucherPaths'];
  if (Array.isArray(paths)) {
    return paths.filter((path): path is string => typeof path === 'string' && path.length > 0);
  }

  const single = raw['voucher_path'] ?? raw['voucherPath'];
  if (typeof single === 'string' && single.length > 0) {
    return [single];
  }

  return [];
}

export function adaptAdminExpense(raw: Record<string, unknown>): AdminExpense {
  const method = adaptPaymentMethod(raw['method'] ?? raw['payment_method']);

  return {
    id: String(raw['id'] ?? ''),
    description: String(raw['description'] ?? ''),
    amount: toNumber(raw['amount']),
    date: String(raw['date'] ?? ''),
    method,
    category: adaptCategory(raw['category']),
    accountingMonth: String(raw['accounting_month'] ?? raw['accountingMonth'] ?? ''),
    payrollPeriod: adaptPayrollPeriod(raw['payroll_period'] ?? raw['payrollPeriod']),
    accountingPeriodLabel: String(
      raw['accounting_period_label'] ?? raw['accountingPeriodLabel'] ?? '—',
    ),
    voucherPaths: adaptVoucherPaths(raw),
  };
}

export function adaptAdminExpenseReport(raw: unknown): AdminExpenseReport {
  const envelope = raw as { data?: Record<string, unknown>; success?: boolean };
  const data = envelope?.data ?? (raw as Record<string, unknown>) ?? {};
  const expensesRaw = data['expenses'];

  // Nest monthly endpoint returns aggregate data (not individual expenses)
  // Map legacy { expenses[] } OR Nest aggregate { byCategory[], totalExpense }
  const expenses = Array.isArray(expensesRaw)
    ? expensesRaw.map((item) => adaptAdminExpense(item as Record<string, unknown>))
    : [];

  const totalAdmin = toNumber(
    data['total_monthly_admin'] ??
      data['totalMonthlyAdmin'] ??
      data['totalExpense'] ??
      data['total_expense'],
  );

  return {
    month: String(data['month'] ?? data['accountingMonth'] ?? ''),
    totalMonthlyAdmin: totalAdmin,
    expenses,
  };
}

export function formatYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function parseAccountingMonth(value: string): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export function formatMonthLabel(date: Date): string {
  const formatted = new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    year: 'numeric',
  }).format(date);
  return formatted.charAt(0).toLocaleUpperCase('es-PE') + formatted.slice(1);
}

export function formatPaymentDate(value: string): string {
  const parsed = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
}

export function getCategoryLabel(category: AdminExpenseCategory): string {
  return category === 'STORE' ? 'Operativo' : 'Administrativo';
}

export function getPaymentMethodLabel(method: AdminExpensePaymentMethod): string {
  switch (method) {
    case 'YAPE':
      return 'Yape / Plin';
    case 'CARD':
      return 'Tarjeta';
    case 'TRANSFER':
      return 'Transferencia';
    default:
      return 'Efectivo';
  }
}

export function paymentMethodBadgeClass(method: string): string {
  const normalized = method.toUpperCase();

  if (normalized.includes('CASH') || normalized.includes('EFECTIVO')) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }

  if (normalized.includes('YAPE') || normalized.includes('PLIN')) {
    return 'bg-purple-50 text-purple-700 ring-purple-200';
  }

  if (normalized.includes('CARD') || normalized.includes('TARJETA')) {
    return 'bg-blue-50 text-blue-700 ring-blue-200';
  }

  if (normalized.includes('TRANSFER')) {
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }

  return 'bg-gray-50 text-gray-600 ring-gray-200';
}

export function mimeTypeFromVoucherPath(path: string): string | null {
  const lower = path.trim().toLowerCase();

  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';

  return null;
}

export function ensureVoucherBlobType(blob: Blob, voucherPath: string): Blob {
  const mimeType = mimeTypeFromVoucherPath(voucherPath);
  if (!mimeType || blob.type === mimeType) {
    return blob;
  }

  return new Blob([blob], { type: mimeType });
}
