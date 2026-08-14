import { DashboardMetrics, EMPTY_DASHBOARD_METRICS } from '../models/dashboard-home.model';

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const wrapped = raw as { data?: unknown };
  if (wrapped.data && typeof wrapped.data === 'object' && !Array.isArray(wrapped.data)) {
    return wrapped.data as Record<string, unknown>;
  }

  return raw as Record<string, unknown>;
}

function readNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function adaptDashboardMetrics(raw: unknown): DashboardMetrics {
  const record = asRecord(raw);

  return {
    todaySales: readNumber(record['todaySales'] ?? record['today_sales']),
    todaySalesAmount: readNumber(
      record['todaySalesAmount'] ?? record['today_sales_amount'],
    ),
    todayExpenses: readNumber(record['todayExpenses'] ?? record['today_expenses']),
    lowStockProducts: readNumber(
      record['lowStockProducts'] ?? record['low_stock_products'],
    ),
    pendingPurchases: readNumber(
      record['pendingPurchases'] ?? record['pending_purchases'],
    ),
    activeCustomers: readNumber(
      record['activeCustomers'] ?? record['active_customers'],
    ),
  };
}

export function emptyDashboardMetrics(): DashboardMetrics {
  return { ...EMPTY_DASHBOARD_METRICS };
}
