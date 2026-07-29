export interface SalesTotals {
  daily: number;
  weekly: number;
  monthly: number;
}

export interface TopProduct {
  name: string;
  totalSold: number;
  topVariantsLabel: string;
}

export interface LeastProduct {
  name: string;
  registrationDate: string;
  totalSold: number;
}

export interface FinancialChartData {
  labels: string[];
  sales: number[];
  expenses: number[];
}

export interface Financials {
  period: string;
  salesRevenue: number;
  costOfGoods: number;
  grossProfit: number;
  administrativeExpenses: number;
  storeExpenses: number;
  operatingExpenses: number;
  netUtility: number;
  chartData: FinancialChartData;
}

export interface MonthlyPaymentRow {
  dateLabel: string;
  sortMonth: string;
  cash: number;
  digital: number;
  monthlyTotal: number;
}

export interface AccountBalance {
  cash: number;
  digital: number;
  total: number;
}

export interface AccumulatedAccountRow {
  dateLabel: string;
  sortMonth: string;
  cash: number;
  digital: number;
  monthlyTotal: number;
  cashBalance: number;
  digitalBalance: number;
  totalBalance: number;
}

export interface ReportDashboard {
  totals: SalesTotals;
  topProducts: TopProduct[];
  leastProducts: LeastProduct[];
  financials: Financials;
  allTimeMonthlyReport: MonthlyPaymentRow[];
  accumulatedAccountMonthlyReport: AccumulatedAccountRow[];
  accumulatedAccountSummary: {
    opening: AccountBalance;
    current: AccountBalance;
  };
}

export const EMPTY_FINANCIAL_CHART: FinancialChartData = {
  labels: [],
  sales: [],
  expenses: [],
};

export const EMPTY_FINANCIALS: Financials = {
  period: '',
  salesRevenue: 0,
  costOfGoods: 0,
  grossProfit: 0,
  administrativeExpenses: 0,
  storeExpenses: 0,
  operatingExpenses: 0,
  netUtility: 0,
  chartData: EMPTY_FINANCIAL_CHART,
};

export const EMPTY_ACCOUNT_BALANCE: AccountBalance = {
  cash: 0,
  digital: 0,
  total: 0,
};

export const EMPTY_REPORT_DASHBOARD: ReportDashboard = {
  totals: { daily: 0, weekly: 0, monthly: 0 },
  topProducts: [],
  leastProducts: [],
  financials: EMPTY_FINANCIALS,
  allTimeMonthlyReport: [],
  accumulatedAccountMonthlyReport: [],
  accumulatedAccountSummary: {
    opening: { ...EMPTY_ACCOUNT_BALANCE },
    current: { ...EMPTY_ACCOUNT_BALANCE },
  },
};

export type DashboardTab = 'summary' | 'sales-history' | 'accumulated';
