export type TransactionType = "income" | "expense" | "transfer";
export type TransactionSource = "manual" | "csv" | "plaid" | "sms" | "recurring";
export type AccountType = "bank" | "cash" | "credit";
export type CategoryType = "income" | "expense";
export type Frequency = "daily" | "weekly" | "monthly" | "yearly";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  type: CategoryType;
}

export interface Transaction {
  id: string;
  accountId: string;
  account?: Account;
  categoryId?: string;
  category?: Category;
  amount: number;
  type: TransactionType;
  description: string;
  date: string;
  source: TransactionSource;
  notes?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  category?: Category;
  month: number;
  year: number;
  amount: number;
  spent?: number;
}

export interface RecurringRule {
  id: string;
  accountId: string;
  account?: Account;
  categoryId?: string;
  category?: Category;
  amount: number;
  type: TransactionType;
  description: string;
  frequency: Frequency;
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
  active: boolean;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  month: number;
  year: number;
}
