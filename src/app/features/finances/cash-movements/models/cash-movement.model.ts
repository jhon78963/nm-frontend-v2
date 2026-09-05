export type PaymentMethod = 'CASH' | 'YAPE' | 'CARD';

export type MovementType = 'INCOME' | 'EXPENSE';

export type MovementCategory = 'STORE' | 'ADMINISTRATIVE' | 'ACCUMULATED';

export interface CashMovementItem {
  id: string;
  time: string;
  description: string;
  method: string;
  amount: number;
  date?: string;
  payment_method?: string;
  payments?: Array<{ method: string; amount: number }>;
}

export interface CashDailySummary {
  openingBalance: number;
  finalBalance: number;
  totalSales: number;
  totalIncomes: number;
  totalExpenses: number;
}

export interface CashDailyLists {
  sales: CashMovementItem[];
  incomes: CashMovementItem[];
  expenses: CashMovementItem[];
}

export interface CashDailyReport {
  lists: CashDailyLists;
  summary: CashDailySummary;
}

export interface MovementFormModel {
  description: string;
  amount: number | null;
  date: string;
  paymentMethod: PaymentMethod;
}

export interface MovementPayload {
  type: MovementType;
  category: MovementCategory;
  amount: number;
  description: string;
  date: string;
  payment_method: PaymentMethod;
}

export interface PaymentMethodFilter {
  cash: boolean;
  yape: boolean;
  card: boolean;
}

export const DEFAULT_PAYMENT_FILTERS: PaymentMethodFilter = {
  cash: true,
  yape: true,
  card: true,
};

export const EMPTY_CASH_DAILY_REPORT: CashDailyReport = {
  lists: { sales: [], incomes: [], expenses: [] },
  summary: {
    openingBalance: 0,
    finalBalance: 0,
    totalSales: 0,
    totalIncomes: 0,
    totalExpenses: 0,
  },
};

export const QUICK_EXPENSE_PRESETS = [
  { label: 'Pasaje', icon: 'car', amount: 7 },
  { label: 'Almuerzo', icon: 'food', amount: 10 },
  { label: 'Vigilancia', icon: 'shield', amount: 1 },
] as const;

export const PAYMENT_METHOD_OPTIONS: { label: string; value: PaymentMethod }[] = [
  { label: 'Efectivo', value: 'CASH' },
  { label: 'Yape / Plin', value: 'YAPE' },
  { label: 'Tarjeta', value: 'CARD' },
];
