// Comprehensive API Response Types for BMS Web Application

// Generic API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  message?: string;
}

// Auth Types
export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  };
  message?: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  roleDistribution: Record<string, number>;
}

// API Response wrapper for UserStats
export interface UserStatsResponse {
  success: boolean;
  data: UserStats;
  message?: string;
}

// API Response wrapper for TransactionStats
export interface TransactionStatsResponse {
  success: boolean;
  data: TransactionStats;
  message?: string;
}

// Low Stock Products Response
export interface LowStockProductsResponse {
  success: boolean;
  data: Product[];
  message?: string;
}

// Branch Types
export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  managerId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchListResponse extends PaginatedResponse<Branch> {}

export interface BranchStats {
  totalBranches: number;
  activeBranches: number;
  branchComparison: Array<{
    branch: Branch;
    stats: {
      products: number;
      transactions: number;
      revenue: number;
    };
  }>;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  code?: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branchId?: string;
  parent?: Category;
  children?: Category[];
  products?: Product[];
  branch?: Branch;
}

export interface CategoryTreeNode extends Category {
  productCount: number;
  children?: CategoryTreeNode[];
}

export interface CategoryStats {
  directProductsCount: number;
  totalProductsCount: number;
  totalStock: number;
  lowStockCount: number;
  descendantCategoriesCount: number;
}

export interface CategoryListResponse extends PaginatedResponse<Category> {}

export interface CategoryTreeResponse {
  success: boolean;
  data: {
    tree: CategoryTreeNode[];
  };
}

export interface CategoryDetailResponse {
  success: boolean;
  data: {
    category: Category;
  };
}

export interface CategoryStatsResponse {
  success: boolean;
  data: CategoryStats;
}

export interface BulkUpdateResponse {
  success: boolean;
  data: {
    updatedCount: number;
  };
  message: string;
}

export interface CategoryImportResult {
  success: Array<{
    row: number;
    name: string;
    code?: string;
    id: string;
  }>;
  errors: Array<{
    row: number;
    error: string;
    name?: string;
  }>;
  total: number;
  created: number;
  skipped: number;
  failed: number;
}

export interface CategoryImportResponse {
  success: boolean;
  data: CategoryImportResult;
  message: string;
}

// Product Types
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  barcode?: string;
  unit: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  maxStock: number;
  isActive: boolean;
  categoryId: string;
  branchId?: string;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
  };
  branch?: {
    id: string;
    name: string;
  };
}

export interface ProductListResponse extends PaginatedResponse<Product> {}

// Supplier Types
export interface Supplier {
  id: string;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  paymentTerms?: string;
  creditLimit?: number;
  currency?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListResponse extends PaginatedResponse<Supplier> {}

export interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  newSuppliersThisMonth: number;
  topSuppliersByVolume: Array<{
    supplier: Supplier;
    totalValue: number;
    orderCount: number;
  }>;
}

// Transaction Types
export interface Transaction {
  id: string;
  transactionNumber: string;
  type: 'SALE' | 'RETURN' | 'REFUND' | 'EXCHANGE';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  customerId?: string;
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
  items: Array<{
    productId: string;
    product: Product;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paidAmount: number;
  change: number;
  notes?: string;
  branchId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionListResponse extends PaginatedResponse<Transaction> {}

export interface TransactionStats {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  topSellingProducts: Array<{
    product: Product;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  dailyStats: Array<{
    date: string;
    transactions: number;
    revenue: number;
  }>;
}

export interface TransactionAnalytics {
  summary: TransactionStats;
  trends: {
    daily: Array<{
      date: string;
      sales: number;
      transactions: number;
      customers: number;
    }>;
    products: Array<{
      product: Product;
      salesCount: number;
      revenue: number;
      trend: 'up' | 'down' | 'stable';
    }>;
  };
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

export interface TransactionAnalyticsResponse {
  success: boolean;
  data: {
    stats: TransactionStats;
    analytics: TransactionAnalytics;
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

// Purchase Order Types
export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier: Supplier;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';
  items: Array<{
    productId: string;
    product: Product;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  finalAmount: number;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  notes?: string;
  branchId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderListResponse extends PaginatedResponse<PurchaseOrder> {}

export interface PurchaseOrderStats {
  totalOrders: number;
  pendingOrders: number;
  totalValue: number;
  averageOrderValue: number;
  topSuppliers: Array<{
    supplier: Supplier;
    orderCount: number;
    totalValue: number;
  }>;
}

// Inventory Types
export interface InventoryLog {
  id: string;
  productId: string;
  product: Product;
  type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'TRANSFER';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference?: string;
  branchId: string;
  createdBy: string;
  createdAt: string;
}

export interface InventoryLogListResponse extends PaginatedResponse<InventoryLog> {}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  branchId?: string;
  branch?: Branch;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse extends PaginatedResponse<User> {}

// Dashboard Response Types
export interface DashboardStats {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  transactions: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  products: {
    total: number;
    lowStock: number;
    outOfStock: number;
  };
  users: {
    total: number;
    active: number;
  };
}

export interface DashboardResponse {
  success: boolean;
  data: {
    stats: DashboardStats;
    recentTransactions: Transaction[];
    lowStockProducts: Product[];
    alerts: Array<{
      id: string;
      type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRING';
      message: string;
      productId: string;
      createdAt: string;
    }>;
  };
}

// Bulk Operations Response Types
export interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  errors: Array<{
    item: string;
    error: string;
  }>;
}

export interface BulkStockAdjustmentResponse {
  success: boolean;
  data: {
    bulkAdjustment: {
      id: string;
      totalAdjustments: number;
      successCount: number;
      failureCount: number;
      status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
    };
    results: Array<{
      productId: string;
      sku: string;
      success: boolean;
      error?: string;
      adjustment?: any;
    }>;
  };
}

// CSV Import/Export Types
export interface CsvImportResponse<T = any> {
  success: boolean;
  data: {
    totalRows: number;
    successful: number;
    failed: number;
    errors: Array<{
      row: number;
      field?: string;
      message: string;
      value?: string;
    }>;
    results?: T[];
  };
  message?: string;
}

// Status Update Response Types
export interface StatusUpdateResponse {
  success: boolean;
  data: {
    id: string;
    status: string;
    updatedAt: string;
  };
  message?: string;
}

// Stock Adjustment Types (imported from stock-adjustment types)
export type {
  StockAdjustment,
  StockAdjustmentResponse,
  StockAdjustmentListResponse,
  StockAdjustmentStats,
  StockAdjustmentReport,
  BulkStockAdjustment,
  LowStockAlert,
  LowStockAlertResponse,
  StockValuation,
  StockValuationResponse,
  StockAdjustmentFilters,
  StockAdjustmentQueryParams,
  CsvImportResult,
  StockAdjustmentDashboard,
  StockAdjustmentNotification,
  ApprovalRequest,
  ApprovalAction,
} from '@/types/stock-adjustment';