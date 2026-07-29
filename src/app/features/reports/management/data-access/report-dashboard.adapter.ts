import {
  AccountBalance,
  AccumulatedAccountRow,
  EMPTY_ACCOUNT_BALANCE,
  EMPTY_FINANCIAL_CHART,
  EMPTY_FINANCIALS,
  EMPTY_REPORT_DASHBOARD,
  FinancialChartData,
  Financials,
  LeastProduct,
  MonthlyPaymentRow,
  ReportDashboard,
  SalesTotals,
  TopProduct,
} from '../models/report-dashboard.model';

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function adaptAccountBalance(raw: unknown): AccountBalance {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    cash: toNumber(r['cash']),
    digital: toNumber(r['digital']),
    total: toNumber(r['total']),
  };
}

function adaptSalesTotals(raw: unknown): SalesTotals {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    daily: toNumber(r['daily']),
    weekly: toNumber(r['weekly']),
    monthly: toNumber(r['monthly']),
  };
}

function adaptTopProduct(raw: unknown): TopProduct {
  const r = raw as Record<string, unknown>;
  const colorRaw = String(r['color'] ?? '');
  const topVariantsLabel = colorRaw.startsWith('Top: ')
    ? colorRaw.slice(5)
    : colorRaw;

  return {
    name: String(r['name'] ?? ''),
    totalSold: toNumber(r['total_sold'] ?? r['totalSold']),
    topVariantsLabel,
  };
}

function adaptLeastProduct(raw: unknown): LeastProduct {
  const r = raw as Record<string, unknown>;
  return {
    name: String(r['name'] ?? ''),
    registrationDate: String(
      r['registration_date'] ?? r['registrationDate'] ?? '—',
    ),
    totalSold: toNumber(r['total_sold'] ?? r['totalSold']),
  };
}

function adaptChartData(raw: unknown): FinancialChartData {
  const r = (raw ?? {}) as Record<string, unknown>;
  const labels = Array.isArray(r['labels'])
    ? r['labels'].map((label) => String(label))
    : [];
  const sales = Array.isArray(r['sales'])
    ? r['sales'].map((value) => toNumber(value))
    : [];
  const expenses = Array.isArray(r['expenses'])
    ? r['expenses'].map((value) => toNumber(value))
    : [];

  return { labels, sales, expenses };
}

function adaptFinancials(raw: unknown): Financials {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    period: String(r['period'] ?? ''),
    salesRevenue: toNumber(r['sales_revenue'] ?? r['salesRevenue']),
    costOfGoods: toNumber(r['cost_of_goods'] ?? r['costOfGoods']),
    grossProfit: toNumber(r['gross_profit'] ?? r['grossProfit']),
    administrativeExpenses: toNumber(
      r['administrative_expenses'] ?? r['administrativeExpenses'],
    ),
    storeExpenses: toNumber(r['store_expenses'] ?? r['storeExpenses']),
    operatingExpenses: toNumber(
      r['operating_expenses'] ?? r['operatingExpenses'],
    ),
    netUtility: toNumber(r['net_utility'] ?? r['netUtility']),
    chartData: adaptChartData(r['chart_data'] ?? r['chartData']),
  };
}

function adaptMonthlyPaymentRow(raw: unknown): MonthlyPaymentRow {
  const r = raw as Record<string, unknown>;
  return {
    dateLabel: String(r['fecha'] ?? r['dateLabel'] ?? ''),
    sortMonth: String(r['sort_month'] ?? r['sortMonth'] ?? ''),
    cash: toNumber(r['efectivo'] ?? r['cash']),
    digital: toNumber(r['bancos'] ?? r['digital']),
    monthlyTotal: toNumber(r['total_mensual'] ?? r['monthlyTotal']),
  };
}

function adaptAccumulatedAccountRow(raw: unknown): AccumulatedAccountRow {
  const r = raw as Record<string, unknown>;
  return {
    dateLabel: String(r['fecha'] ?? r['dateLabel'] ?? ''),
    sortMonth: String(r['sort_month'] ?? r['sortMonth'] ?? ''),
    cash: toNumber(r['efectivo'] ?? r['cash']),
    digital: toNumber(r['bancos'] ?? r['digital']),
    monthlyTotal: toNumber(r['total_mensual'] ?? r['monthlyTotal']),
    cashBalance: toNumber(r['saldo_efectivo'] ?? r['cashBalance']),
    digitalBalance: toNumber(r['saldo_bancos'] ?? r['digitalBalance']),
    totalBalance: toNumber(r['saldo_total'] ?? r['totalBalance']),
  };
}

export function adaptReportDashboard(raw: unknown): ReportDashboard {
  const envelope = raw as { data?: Record<string, unknown>; success?: boolean };
  const data = envelope?.data ?? (raw as Record<string, unknown>) ?? {};

  const topProductsRaw = data['top_products'] ?? data['topProducts'];
  const leastProductsRaw = data['least_products'] ?? data['leastProducts'];
  const allTimeRaw =
    data['all_time_monthly_report'] ?? data['allTimeMonthlyReport'];
  const accumulatedRaw =
    data['accumulated_account_monthly_report'] ??
    data['accumulatedAccountMonthlyReport'];
  const summaryRaw =
    data['accumulated_account_summary'] ?? data['accumulatedAccountSummary'];

  const summary = (summaryRaw ?? {}) as Record<string, unknown>;

  return {
    totals: adaptSalesTotals(data['totals']),
    topProducts: Array.isArray(topProductsRaw)
      ? topProductsRaw.map(adaptTopProduct)
      : [],
    leastProducts: Array.isArray(leastProductsRaw)
      ? leastProductsRaw.map(adaptLeastProduct)
      : [],
    financials: adaptFinancials(data['financials']),
    allTimeMonthlyReport: Array.isArray(allTimeRaw)
      ? allTimeRaw.map(adaptMonthlyPaymentRow)
      : [],
    accumulatedAccountMonthlyReport: Array.isArray(accumulatedRaw)
      ? accumulatedRaw.map(adaptAccumulatedAccountRow)
      : [],
    accumulatedAccountSummary: {
      opening: adaptAccountBalance(summary['opening']),
      current: adaptAccountBalance(summary['current']),
    },
  };
}

export function formatYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatMonthLabel(date: Date): string {
  const formatted = new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    year: 'numeric',
  }).format(date);
  return formatted.charAt(0).toLocaleUpperCase('es-PE') + formatted.slice(1);
}

export function monthDateRange(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    start: formatIsoDate(start),
    end: formatIsoDate(end),
  };
}

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface ChartPoint {
  x: number;
  y: number;
}

export interface LineChartGeometry {
  width: number;
  height: number;
  salesPoints: ChartPoint[];
  expensePoints: ChartPoint[];
  maxValue: number;
}

export function buildLineChartGeometry(
  chartData: FinancialChartData,
  width = 640,
  height = 220,
  padding = 24,
): LineChartGeometry {
  const count = chartData.labels.length;
  if (count === 0) {
    return {
      width,
      height,
      salesPoints: [],
      expensePoints: [],
      maxValue: 0,
    };
  }

  const maxValue = Math.max(
    ...chartData.sales,
    ...chartData.expenses,
    1,
  );

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const toPoint = (value: number, index: number): ChartPoint => ({
    x: padding + (count <= 1 ? innerWidth / 2 : (index / (count - 1)) * innerWidth),
    y: padding + innerHeight - (value / maxValue) * innerHeight,
  });

  return {
    width,
    height,
    salesPoints: chartData.sales.map(toPoint),
    expensePoints: chartData.expenses.map(toPoint),
    maxValue,
  };
}

export function pointsToPolyline(points: ChartPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

export {
  EMPTY_ACCOUNT_BALANCE,
  EMPTY_FINANCIAL_CHART,
  EMPTY_FINANCIALS,
  EMPTY_REPORT_DASHBOARD,
};
