// Stock adjustment types and interfaces

export type AdjustmentType = 'INCREMENT' | 'DECREMENT' | 'SET_TO';
export type AdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';

// Base product interface
export interface Product {
  id: string;
  sku: string;
  name: string;
  stock: number;
  unit: string;
  minStock: number;
  maxStock: number;
  cost: number;
  price: number;
  branchId: string;
  branch: {
    id: string;
    name: string;
  };
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
}

// User interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId?: string;
}

// Stock adjustment interface
export interface StockAdjustment {
  id: string;
  productId: string;
  product?: Product;
  adjustmentType: AdjustmentType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  notes?: string;
  reference?: string;
  status: AdjustmentStatus;
  requiresApproval: boolean;
  performedById: string;
  performedBy?: User;
  approvedById?: string;
  approvedBy?: User;
  approvalNotes?: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

// Bulk stock adjustment interface
export interface BulkStockAdjustment {
  id: string;
  totalAdjustments: number;
  successCount: number;
  failureCount: number;
  globalReason?: string;
  globalReference?: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  performedById: string;
  performedBy?: User;
  branchId: string;
  adjustments: StockAdjustment[];
  createdAt: string;
  updatedAt: string;
}

// Stock adjustment log interface
export interface StockAdjustmentLog {
  id: string;
  adjustmentId: string;
  adjustment?: StockAdjustment;
  action: 'CREATED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  performedById: string;
  performedBy?: User;
  notes?: string;
  createdAt: string;
}

// Low stock alert interface
export interface LowStockAlert {
  id: string;
  productId: string;
  product?: Product;
  currentStock: number;
  threshold: number;
  status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
  notifiedUsers: string[];
  notifiedRoles: UserRole[];
  createdAt: string;
  resolvedAt?: string;
  dismissedAt?: string;
}

// Stock valuation interface
export interface StockValuation {
  productId: string;
  product?: Product;
  quantity: number;
  unitCost: number;
  totalValue: number;
  method: 'FIFO' | 'LIFO' | 'AVERAGE' | 'SPECIFIC';
  calculatedAt: string;
}

// Stock adjustment statistics
export interface StockAdjustmentStats {
  totalAdjustments: number;
  pendingApprovals: number;
  approvedAdjustments: number;
  rejectedAdjustments: number;
  totalStockIn: number;
  totalStockOut: number;
  netStockChange: number;
  byType: {
    INCREMENT: number;
    DECREMENT: number;
    SET_TO: number;
  };
  byReason: Record<string, number>;
  byBranch: Record<string, number>;
  byUser: Record<string, number>;
}

// Stock adjustment report interface
export interface StockAdjustmentReport {
  period: {
    from: string;
    to: string;
  };
  stats: StockAdjustmentStats;
  adjustments: StockAdjustment[];
  lowStockProducts: Product[];
  topAdjustedProducts: Array<{
    product: Product;
    adjustmentCount: number;
    totalQuantity: number;
  }>;
  generatedAt: string;
  generatedBy?: User;
}

// API response interfaces
export interface StockAdjustmentResponse {
  success: boolean;
  data?: StockAdjustment;
  error?: string;
  message?: string;
}

export interface BulkStockAdjustmentResponse {
  success: boolean;
  data?: {
    bulkAdjustment: BulkStockAdjustment;
    results: Array<{
      productId: string;
      sku: string;
      success: boolean;
      error?: string;
      adjustment?: StockAdjustment;
    }>;
  };
  error?: string;
  message?: string;
}

export interface StockAdjustmentListResponse {
  success: boolean;
  data?: {
    adjustments: StockAdjustment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  error?: string;
}

export interface LowStockAlertResponse {
  success: boolean;
  data?: {
    alerts: LowStockAlert[];
    products: Product[];
  };
  error?: string;
}

export interface StockValuationResponse {
  success: boolean;
  data?: {
    valuations: StockValuation[];
    totalValue: number;
    totalQuantity: number;
  };
  error?: string;
}

// Filter and pagination interfaces
export interface StockAdjustmentFilters {
  productId?: string;
  branchId?: string;
  adjustmentType?: AdjustmentType | 'ALL';
  reason?: string;
  status?: AdjustmentStatus | 'ALL';
  dateFrom?: string;
  dateTo?: string;
  performedBy?: string;
  requiresApproval?: boolean;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: 'date' | 'quantity' | 'product' | 'user';
  sortOrder?: 'asc' | 'desc';
}

export interface StockAdjustmentQueryParams extends StockAdjustmentFilters, PaginationParams {}

// CSV import interfaces
export interface CsvStockAdjustmentRow {
  sku: string;
  adjustmentType: AdjustmentType;
  quantity: number;
  reason: string;
  notes?: string;
  reference?: string;
}

export interface CsvImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: Array<{
    row: number;
    sku: string;
    error: string;
  }>;
  adjustments: StockAdjustment[];
}

// Approval workflow interfaces
export interface ApprovalRequest {
  adjustmentId: string;
  adjustment?: StockAdjustment;
  requestedAt: string;
  requestedBy?: User;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
}

export interface ApprovalAction {
  adjustmentId: string;
  status: 'APPROVED' | 'REJECTED';
  approvalNotes?: string;
  approvedBy: string;
}

// Dashboard and analytics interfaces
export interface StockAdjustmentDashboard {
  summary: {
    todayAdjustments: number;
    weekAdjustments: number;
    monthAdjustments: number;
    pendingApprovals: number;
  };
  recentAdjustments: StockAdjustment[];
  lowStockAlerts: LowStockAlert[];
  topAdjustedProducts: Array<{
    product: Product;
    adjustmentCount: number;
  }>;
  adjustmentTrends: Array<{
    date: string;
    increments: number;
    decrements: number;
    adjustments: number;
  }>;
}

// Notification interfaces
export interface StockAdjustmentNotification {
  id: string;
  type: 'LOW_STOCK' | 'APPROVAL_REQUIRED' | 'APPROVED' | 'REJECTED';
  title: string;
  message: string;
  productId?: string;
  adjustmentId?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  read: boolean;
  createdAt: string;
}

// Export all types
export type {
  StockAdjustment as default,
};