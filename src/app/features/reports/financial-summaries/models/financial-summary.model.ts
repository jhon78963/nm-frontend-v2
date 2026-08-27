export type QuickTransactionType = 'INCOME' | 'EXPENSE';

export type TransactionFlow = 'income' | 'expense';

export interface CashTotalCard {
  amount: number;
  cash: number;
  digital: number;
}

export interface SalesIncomeCard {
  amount: number;
  growth: number;
}

export interface MetricCard {
  amount: number;
  description: string;
}

export interface FinancialSummaryCards {
  cashTotal: CashTotalCard;
  salesIncome: SalesIncomeCard;
  expenses: MetricCard;
  stockInvestment: MetricCard;
}

export interface RecentTransaction {
  id: string;
  concept: string;
  category: string;
  date: string;
  method: string;
  amount: number;
  type: TransactionFlow;
}

export interface FinancialSummary {
  cards: FinancialSummaryCards;
  recentTransactions: RecentTransaction[];
}

export interface QuickCategory {
  id: string;
  name: string;
  icon: 'sale' | 'capital' | 'transport' | 'food' | 'store' | 'other';
}

export interface QuickTransactionFormModel {
  amount: number | null;
  categoryId: string | null;
}

export interface QuickMovementInput {
  type: QuickTransactionType;
  amount: number;
  category: QuickCategory;
}

export const EMPTY_FINANCIAL_SUMMARY: FinancialSummary = {
  cards: {
    cashTotal: { amount: 0, cash: 0, digital: 0 },
    salesIncome: { amount: 0, growth: 0 },
    expenses: { amount: 0, description: '' },
    stockInvestment: { amount: 0, description: '' },
  },
  recentTransactions: [],
};

export const INCOME_CATEGORIES: QuickCategory[] = [
  { id: 'income-sale', name: 'Venta', icon: 'sale' },
  { id: 'income-capital', name: 'Capital', icon: 'capital' },
];

export const EXPENSE_CATEGORIES: QuickCategory[] = [
  { id: 'expense-transport', name: 'Pasaje', icon: 'transport' },
  { id: 'expense-food', name: 'Comida', icon: 'food' },
  { id: 'expense-store', name: 'Puesto', icon: 'store' },
  { id: 'expense-other', name: 'Otros', icon: 'other' },
];
