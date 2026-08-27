import {
  FinancialSummary,
  FinancialSummaryCards,
  QuickCategory,
  QuickMovementInput,
  QuickTransactionType,
  RecentTransaction,
  TransactionFlow,
} from '../models/financial-summary.model';

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function adaptCashTotalCard(raw: unknown) {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    amount: toNumber(r['amount']),
    cash: toNumber(r['cash']),
    digital: toNumber(r['digital']),
  };
}

function adaptSalesIncomeCard(raw: unknown) {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    amount: toNumber(r['amount']),
    growth: toNumber(r['growth']),
  };
}

function adaptMetricCard(raw: unknown) {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    amount: toNumber(r['amount']),
    description: toString(r['description']),
  };
}

function adaptCards(raw: unknown): FinancialSummaryCards {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    cashTotal: adaptCashTotalCard(r['cash_total']),
    salesIncome: adaptSalesIncomeCard(r['sales_income']),
    expenses: adaptMetricCard(r['expenses']),
    stockInvestment: adaptMetricCard(r['stock_investment']),
  };
}

function adaptTransactionFlow(value: unknown): TransactionFlow {
  return value === 'expense' ? 'expense' : 'income';
}

function adaptRecentTransaction(raw: unknown): RecentTransaction {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: r['id'] != null ? String(r['id']) : '',
    concept: toString(r['concept']),
    category: toString(r['category']),
    date: toString(r['date']),
    method: toString(r['method']),
    amount: toNumber(r['amount']),
    type: adaptTransactionFlow(r['type']),
  };
}

export function adaptFinancialSummary(raw: unknown): FinancialSummary {
  const r = (raw ?? {}) as Record<string, unknown>;
  const transactions = Array.isArray(r['recent_transactions'])
    ? r['recent_transactions'].map(adaptRecentTransaction)
    : [];

  return {
    cards: adaptCards(r['cards']),
    recentTransactions: transactions,
  };
}

function resolveCategoryLabel(category: QuickCategory): string {
  return category.name.trim() || 'Movimiento manual';
}

function mapQuickType(type: QuickTransactionType): 'INCOME' | 'EXPENSE' {
  return type === 'INCOME' ? 'INCOME' : 'EXPENSE';
}

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildQuickMovementFormData(input: QuickMovementInput): Record<string, unknown> {
  const today = todayIsoDate();
  return {
    type: mapQuickType(input.type),
    category: 'STORE',
    amount: input.amount,
    description: resolveCategoryLabel(input.category),
    date: today,
    paymentMethod: 'CASH',
    accountingMonth: today.slice(0, 7),
  };
}

export function formatPaymentMethod(method: string): string {
  const normalized = method.trim().toUpperCase();

  switch (normalized) {
    case 'CASH':
      return 'Efectivo';
    case 'YAPE':
      return 'Yape';
    case 'CARD':
      return 'Tarjeta';
    default:
      return method;
  }
}

export function categoryBadgeClass(category: string): string {
  const normalized = category.trim().toLowerCase();

  if (normalized.includes('venta') || normalized.includes('ingreso')) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }

  if (normalized.includes('gasto')) {
    return 'bg-red-50 text-red-700 ring-red-200';
  }

  return 'bg-gray-50 text-gray-700 ring-gray-200';
}

export function growthBadgeClass(growth: number): string {
  if (growth > 0) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }

  if (growth < 0) {
    return 'bg-red-50 text-red-700 ring-red-200';
  }

  return 'bg-gray-50 text-gray-600 ring-gray-200';
}

export function formatGrowthLabel(growth: number): string {
  if (growth > 0) {
    return `+${growth}%`;
  }

  return `${growth}%`;
}
