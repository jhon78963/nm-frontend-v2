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

function adaptPayments(raw: unknown): Array<{ method: string; amount: number }> | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  return raw
    .map((entry) => {
      const record = entry as Record<string, unknown>;
      const method = String(record['method'] ?? record['paymentMethod'] ?? '');
      const amount = toNumber(record['amount']);
      if (!method) {
        return null;
      }
      return { method, amount };
    })
    .filter((entry): entry is { method: string; amount: number } => entry !== null);
}

function adaptMovementItem(raw: Record<string, unknown>): CashMovementItem {
  const method = String(
    raw['paymentMethod'] ?? raw['method'] ?? raw['payment_method'] ?? 'CASH',
  );
  const payments = adaptPayments(raw['payments']);

  const dateRaw = raw['date'];
  const dateStr = dateRaw != null ? String(dateRaw) : undefined;
  const time = dateStr
    ? dateStr.includes('T')
      ? dateStr.slice(11, 16)
      : String(raw['time'] ?? '')
    : String(raw['time'] ?? '');

  return {
    id: String(raw['id'] ?? ''),
    time,
    description: String(raw['description'] ?? ''),
    method,
    amount: toNumber(raw['amount']),
    date: dateStr,
    payment_method: method as PaymentMethod,
    payments,
  };
}

function adaptSummary(raw: Record<string, unknown> | null | undefined): CashDailySummary {
  const source = raw ?? {};

  return {
    openingBalance: toNumber(source['openingBalance'] ?? source['opening_balance']),
    finalBalance: toNumber(
      source['closingBalance'] ?? source['finalBalance'] ?? source['final_balance'],
    ),
    totalSales: toNumber(source['totalSales'] ?? source['total_sales']),
    totalIncomes: toNumber(
      source['totalIncome'] ?? source['totalIncomes'] ?? source['total_incomes'],
    ),
    totalExpenses: toNumber(
      source['totalExpense'] ?? source['totalExpenses'] ?? source['total_expenses'],
    ),
  };
}

export function adaptCashDailyReport(raw: unknown): CashDailyReport {
  const data = (raw as { data?: Record<string, unknown> })?.data ?? raw;
  const record = (data ?? {}) as Record<string, unknown>;

  // Nest returns flat { date, openingBalance, totalIncome, totalExpense, closingBalance, movements[] }
  if ('movements' in record && Array.isArray(record['movements'])) {
    const movements = record['movements'] as Record<string, unknown>[];
    const sales = movements
      .filter((m) => m['type'] === 'INCOME' && String(m['category'] ?? '').toUpperCase() === 'STORE')
      .map(adaptMovementItem);
    const incomes = movements
      .filter(
        (m) =>
          m['type'] === 'INCOME' && String(m['category'] ?? '').toUpperCase() !== 'STORE',
      )
      .map(adaptMovementItem);
    const expenses = movements
      .filter((m) => m['type'] === 'EXPENSE')
      .map(adaptMovementItem);

    return {
      lists: { sales, incomes, expenses },
      summary: adaptSummary(record as Record<string, unknown>),
    };
  }

  // Legacy response shape: { data: { lists: {...}, summary: {...} } }
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

  if (normalized.includes('MIXED')) {
    return filters.cash || filters.yape || filters.card;
  }

  if (normalized.includes('CASH') || normalized.includes('EFECTIVO')) {
    return filters.cash;
  }

  if (normalized.includes('YAPE') || normalized.includes('PLIN')) {
    return filters.yape;
  }

  if (normalized.includes('CARD') || normalized.includes('TARJETA')) {
    return filters.card;
  }

  return filters.cash || filters.yape || filters.card;
}

function paymentMethodMatchesFilter(
  method: string,
  filters: { cash: boolean; yape: boolean; card: boolean },
): boolean {
  return matchesPaymentFilter(method, filters);
}

function resolveFilteredMethod(matchedPayments: Array<{ method: string; amount: number }>): string {
  const uniqueMethods = [...new Set(matchedPayments.map((payment) => payment.method))];
  if (uniqueMethods.length === 1) {
    return uniqueMethods[0];
  }
  return 'MIXED';
}

export function applyPaymentFiltersToSales(
  items: CashMovementItem[],
  filters: { cash: boolean; yape: boolean; card: boolean },
): CashMovementItem[] {
  return items.flatMap((item) => {
    if (!item.payments?.length) {
      return paymentMethodMatchesFilter(item.method, filters) ? [item] : [];
    }

    const matchedPayments = item.payments.filter((payment) =>
      paymentMethodMatchesFilter(payment.method, filters),
    );
    const amount = matchedPayments.reduce((sum, payment) => sum + payment.amount, 0);

    if (amount <= 0) {
      return [];
    }

    const method = resolveFilteredMethod(matchedPayments);

    return [
      {
        ...item,
        amount,
        method,
        payment_method: method as PaymentMethod,
      },
    ];
  });
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
