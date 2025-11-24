// Unified Type Definitions for BMS System
// This file provides a single source of truth for all type definitions,
// resolving conflicts between different type definition files.

import type {
  ApiResponse,
  PaginatedResponse,
  Product,
} from '@/types/api-responses';

// ===== TRANSACTION TYPES (Unified) =====

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'QRIS';
export type TransactionType = 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'REFUND';

// Transaction Item Interface
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

// Main Transaction Interface (Unified - resolves conflicts)
export interface UnifiedTransaction {
  id: string;
  // Unified property name - using transactionCode consistently
  transactionCode: string;
  
  // Core transaction data
  type: TransactionType;
  status: TransactionStatus;
  
  // Financial data
  totalAmount: number;
  discount: number;
  tax: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  
  // Optional fields
  notes?: string;
  customerId?: string;
  
  // Related entities
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
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Transaction Creation Interface
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
  customerId?: string;
  branchId?: string;
}

// Transaction Filters
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
  type?: TransactionType;
}

// Transaction Statistics
export interface TransactionStatsUnified {
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

// Paginated Transactions
export interface PaginatedTransactions {
  transactions: UnifiedTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Unified Transaction Analytics (resolves structure conflicts)
export interface UnifiedTransactionAnalytics {
  // Daily sales breakdown
  dailySales: Array<{
    date: string;
    revenue: number;
    transactions: number;
    items: number;
  }>;
  
  // Payment method statistics
  paymentMethods: Array<{
    method: PaymentMethod;
    count: number;
    total: number;
  }>;
  
  // Branch performance metrics
  branchPerformance: Array<{
    branchId: string;
    branchName: string;
    revenue: number;
    transactions: number;
  }>;
  
  // Monthly trends and growth
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    transactions: number;
    growth: number;
  }>;
  
  // Product performance
  productPerformance: Array<{
    product: Product;
    salesCount: number;
    revenue: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  
  // Category performance
  categoryPerformance: Array<{
    category: {
      id: string;
      name: string;
    };
    sales: number;
    revenue: number;
  }>;
  
  // Comparative analytics
  comparisons: {
    today: {
      sales: number;
      transactions: number;
      customers: number;
    };
    yesterday: {
      sales: number;
      transactions: number;
      customers: number;
    };
    thisWeek: {
      sales: number;
      transactions: number;
      customers: number;
    };
    lastWeek: {
      sales: number;
      transactions: number;
      customers: number;
    };
  };
}

// Refund Request Interface
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

// Receipt Data Interface
export interface ReceiptData {
  transaction: UnifiedTransaction;
  companyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  printDate: string;
  footerMessage?: string;
}

// Transaction Search Interface
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

// ===== API RESPONSE TYPES (Enhanced) =====

// Enhanced API Response for Transactions
export interface TransactionApiResponse<T = UnifiedTransaction | UnifiedTransaction[]> extends ApiResponse<T> {}

// Enhanced Paginated Response for Transactions
export interface TransactionPaginatedResponse extends PaginatedResponse<UnifiedTransaction> {}

// Enhanced Analytics Response
export interface TransactionAnalyticsResponse {
  success: boolean;
  data: {
    stats: TransactionStatsUnified;
    analytics: UnifiedTransactionAnalytics;
    charts: {
      dailySales: Array<{
        date: string;
        sales: number;
        transactions: number;
      }>;
      productPerformance: Array<{
        product: Product;
        sales: number;
        revenue: number;
      }>;
      categoryPerformance: Array<{
        category: {
          id: string;
          name: string;
        };
        sales: number;
        revenue: number;
      }>;
    };
  };
}

// ===== ERROR TYPES =====

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string;
  path: string;
}

// ===== WEBSOCKET TYPES =====

export interface BMSWebSocketEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
  source?: string;
}

export interface WebSocketMessage {
  event: string;
  payload: BMSWebSocketEvent;
}

// WebSocket Connection State
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

// ===== UTILITY TYPES =====

// Re-export commonly used types from other files for compatibility
export type { Product } from '@/types/api-responses';

// Legacy compatibility - deprecated, use UnifiedTransaction instead
export type LegacyTransaction = UnifiedTransaction;
export type LegacyTransactionAnalytics = UnifiedTransactionAnalytics;

// ===== TYPE GUARDS =====

export function isUnifiedTransaction(value: unknown): value is UnifiedTransaction {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'transactionCode' in value &&
    'status' in value
  );
}

export function isUnifiedTransactionAnalytics(value: unknown): value is UnifiedTransactionAnalytics {
  return (
    typeof value === 'object' &&
    value !== null &&
    'dailySales' in value &&
    'paymentMethods' in value
  );
}

// ===== MIGRATION HELPERS =====

/**
 * Migrate from legacy transaction format to unified format
 */
export function migrateTransaction(legacyTransaction: any): UnifiedTransaction {
  return {
    id: legacyTransaction.id,
    transactionCode: legacyTransaction.transactionCode || legacyTransaction.transactionNumber,
    type: legacyTransaction.type || 'SALE',
    status: legacyTransaction.status,
    totalAmount: legacyTransaction.totalAmount,
    discount: legacyTransaction.discount,
    tax: legacyTransaction.tax,
    finalAmount: legacyTransaction.finalAmount,
    paymentMethod: legacyTransaction.paymentMethod,
    amountPaid: legacyTransaction.amountPaid,
    change: legacyTransaction.change,
    notes: legacyTransaction.notes,
    customerId: legacyTransaction.customerId,
    user: legacyTransaction.user,
    branch: legacyTransaction.branch,
    items: legacyTransaction.items,
    createdAt: legacyTransaction.createdAt,
    updatedAt: legacyTransaction.updatedAt,
  };
}