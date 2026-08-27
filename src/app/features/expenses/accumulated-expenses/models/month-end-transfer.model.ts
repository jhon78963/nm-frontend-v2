export interface MonthEndTransferPreview {
  month: string;
  monthLabel: string;
  operational: { cash: number; digital: number; total: number };
  suggested: { cash: number; digital: number; total: number };
  alreadyTransferred: boolean;
  existingTransfer: MonthEndTransferRecord | null;
  balances: {
    current: { cash: number; digital: number; total: number };
    afterSuggested: { cash: number; digital: number; total: number };
  };
}

export interface MonthEndTransferRecord {
  id: string;
  transferMonth: string;
  monthLabel: string;
  cashAmount: number;
  digitalAmount: number;
  totalAmount: number;
  operationalCashSnapshot: number;
  operationalDigitalSnapshot: number;
  note: string | null;
  createdAt: string | null;
}

export interface MonthEndTransferPayload {
  transfer_month: string;
  cash_amount: number;
  digital_amount: number;
  note?: string | null;
}

export interface MonthEndTransferFormModel {
  cashAmount: number;
  digitalAmount: number;
  note: string;
}

export interface MonthEndTransferResult {
  preview: MonthEndTransferPreview;
  settings: {
    cash_balance: number;
    digital_balance: number;
    current_cash: number;
    current_digital: number;
    current_total: number;
  };
}
