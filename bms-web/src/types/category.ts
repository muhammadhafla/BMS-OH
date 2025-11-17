// Category types for BMS Category Management System

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
  // Relations
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

// Product relation type (simplified for category use)
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  isActive: boolean;
}

// Branch relation type (simplified for category use)
export interface Branch {
  id: string;
  name: string;
}

// API Response types
export interface CategoryListResponse {
  success: boolean;
  data: {
    categories: Category[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

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

// Form data types
export interface CategoryFormData {
  name: string;
  code?: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  branchId?: string;
}

export interface CategoryUpdateData extends Partial<CategoryFormData> {
  parentId?: string | null;
}

export interface BulkUpdateProductsData {
  productIds: string[];
  categoryId: string;
}

// Import/Export types
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

// Filter and search types
export interface CategoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  parentId?: string;
  branchId?: string;
  isActive?: boolean;
  includeProducts?: boolean;
}

// Tree operations types
export interface TreeNodeMove {
  nodeId: string;
  targetParentId?: string;
  position?: 'before' | 'after' | 'inside';
}

export interface TreeReorderOperation {
  nodeId: string;
  newParentId?: string;
  newPosition: number;
}

// UI State types
export interface CategoryTreeState {
  expandedNodes: Set<string>;
  selectedNodes: Set<string>;
  loading: boolean;
  error: string | null;
}

export interface CategoryManagementState {
  currentCategory: Category | null;
  selectedProducts: string[];
  filters: CategoryFilters;
  treeState: CategoryTreeState;
  bulkOperationInProgress: boolean;
  importInProgress: boolean;
}

// Drag and Drop types
export interface DragDropData {
  categoryId: string;
  sourceParentId?: string;
  targetParentId?: string;
  position: number;
}

export interface DropResult {
  success: boolean;
  error?: string;
  updatedCategory?: Category;
}