export type AdminExpensePaymentMethod = 'CASH' | 'YAPE' | 'CARD' | 'TRANSFER';

export type AdminExpenseCategory = 'ADMINISTRATIVE' | 'STORE';

export type PayrollPeriod = 'q1' | 'q2' | null;

export interface AdminExpense {
  id: number;
  description: string;
  amount: number;
  date: string;
  method: AdminExpensePaymentMethod;
  category: AdminExpenseCategory;
  accountingMonth: string;
  payrollPeriod: PayrollPeriod;
  accountingPeriodLabel: string;
  voucherPaths: string[];
}

export interface AdminExpenseReport {
  month: string;
  totalMonthlyAdmin: number;
  expenses: AdminExpense[];
}

export interface AdminExpenseFormModel {
  category: AdminExpenseCategory;
  description: string;
  amount: number | null;
  date: string;
  accountingMonth: string;
  payrollPeriod: PayrollPeriod;
  paymentMethod: AdminExpensePaymentMethod;
}

export interface AdminExpensePayload {
  type: 'EXPENSE';
  category: AdminExpenseCategory;
  amount: number;
  description: string;
  date: string;
  accounting_month: string;
  payroll_period: PayrollPeriod;
  payment_method: AdminExpensePaymentMethod;
}

export const EMPTY_ADMIN_EXPENSE_REPORT: AdminExpenseReport = {
  month: '',
  totalMonthlyAdmin: 0,
  expenses: [],
};

export const ADMIN_EXPENSE_CATEGORY_OPTIONS: {
  label: string;
  value: AdminExpenseCategory;
  hint: string;
}[] = [
  {
    label: 'Administrativo',
    value: 'ADMINISTRATIVE',
    hint: 'Sueldos, servicios, hosting, etc.',
  },
  {
    label: 'Operativo de tienda',
    value: 'STORE',
    hint: 'Gastos varios de operación',
  },
];

export const ADMIN_PAYMENT_METHOD_OPTIONS: {
  label: string;
  value: AdminExpensePaymentMethod;
}[] = [
  { label: 'Efectivo', value: 'CASH' },
  { label: 'Yape / Plin', value: 'YAPE' },
  { label: 'Tarjeta', value: 'CARD' },
  { label: 'Transferencia', value: 'TRANSFER' },
];

export const PAYROLL_PERIOD_OPTIONS: {
  label: string;
  value: PayrollPeriod;
}[] = [
  { label: 'Sin cierre quincenal', value: null },
  { label: 'Cierre 1–15 del mes', value: 'q1' },
  { label: 'Cierre 16–fin de mes', value: 'q2' },
];
