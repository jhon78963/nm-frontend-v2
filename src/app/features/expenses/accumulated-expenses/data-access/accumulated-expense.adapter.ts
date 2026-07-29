import {
  AccumulatedAccountSettings,
  AccumulatedExpense,
  AccumulatedExpenseReport,
  AccumulatedPaymentMethod,
} from '../models/accumulated-expense.model';
import {
  MonthEndTransferPreview,
  MonthEndTransferRecord,
} from '../models/month-end-transfer.model';

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function adaptPaymentMethod(raw: unknown): AccumulatedPaymentMethod {
  const method = String(raw ?? 'CASH').toUpperCase();
  if (method === 'YAPE' || method === 'CARD' || method === 'TRANSFER') {
    return method;
  }
  return 'CASH';
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

export function adaptAccumulatedExpense(raw: Record<string, unknown>): AccumulatedExpense {
  const method = adaptPaymentMethod(raw['method'] ?? raw['payment_method']);

  return {
    id: toNumber(raw['id']),
    description: String(raw['description'] ?? ''),
    amount: toNumber(raw['amount']),
    date: String(raw['date'] ?? ''),
    method,
    voucherPaths: adaptVoucherPaths(raw),
  };
}

export function adaptAccumulatedExpenseReport(raw: unknown): AccumulatedExpenseReport {
  const envelope = raw as { data?: Record<string, unknown>; success?: boolean };
  const data = envelope?.data ?? (raw as Record<string, unknown>) ?? {};
  const expensesRaw = data['expenses'];

  const expenses = Array.isArray(expensesRaw)
    ? expensesRaw.map((item) => adaptAccumulatedExpense(item as Record<string, unknown>))
    : [];

  return {
    month: String(data['month'] ?? ''),
    totalMonthlyAccumulated: toNumber(
      data['total_monthly_accumulated'] ?? data['totalMonthlyAccumulated'],
    ),
    expenses,
  };
}

export function adaptAccountSettings(raw: unknown): AccumulatedAccountSettings {
  const data = (raw as { data?: Record<string, unknown> })?.data ?? (raw as Record<string, unknown>) ?? {};

  return {
    cashBalance: toNumber(data['cash_balance'] ?? data['cashBalance']),
    digitalBalance: toNumber(data['digital_balance'] ?? data['digitalBalance']),
    initialCash: toNumber(data['initial_cash'] ?? data['initialCash']),
    initialDigital: toNumber(data['initial_digital'] ?? data['initialDigital']),
    isInitialized: Boolean(data['is_initialized'] ?? data['isInitialized']),
    trackingStartMonth:
      (data['tracking_start_month'] ?? data['trackingStartMonth'] ?? null) as string | null,
    currentCash: toNumber(data['current_cash'] ?? data['currentCash']),
    currentDigital: toNumber(data['current_digital'] ?? data['currentDigital']),
    currentTotal: toNumber(data['current_total'] ?? data['currentTotal']),
  };
}

export function adaptMonthEndTransferPreview(
  raw: Record<string, unknown> | null | undefined,
): MonthEndTransferPreview {
  const data = raw ?? {};
  const operational = (data['operational'] as Record<string, number>) ?? {};
  const suggested = (data['suggested'] as Record<string, number>) ?? {};
  const balances = (data['balances'] as Record<string, Record<string, number>>) ?? {};
  const current = balances['current'] ?? {};
  const afterSuggested = balances['after_suggested'] ?? balances['afterSuggested'] ?? {};

  const existingRaw = data['existing_transfer'] ?? data['existingTransfer'];

  return {
    month: String(data['month'] ?? ''),
    monthLabel: String(data['month_label'] ?? data['monthLabel'] ?? ''),
    operational: {
      cash: toNumber(operational['cash']),
      digital: toNumber(operational['digital']),
      total: toNumber(operational['total']),
    },
    suggested: {
      cash: toNumber(suggested['cash']),
      digital: toNumber(suggested['digital']),
      total: toNumber(suggested['total']),
    },
    alreadyTransferred: Boolean(data['already_transferred'] ?? data['alreadyTransferred']),
    existingTransfer: existingRaw
      ? adaptMonthEndTransferRecord(existingRaw as Record<string, unknown>)
      : null,
    balances: {
      current: {
        cash: toNumber(current['cash']),
        digital: toNumber(current['digital']),
        total: toNumber(current['total']),
      },
      afterSuggested: {
        cash: toNumber(afterSuggested['cash']),
        digital: toNumber(afterSuggested['digital']),
        total: toNumber(afterSuggested['total']),
      },
    },
  };
}

export function adaptMonthEndTransferRecord(
  raw: Record<string, unknown>,
): MonthEndTransferRecord {
  return {
    id: toNumber(raw['id']),
    transferMonth: String(raw['transferMonth'] ?? raw['transfer_month'] ?? ''),
    monthLabel: String(raw['monthLabel'] ?? raw['month_label'] ?? ''),
    cashAmount: toNumber(raw['cashAmount'] ?? raw['cash_amount']),
    digitalAmount: toNumber(raw['digitalAmount'] ?? raw['digital_amount']),
    totalAmount: toNumber(raw['totalAmount'] ?? raw['total_amount']),
    operationalCashSnapshot: toNumber(
      raw['operationalCashSnapshot'] ?? raw['operational_cash_snapshot'],
    ),
    operationalDigitalSnapshot: toNumber(
      raw['operationalDigitalSnapshot'] ?? raw['operational_digital_snapshot'],
    ),
    note: (raw['note'] as string | null) ?? null,
    createdAt: (raw['createdAt'] as string | null) ?? (raw['created_at'] as string | null) ?? null,
  };
}

export { formatMonthLabel, formatPaymentDate, formatYearMonth, paymentMethodBadgeClass } from '../../admin-expenses/data-access/admin-expense.adapter';
