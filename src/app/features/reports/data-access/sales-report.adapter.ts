import {
  DailySaleRow,
  DailySalesReport,
  MonthlySaleRow,
  MonthlySalesReport,
  PeriodSaleRow,
  PeriodSalesReport,
  SalesDailyTransaction,
  SalesPaymentBreakdown,
  SalesReportSummary,
} from '../models/sales-report.model';

function readNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

interface PaymentSplit {
  cash: number;
  yape: number;
  card: number;
}

function buildPaymentSplit(breakdown: SalesPaymentBreakdown[]): PaymentSplit {
  let cash = 0;
  let yape = 0;
  let card = 0;

  for (const item of breakdown) {
    const method = item.method.toUpperCase();
    if (method === 'CASH') {
      cash += item.amount;
    } else if (method === 'CARD') {
      card += item.amount;
    } else if (
      method === 'YAPE' ||
      method === 'PLIN' ||
      method.includes('YAPE') ||
      method.includes('PLIN')
    ) {
      yape += item.amount;
    } else if (method === 'MIXTO') {
      yape += item.amount * 0.5;
      card += item.amount * 0.5;
    }
  }

  return {
    cash: round2(cash),
    yape: round2(yape),
    card: round2(card),
  };
}

function splitDigitalAmount(
  digitalAmount: number,
  breakdown: SalesPaymentBreakdown[],
): Pick<PaymentSplit, 'yape' | 'card'> {
  const split = buildPaymentSplit(breakdown);
  const digitalTotal = split.yape + split.card;

  if (digitalAmount <= 0 || digitalTotal <= 0) {
    return { yape: 0, card: 0 };
  }

  const ratioYape = split.yape / digitalTotal;
  return {
    yape: round2(digitalAmount * ratioYape),
    card: round2(digitalAmount * (1 - ratioYape)),
  };
}

function proportionalSplit(
  amount: number,
  breakdown: SalesPaymentBreakdown[],
): PaymentSplit {
  if (amount <= 0) {
    return { cash: 0, yape: 0, card: 0 };
  }

  const split = buildPaymentSplit(breakdown);
  const total = split.cash + split.yape + split.card;

  if (total <= 0) {
    return { cash: amount, yape: 0, card: 0 };
  }

  return {
    cash: round2((amount * split.cash) / total),
    yape: round2((amount * split.yape) / total),
    card: round2((amount * split.card) / total),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function adaptPaymentBreakdown(raw: unknown): SalesPaymentBreakdown[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      method: readString(row['method']),
      label: readString(row['label']),
      amount: readNumber(row['amount']),
      count: readNumber(row['count']),
    };
  });
}

function adaptSummary(raw: unknown): SalesReportSummary {
  const row = (raw ?? {}) as Record<string, unknown>;

  return {
    totalAmount: readNumber(row['total_amount'] ?? row['totalAmount']),
    totalSales: readNumber(row['total_sales'] ?? row['totalSales']),
    totalStoreIncomes: readNumber(
      row['total_store_incomes'] ?? row['totalStoreIncomes'],
    ),
    transactionCount: readNumber(
      row['transaction_count'] ?? row['transactionCount'],
    ),
    itemsSold: readNumber(row['items_sold'] ?? row['itemsSold']),
    averageTicket: readNumber(row['average_ticket'] ?? row['averageTicket']),
    cash: readNumber(row['cash']),
    digital: readNumber(row['digital']),
  };
}

function readId(value: unknown): string {
  return value != null ? String(value) : '';
}

function adaptDailyTransactions(raw: unknown): SalesDailyTransaction[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    const source = readString(row['source'], 'sale');

    return {
      id: readId(row['id']),
      source: source === 'income' ? 'income' : 'sale',
      code: readString(row['code']),
      time: readString(row['time']),
      customer: readString(row['customer'], 'Público General'),
      description: row['description'] != null ? readString(row['description']) : null,
      itemsCount: readNumber(row['items_count'] ?? row['itemsCount']),
      totalAmount: readNumber(row['total_amount'] ?? row['totalAmount']),
      paymentMethod: readString(row['payment_method'] ?? row['paymentMethod']),
      paymentLabel: readString(row['payment_label'] ?? row['paymentLabel']),
    };
  });
}

export function adaptDailySalesReport(raw: unknown, warehouseId = ''): DailySalesReport {
  const data = (raw as { data?: unknown })?.data ?? raw;
  const row = (data ?? {}) as Record<string, unknown>;
  const paymentBreakdown = adaptPaymentBreakdown(row['payment_breakdown']);
  const paymentSplit = buildPaymentSplit(paymentBreakdown);
  const hourly = (row['hourly_chart'] ?? {}) as Record<string, unknown>;
  const labels = Array.isArray(hourly['labels'])
    ? hourly['labels'].map((label) => readString(label))
    : [];
  const amounts = Array.isArray(hourly['amounts'])
    ? hourly['amounts'].map((amount) => readNumber(amount))
    : [];
  const counts = Array.isArray(hourly['counts'])
    ? hourly['counts'].map((count) => readNumber(count))
    : [];

  const rows: DailySaleRow[] = labels.map((hour, index) => {
    const total = amounts[index] ?? 0;
    const split = proportionalSplit(total, paymentBreakdown);

    return {
      hour,
      quantity: counts[index] ?? 0,
      total,
      cash: split.cash,
      yape: split.yape,
      card: split.card,
    };
  });

  const summary = adaptSummary(row['summary']);

  return {
    date: readString(row['date']),
    dateIso: readString(row['date_iso'] ?? row['dateIso']),
    warehouseId,
    warehouseName: warehouseId ? `Almacén ${warehouseId}` : 'Todos',
    rows,
    totals: {
      quantity: summary.transactionCount,
      total: summary.totalAmount,
      cash: paymentSplit.cash,
      yape: paymentSplit.yape,
      card: paymentSplit.card,
    },
    summary,
    paymentBreakdown,
    transactions: adaptDailyTransactions(row['sales']),
  };
}

export function adaptMonthlySalesReport(raw: unknown, warehouseId = ''): MonthlySalesReport {
  const data = (raw as { data?: unknown })?.data ?? raw;
  const row = (data ?? {}) as Record<string, unknown>;
  const paymentBreakdown = adaptPaymentBreakdown(row['payment_breakdown']);
  const paymentSplit = buildPaymentSplit(paymentBreakdown);
  const dailyBreakdown = Array.isArray(row['daily_breakdown']) ? row['daily_breakdown'] : [];
  const monthIso = readString(row['month_iso'] ?? row['monthIso'], '');
  const [yearPart, monthPart] = monthIso.split('-');

  const rows: MonthlySaleRow[] = dailyBreakdown.map((item, index) => {
    const dayRow = item as Record<string, unknown>;
    const digital = readNumber(dayRow['digital']);
    const digitalSplit = splitDigitalAmount(digital, paymentBreakdown);

    return {
      day: index + 1,
      date: readString(dayRow['date']),
      dayOfWeek: readString(dayRow['day_of_week'] ?? dayRow['dayOfWeek']),
      quantity: readNumber(dayRow['transactions']),
      total: readNumber(dayRow['total']),
      cash: readNumber(dayRow['cash']),
      yape: digitalSplit.yape,
      card: digitalSplit.card,
    };
  });

  const summaryRaw = adaptSummary(row['summary']);
  const summary = {
    ...summaryRaw,
    averageDaily: readNumber(
      (row['summary'] as Record<string, unknown> | undefined)?.['average_daily'],
    ),
    daysWithSales: readNumber(
      (row['summary'] as Record<string, unknown> | undefined)?.['days_with_sales'],
    ),
  };

  const chart = (row['daily_chart'] ?? {}) as Record<string, unknown>;

  return {
    month: readNumber(monthPart, new Date().getMonth() + 1),
    year: readNumber(yearPart, new Date().getFullYear()),
    monthLabel: readString(row['month_label'] ?? row['monthLabel']),
    monthIso,
    warehouseId,
    warehouseName: warehouseId ? `Almacén ${warehouseId}` : 'Todos',
    rows,
    totals: {
      quantity: summary.transactionCount,
      total: summary.totalAmount,
      cash: paymentSplit.cash,
      yape: paymentSplit.yape,
      card: paymentSplit.card,
    },
    summary,
    paymentBreakdown,
    chartLabels: Array.isArray(chart['labels'])
      ? chart['labels'].map((label) => readString(label))
      : rows.map((item) => item.date),
    chartAmounts: Array.isArray(chart['amounts'])
      ? chart['amounts'].map((amount) => readNumber(amount))
      : rows.map((item) => item.total),
  };
}

export function adaptPeriodSalesReport(raw: unknown, warehouseId = ''): PeriodSalesReport {
  const data = (raw as { data?: unknown })?.data ?? raw;
  const row = (data ?? {}) as Record<string, unknown>;
  const paymentBreakdown = adaptPaymentBreakdown(row['payment_breakdown']);
  const paymentSplit =
    paymentBreakdown.length > 0
      ? buildPaymentSplit(paymentBreakdown)
      : null;
  const dailyBreakdown = Array.isArray(row['daily_breakdown']) ? row['daily_breakdown'] : [];
  const summaryRaw = adaptSummary(row['summary']);

  const rows: PeriodSaleRow[] = dailyBreakdown.map((item) => {
    const dayRow = item as Record<string, unknown>;
    const digital = readNumber(dayRow['digital']);
    const digitalSplit = paymentSplit
      ? splitDigitalAmount(digital, paymentBreakdown)
      : { yape: digital, card: 0 };
    const dateLabel = readString(dayRow['date']);

    return {
      date: dateLabel,
      dateIso: parseDisplayDateToIso(dateLabel),
      dayOfWeek: readString(dayRow['day_of_week'] ?? dayRow['dayOfWeek']),
      quantity: readNumber(dayRow['transactions']),
      total: readNumber(dayRow['total']),
      cash: readNumber(dayRow['cash']),
      yape: digitalSplit.yape,
      card: digitalSplit.card,
      products: [],
    };
  });

  const summary = {
    ...summaryRaw,
    averageDaily: readNumber(
      (row['summary'] as Record<string, unknown> | undefined)?.['average_daily'],
    ),
    daysWithSales: readNumber(
      (row['summary'] as Record<string, unknown> | undefined)?.['days_with_sales'],
    ),
    daysInRange: readNumber(
      (row['summary'] as Record<string, unknown> | undefined)?.['days_in_range'],
    ),
  };

  const totalsSplit = paymentSplit ?? {
    cash: summaryRaw.cash,
    yape: summaryRaw.digital,
    card: 0,
  };

  return {
    from: readString(row['start_date'] ?? row['startDate']),
    to: readString(row['end_date'] ?? row['endDate']),
    periodLabel: readString(row['period_label'] ?? row['periodLabel']),
    warehouseId,
    rows,
    totals: {
      quantity: summary.transactionCount,
      total: summary.totalAmount,
      cash: totalsSplit.cash,
      yape: totalsSplit.yape,
      card: totalsSplit.card,
    },
    summary,
  };
}

export function mapDailyTransactionsToProducts(
  transactions: SalesDailyTransaction[],
): PeriodSaleRow['products'] {
  return transactions
    .filter((item) => item.source === 'sale')
    .map((item) => ({
      name: item.code,
      size: '—',
      color: item.paymentLabel,
      quantity: item.itemsCount,
      unitPrice: item.itemsCount > 0 ? item.totalAmount / item.itemsCount : item.totalAmount,
      subtotal: item.totalAmount,
    }));
}

function parseDisplayDateToIso(value: string): string {
  const parts = value.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }

  if (parts.length === 2) {
    const year = new Date().getFullYear();
    return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }

  return value;
}

export function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function firstDayOfMonthIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
