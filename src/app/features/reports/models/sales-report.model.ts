export interface DailySaleRow {
  hour: string;
  quantity: number;
  total: number;
  cash: number;
  yape: number;
  card: number;
}

export interface DailySalesReport {
  date: string;
  dateIso: string;
  warehouseId: string;
  warehouseName: string;
  rows: DailySaleRow[];
  totals: {
    quantity: number;
    total: number;
    cash: number;
    yape: number;
    card: number;
  };
  summary: SalesReportSummary;
  paymentBreakdown: SalesPaymentBreakdown[];
  transactions: SalesDailyTransaction[];
}

export interface MonthlySaleRow {
  day: number;
  date: string;
  dayOfWeek: string;
  quantity: number;
  total: number;
  cash: number;
  yape: number;
  card: number;
}

export interface MonthlySalesReport {
  month: number;
  year: number;
  monthLabel: string;
  monthIso: string;
  warehouseId: string;
  warehouseName: string;
  rows: MonthlySaleRow[];
  totals: {
    quantity: number;
    total: number;
    cash: number;
    yape: number;
    card: number;
  };
  summary: SalesReportSummary & {
    averageDaily: number;
    daysWithSales: number;
  };
  paymentBreakdown: SalesPaymentBreakdown[];
  chartAmounts: number[];
  chartLabels: string[];
}

export interface PeriodSaleProductRow {
  name: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PeriodSaleRow {
  date: string;
  dateIso: string;
  dayOfWeek: string;
  quantity: number;
  total: number;
  cash: number;
  yape: number;
  card: number;
  products: PeriodSaleProductRow[];
}

export interface PeriodSalesReport {
  from: string;
  to: string;
  periodLabel: string;
  warehouseId: string;
  rows: PeriodSaleRow[];
  totals: {
    quantity: number;
    total: number;
    cash: number;
    yape: number;
    card: number;
  };
  summary: SalesReportSummary & {
    averageDaily: number;
    daysWithSales: number;
    daysInRange: number;
  };
}

export interface SalesReportFilters {
  date?: string;
  month?: number;
  year?: number;
  warehouseId?: string;
}

export interface SalesPeriodFilters {
  from: string;
  to: string;
  warehouseId?: string;
}

export interface SalesReportSummary {
  totalAmount: number;
  totalSales: number;
  totalStoreIncomes: number;
  transactionCount: number;
  itemsSold: number;
  averageTicket: number;
  cash: number;
  digital: number;
}

export interface SalesPaymentBreakdown {
  method: string;
  label: string;
  amount: number;
  count: number;
}

export interface SalesDailyTransaction {
  id: string;
  source: 'sale' | 'income';
  code: string;
  time: string;
  customer: string;
  description: string | null;
  itemsCount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentLabel: string;
}
