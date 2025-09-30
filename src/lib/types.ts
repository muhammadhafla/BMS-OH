

import type { ReactNode } from 'react';
import type { Timestamp, FieldValue } from 'firebase-admin/firestore';

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
export type SalaryType = 'Bulanan' | 'Per Jam';


export interface User {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  salaryType: SalaryType;
  baseSalary: number;
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

// Purchase Types
export interface PurchaseItem {
  id?: string;
  productName: string;
  quantity: number;
  purchasePrice: number; // Harga beli per unit untuk item ini
  total: number;
  sku?: string;
  unit: string;
}

export interface Purchase {
  id?: string;
  supplier: string;
  purchaseDate: Timestamp;
  items: PurchaseItem[];
  totalAmount: number;
  notes?: string;
}

export interface PurchaseHistory {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: Timestamp;
  supplier: string;
}

// Attendance Types
export interface AttendanceEntry {
  id?: string;
  employeeId: string;
  employeeName: string;
  clockIn: Timestamp | FieldValue;
  clockOut: Timestamp | FieldValue | null;
  status: 'Hadir' | 'Absen' | 'Izin' | string;
  location: string;
  photoIn?: string;
  photoOut?: string | null;
  // These are for client-side display only, not stored in DB
  date?: string; 
}

// Payroll Types
export interface PayrollEntry {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paidAmount: number;
  status: 'Belum Dibayar' | 'Dibayar Sebagian' | 'Lunas';
  paymentMethod: 'Tunai' | 'Transfer Bank' | 'Belum Dibayar';
}

// Messaging Types
export interface Conversation {
    id: string;
    participants: string[]; // Array of user IDs
    participantNames: { [key: string]: string };
    lastMessage: {
        text: string;
        timestamp: Timestamp;
        senderId: string;
    } | null;
    unreadCounts: { [key: string]: number };
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: Timestamp;
    readBy: string[]; // Array of user IDs who have read the message
}
