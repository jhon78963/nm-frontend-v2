export type AccumulatedPaymentMethod = 'CASH' | 'YAPE' | 'CARD' | 'TRANSFER';

export interface AccumulatedExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  method: AccumulatedPaymentMethod;
  voucherPaths: string[];
}

export interface AccumulatedExpenseReport {
  month: string;
  totalMonthlyAccumulated: number;
  expenses: AccumulatedExpense[];
}

export interface AccumulatedExpenseFormModel {
  description: string;
  amount: number | null;
  date: string;
  paymentMethod: AccumulatedPaymentMethod;
}

export interface AccumulatedExpensePayload {
  type: 'EXPENSE';
  category: 'ACCUMULATED';
  amount: number;
  description: string;
  date: string;
  payment_method: AccumulatedPaymentMethod;
}

export interface AccumulatedAccountSettings {
  cashBalance: number;
  digitalBalance: number;
  initialCash: number;
  initialDigital: number;
  isInitialized: boolean;
  trackingStartMonth: string | null;
  currentCash: number;
  currentDigital: number;
  currentTotal: number;
}

export interface AccumulatedAccountInitPayload {
  initial_cash: number;
  initial_digital: number;
  tracking_start_month: string;
}

export interface AccumulatedAccountUpdatePayload {
  cash_balance: number;
  digital_balance: number;
  tracking_start_month: string | null;
}

export const EMPTY_ACCUMULATED_EXPENSE_REPORT: AccumulatedExpenseReport = {
  month: '',
  totalMonthlyAccumulated: 0,
  expenses: [],
};

export const ACCUMULATED_PAYMENT_METHOD_OPTIONS: {
  label: string;
  value: AccumulatedPaymentMethod;
}[] = [
  { label: 'Efectivo', value: 'CASH' },
  { label: 'Yape / Plin', value: 'YAPE' },
  { label: 'Tarjeta', value: 'CARD' },
  { label: 'Transferencia', value: 'TRANSFER' },
];

export const EMPTY_ACCOUNT_SETTINGS: AccumulatedAccountSettings = {
  cashBalance: 0,
  digitalBalance: 0,
  initialCash: 0,
  initialDigital: 0,
  isInitialized: false,
  trackingStartMonth: null,
  currentCash: 0,
  currentDigital: 0,
  currentTotal: 0,
};
