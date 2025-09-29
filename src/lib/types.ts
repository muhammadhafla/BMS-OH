
import type { ReactNode } from 'react';
import type { Timestamp } from 'firebase-admin/firestore';

export interface Module {
  name: string;
  description: string;
  href: string;
  icon: ReactNode;
}

// Firestore Data Structures

export interface Branch {
  id?: string;
  name: string;
  address: string;
}

export type UserRole = 'admin' | 'manager' | 'staff';

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  // ID cabang tempat pengguna ditugaskan
  branchId: string;
}

export interface Product {
  id?: string;
  name: string;
  sku: string;
  price: number; // Harga Jual
  hargaBeli: number; // Harga Beli
  stock: {
    [branchId: string]: number; // Stok per cabang
  };
  unit: string;
}

export type PaymentMethod = 'cash' | 'debit_card' | 'credit_card' | 'voucher';

export interface TransactionItem {
  productId: string;
  name: string;
  quantity: number;
  price: number; // Harga saat transaksi
  discount: number;
  total: number;
}

export interface Transaction {
  id?: string;
  branchId: string;
  cashierId: string;
  sessionId: string;
  items: TransactionItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  completedAt: Timestamp;
}

export interface CashDrawerSession {
  id?: string;
  branchId: string;
  cashierId: string;
  startAt: Timestamp;
  endAt?: Timestamp;
  initialCash: number;
  status: 'open' | 'closed';
}

export type CashDrawerActivityType = 'initial_cash' | 'cash_in' | 'cash_out' | 'end_of_shift';

export interface CashDrawerActivity {
  id?: string;
  sessionId: string;
  type: CashDrawerActivityType;
  amount: number;
  description: string;
  timestamp: Timestamp;
}

export interface ChartOfAccountsEntry {
  id?: string; // Account number, e.g., "1110"
  name: string; // Account name, e.g., "Cash"
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  description: string;
}
