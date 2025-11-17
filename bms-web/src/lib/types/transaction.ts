// Transaction types for the BMS system

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'QRIS';
export type TransactionType = 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'REFUND';

export interface TransactionItem {
  id: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  product: {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
    price: number;
    cost: number;
  };
}

export interface Transaction {
  id: string;
  transactionCode: string;
  totalAmount: number;
  discount: number;
  tax: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  status: TransactionStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  branch: {
    id: string;
    name: string;
    address?: string;
  };
  items: TransactionItem[];
}

export interface TransactionCreateItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
  branchId?: string;
}

export interface TransactionCreate {
  items: TransactionCreateItem[];
  totalAmount: number;
  discount?: number;
  tax?: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  notes?: string;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: TransactionStatus;
  branchId?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface TransactionStats {
  totalTransactions: number;
  totalRevenue: number;
  totalQuantity: number;
  avgTransactionValue: number;
  topProducts: Array<{
    productId: string;
    product: {
      id: string;
      name: string;
      sku: string;
    };
    _sum: {
      quantity: number;
      total: number;
    };
    _count: {
      productId: number;
    };
  }>;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TransactionAnalytics {
  dailySales: Array<{
    date: string;
    revenue: number;
    transactions: number;
    items: number;
  }>;
  paymentMethods: Array<{
    method: PaymentMethod;
    count: number;
    total: number;
  }>;
  branchPerformance: Array<{
    branchId: string;
    branchName: string;
    revenue: number;
    transactions: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    transactions: number;
    growth: number;
  }>;
}

export interface RefundRequest {
  transactionId: string;
  reason: string;
  refundItems?: Array<{
    itemId: string;
    quantity: number;
    refundAmount: number;
  }>;
  refundAmount: number;
  notes?: string;
}

export interface ReceiptData {
  transaction: Transaction;
  companyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  printDate: string;
  footerMessage?: string;
}

export interface TransactionSearch {
  query: string;
  type: 'code' | 'customer' | 'product' | 'all';
  filters?: {
    dateRange?: {
      start: string;
      end: string;
    };
    amountRange?: {
      min: number;
      max: number;
    };
  };
}