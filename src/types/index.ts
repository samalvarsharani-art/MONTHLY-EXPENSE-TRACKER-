export type StandardCategory =
  | 'Food'
  | 'Transport'
  | 'Rent'
  | 'Bills'
  | 'Shopping'
  | 'Entertainment'
  | 'Health'
  | 'Other';

export type ExpenseCategory = StandardCategory | string;

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  flag?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  monthlyBudget: number;
  currency: string; // e.g. "INR", "USD", "EUR"
  profileCompleted: boolean;
  createdAt: string;
  customCategories?: string[];
  photoURL?: string;
  isFirebaseUser?: boolean;
}

export interface Expense {
  id: string;
  userId: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export type PageView = 'auth' | 'profile-setup' | 'dashboard';
