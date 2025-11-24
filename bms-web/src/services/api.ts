import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import type {
  AuthResponse,
  ApiResponse,
  PaginatedResponse,
  BranchListResponse,
  SupplierListResponse,
  ProductListResponse,
  TransactionListResponse,
  TransactionStatsResponse,
  TransactionAnalyticsResponse,
  PurchaseOrderListResponse,
  InventoryLogListResponse,
  UserListResponse,
  UserStatsResponse,
  DashboardResponse,
  LowStockProductsResponse,
  BulkStockAdjustmentResponse,
  CsvImportResponse,
  StockAdjustmentListResponse,
  StockAdjustmentResponse,
  CategoryListResponse,
  CategoryTreeResponse,
  CategoryDetailResponse,
  CategoryStatsResponse,
  BulkUpdateResponse,
  CategoryImportResponse,
  StockValuationResponse,
  LowStockAlertResponse
} from '@/types/api-responses';
import type {
  UnifiedTransaction,
  TransactionCreate
} from '@/types/unified';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        // Try to get token from NextAuth session if available
        let token = Cookies.get('auth_token');
        
        // If we have NextAuth session, we can also get the access token
        if (typeof window !== 'undefined') {
          try {
            const { getSession } = await import('next-auth/react');
            const session = await getSession();
            // Try to access token through any property (generic approach)
            const sessionToken = (session as any)?.accessToken || (session as any)?.user?.accessToken;
            if (sessionToken) {
              token = sessionToken;
            }
          } catch (error) {
            // Fallback to cookie token
          }
        }
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          // Token is invalid or expired
          Cookies.remove('auth_token');
          
          // Sign out from NextAuth as well
          if (typeof window !== 'undefined') {
            try {
              const { signOut } = await import('next-auth/react');
              await signOut({ redirect: false });
            } catch (signOutError) {
              // Ignore signOut errors
            }
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic methods with proper constraints
  async get<T = ApiResponse<unknown>>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.get(url, config);
    return response.data as T;
  }

  async post<T = ApiResponse<unknown>>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.post(url, data, config);
    return response.data as T;
  }

  async put<T = ApiResponse<unknown>>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.put(url, data, config);
    return response.data as T;
  }

  async patch<T = ApiResponse<unknown>>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.patch(url, data, config);
    return response.data as T;
  }

  async delete<T = ApiResponse<unknown>>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.delete(url, config);
    return response.data as T;
  }

  // Specific method overloads for better type safety
  async getSingle<T>(url: string): Promise<ApiResponse<T>> {
    return this.get(`${url}`);
  }

  async getPaginated<T>(url: string, params?: Record<string, unknown>): Promise<PaginatedResponse<T>> {
    return this.get(`${url}`, { params });
  }

  async postWithValidation<T, D>(url: string, data: D): Promise<ApiResponse<T>> {
    return this.post(`${url}`, data);
  }

  async putWithValidation<T, D>(url: string, data: D): Promise<ApiResponse<T>> {
    return this.put(`${url}`, data);
  }

  async patchWithValidation<T, D>(url: string, data: D): Promise<ApiResponse<T>> {
    return this.patch(`${url}`, data);
  }

  // Specific methods for binary responses (Blob, File, etc.)
  async getBlob(url: string, config?: AxiosRequestConfig): Promise<Blob> {
    const response = await this.api.get(url, { ...config, responseType: 'blob' });
    return response.data as Blob;
  }

  async postBlob(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<Blob> {
    const response = await this.api.post(url, data, { ...config, responseType: 'blob' });
    return response.data as Blob;
  }

  // Error handling methods
  /*
  // Note: handleApiError method reserved for future implementation
  private _handleApiError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const errorResponse = error.response?.data as ApiErrorResponse | undefined;
      const apiError: ApiError = {
        code: error.response?.status?.toString() || 'UNKNOWN',
        message: error.message || 'An error occurred',
        details: (errorResponse?.error as unknown) as Record<string, unknown> || {}
      };
      throw apiError;
    }
    const genericError: ApiError = {
      code: 'UNKNOWN',
      message: 'An unexpected error occurred',
      details: {}
    };
    throw genericError;
  }
  */

  // Auth specific methods
  async login(email: string, password: string): Promise<AuthResponse> {
    return this.post('/auth/login', { email, password });
  }

  async getCurrentUser(): Promise<ApiResponse> {
    return this.get('/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    return this.put('/auth/change-password', { currentPassword, newPassword });
  }

  // Product methods
  async getProducts(params?: Record<string, unknown>): Promise<ProductListResponse> {
    return this.get('/products', { params });
  }

  async getProduct(id: string): Promise<ApiResponse> {
    return this.get(`/products/${id}`);
  }

  async createProduct(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.post('/products', data);
  }

  async updateProduct(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.put(`/products/${id}`, data);
  }

  async deleteProduct(id: string): Promise<ApiResponse> {
    return this.delete(`/products/${id}`);
  }

  async updateProductStock(id: string, data: {
    adjustmentType: string;
    quantity: number;
    reason: string;
    reference?: string;
    notes?: string;
  }): Promise<ApiResponse> {
    return this.patch(`/products/${id}/stock`, data);
  }

  async importProductsFromCSV(formData: FormData): Promise<CsvImportResponse> {
    const response = await this.api.post('/products/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async downloadSampleCSV(): Promise<Blob> {
    return this.getBlob('/products/sample-csv');
  }

  // Category methods
  async getCategories(params?: Record<string, unknown>): Promise<CategoryListResponse> {
    return this.get('/categories', { params });
  }

  async getCategoryTree(params?: Record<string, unknown>): Promise<CategoryTreeResponse> {
    return this.get('/categories/tree', { params });
  }

  async getCategory(id: string): Promise<CategoryDetailResponse> {
    return this.get(`/categories/${id}`);
  }

  async createCategory(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.post('/categories', data);
  }

  async updateCategory(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.put(`/categories/${id}`, data);
  }

  async deleteCategory(id: string): Promise<ApiResponse> {
    return this.delete(`/categories/${id}`);
  }

  async getCategoryStats(id: string): Promise<CategoryStatsResponse> {
    return this.get(`/categories/${id}/stats`);
  }

  async bulkUpdateProductsCategory(data: { productIds: string[]; categoryId: string }): Promise<BulkUpdateResponse> {
    return this.patch('/categories/bulk-update-products', data);
  }

  async importCategoriesFromCSV(formData: FormData): Promise<CategoryImportResponse> {
    const response = await this.api.post('/categories/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async downloadCategorySampleCSV(): Promise<Blob> {
    return this.get('/categories/sample-csv', { responseType: 'blob' });
  }

  async exportCategories(params?: Record<string, unknown>): Promise<Blob> {
    return this.getBlob('/categories/export-csv', { params });
  }

  // Transaction methods with unified types
  async getTransactions(params?: Record<string, unknown>): Promise<TransactionListResponse> {
    return this.get('/transactions', { params });
  }

  async getTransaction(id: string): Promise<ApiResponse<UnifiedTransaction>> {
    return this.getSingle<UnifiedTransaction>(`/transactions/${id}`);
  }

  async createTransaction(data: TransactionCreate): Promise<ApiResponse<UnifiedTransaction>> {
    return this.postWithValidation<UnifiedTransaction, TransactionCreate>('/transactions', data);
  }

  async updateTransaction(id: string, data: Partial<TransactionCreate>): Promise<ApiResponse<UnifiedTransaction>> {
    return this.putWithValidation<UnifiedTransaction, Partial<TransactionCreate>>(`/transactions/${id}`, data);
  }

  async updateTransactionStatus(id: string, status: string): Promise<ApiResponse> {
    return this.patch(`/transactions/${id}/status`, { status });
  }

  async getTransactionStats(params?: Record<string, unknown>): Promise<TransactionStatsResponse> {
    return this.get('/transactions/stats/summary', { params });
  }

  // Dashboard methods
  async getDashboardStats(): Promise<DashboardResponse> {
    return this.get('/dashboard/stats');
  }

  async getTransactionAnalytics(params?: Record<string, unknown>): Promise<TransactionAnalyticsResponse> {
    return this.get('/transactions/analytics', { params });
  }

  // Inventory methods
  async getInventory(params?: Record<string, unknown>): Promise<PaginatedResponse<any>> {
    return this.get('/inventory', { params });
  }

  async getInventoryOverview(): Promise<ApiResponse> {
    return this.get('/inventory/overview');
  }

  async getInventoryLogs(params?: Record<string, unknown>): Promise<InventoryLogListResponse> {
    return this.get('/inventory/logs', { params });
  }

  async getStockMovementLogs(params?: Record<string, unknown>): Promise<InventoryLogListResponse> {
    return this.get('/inventory/logs', { params });
  }

  async adjustInventory(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.post('/inventory/adjust', data);
  }

  async bulkAdjustInventory(data: Record<string, unknown>): Promise<BulkStockAdjustmentResponse> {
    return this.post('/inventory/adjust/bulk', data);
  }

  async getInventoryAnalytics(params?: Record<string, unknown>): Promise<ApiResponse> {
    return this.get('/inventory/analytics', { params });
  }

  async getLowStockProducts(): Promise<LowStockProductsResponse> {
    return this.get('/inventory/low-stock');
  }

  // Stock Adjustment methods
  async getStockAdjustments(params?: Record<string, unknown>): Promise<StockAdjustmentListResponse> {
    return this.get('/inventory/adjustments', { params });
  }

  async getStockAdjustment(id: string): Promise<StockAdjustmentResponse> {
    return this.get(`/inventory/adjustments/${id}`);
  }

  async createStockAdjustment(data: Record<string, unknown>): Promise<StockAdjustmentResponse> {
    return this.post('/inventory/adjustments', data);
  }

  async approveStockAdjustment(id: string, data: { status: string; approvalNotes?: string }): Promise<ApiResponse> {
    return this.patch(`/inventory/adjustments/${id}/approve`, data);
  }

  async bulkCreateStockAdjustments(data: Record<string, unknown>): Promise<BulkStockAdjustmentResponse> {
    return this.post('/inventory/adjustments/bulk', data);
  }

  async importStockAdjustmentsFromCSV(formData: FormData): Promise<CsvImportResponse> {
    const response = await this.api.post('/inventory/adjustments/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getStockAdjustmentStats(params?: Record<string, unknown>): Promise<ApiResponse> {
    return this.get('/inventory/adjustments/stats', { params });
  }

  async getStockAdjustmentReport(params?: Record<string, unknown>): Promise<ApiResponse> {
    return this.get('/inventory/adjustments/report', { params });
  }

  async getPendingApprovals(params?: Record<string, unknown>): Promise<StockAdjustmentListResponse> {
    return this.get('/inventory/adjustments/pending-approvals', { params });
  }

  async getStockAdjustmentHistory(productId: string, params?: Record<string, unknown>): Promise<ApiResponse> {
    return this.get(`/products/${productId}/adjustment-history`, { params });
  }

  async exportStockMovements(params?: Record<string, unknown>): Promise<Blob> {
    return this.getBlob('/inventory/logs/export', { params });
  }

  async getStockValuationReport(params?: Record<string, unknown>): Promise<StockValuationResponse> {
    return this.get('/inventory/valuation/report', { params });
  }

  async getInventoryAudit(params?: Record<string, unknown>): Promise<ApiResponse> {
    return this.get('/inventory/audit', { params });
  }

  async createInventoryAudit(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.post('/inventory/audit', data);
  }

  async getBatchLotTracking(params?: Record<string, unknown>): Promise<ApiResponse> {
    return this.get('/inventory/batch-lot', { params });
  }

  async createBatchLot(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.post('/inventory/batch-lot', data);
  }

  async updateBatchLot(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.patch(`/inventory/batch-lot/${id}`, data);
  }

  // Low Stock Alert methods
  async getLowStockAlerts(params?: Record<string, unknown>): Promise<LowStockAlertResponse> {
    return this.get('/inventory/low-stock-alerts', { params });
  }

  async createLowStockAlert(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.post('/inventory/low-stock-alerts', data);
  }

  async updateLowStockAlert(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.patch(`/inventory/low-stock-alerts/${id}`, data);
  }

  async dismissLowStockAlert(id: string): Promise<ApiResponse> {
    return this.patch(`/inventory/low-stock-alerts/${id}/dismiss`);
  }

  async resolveLowStockAlert(id: string): Promise<ApiResponse> {
    return this.patch(`/inventory/low-stock-alerts/${id}/resolve`);
  }

  // Stock Valuation methods
  async getStockValuation(params?: Record<string, unknown>): Promise<StockValuationResponse> {
    return this.get('/inventory/valuation', { params });
  }

  async exportStockValuation(params?: Record<string, unknown>): Promise<Blob> {
    return this.getBlob('/inventory/valuation/export', { params });
  }

  async calculateStockValuation(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.post('/inventory/valuation/calculate', data);
  }

  // Batch and Lot Tracking methods
  async exportBatchTracking(params?: Record<string, unknown>): Promise<Blob> {
    return this.getBlob('/inventory/batch-lot/export', { params });
  }

  // User methods
  async getUsers(params?: Record<string, unknown>): Promise<UserListResponse> {
    return this.get('/users', { params });
  }

  async getUser(id: string): Promise<ApiResponse> {
    return this.get(`/users/${id}`);
  }

  async createUser(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.post('/users', data);
  }

  async updateUser(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.put(`/users/${id}`, data);
  }

  async changeUserPassword(id: string, password: string): Promise<ApiResponse> {
    return this.patch(`/users/${id}/password`, { password });
  }

  async updateUserStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<ApiResponse> {
    return this.patch(`/users/${id}/status`, { status });
  }

  async getUserStats(): Promise<UserStatsResponse> {
    return this.get('/users/stats/summary');
  }

  // Branch methods
  async getBranches(params?: Record<string, unknown>): Promise<BranchListResponse> {
    return this.get('/branches', { params });
  }

  async getBranch(id: string): Promise<ApiResponse> {
    return this.get(`/branches/${id}`);
  }

  async createBranch(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.post('/branches', data);
  }

  async updateBranch(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.put(`/branches/${id}`, data);
  }

  async updateBranchStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<ApiResponse> {
    return this.patch(`/branches/${id}/status`, { status });
  }

  async getBranchStats(id: string): Promise<ApiResponse> {
    return this.get(`/branches/${id}/stats`);
  }

  async getBranchComparison(): Promise<ApiResponse> {
    return this.get('/branches/compare');
  }

  // Supplier methods
  async getSuppliers(params?: Record<string, unknown>): Promise<SupplierListResponse> {
    return this.get('/suppliers', { params });
  }

  async getSupplier(id: string): Promise<ApiResponse> {
    return this.get(`/suppliers/${id}`);
  }

  async createSupplier(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.post('/suppliers', data);
  }

  async updateSupplier(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.put(`/suppliers/${id}`, data);
  }

  async updateSupplierStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<ApiResponse> {
    return this.patch(`/suppliers/${id}/status`, { status });
  }

  async getSupplierStats(): Promise<ApiResponse> {
    return this.get('/suppliers/stats/summary');
  }

  async searchSuppliers(query: string): Promise<ApiResponse> {
    return this.get('/suppliers/search', { params: { q: query } });
  }

  // Purchase Order methods
  async getPurchaseOrders(params?: Record<string, unknown>): Promise<PurchaseOrderListResponse> {
    return this.get('/purchase-orders', { params });
  }

  async getPurchaseOrder(id: string): Promise<ApiResponse> {
    return this.get(`/purchase-orders/${id}`);
  }

  async createPurchaseOrder(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.post('/purchase-orders', data);
  }

  async updatePurchaseOrderStatus(id: string, status: string): Promise<ApiResponse> {
    return this.patch(`/purchase-orders/${id}/status`, { status });
  }

  async receivePurchaseOrder(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.post(`/purchase-orders/${id}/receive`, data);
  }

  async getPurchaseOrderStats(): Promise<ApiResponse> {
    return this.get('/purchase-orders/stats/summary');
  }

  // Attendance methods
  async clockIn(data?: Record<string, unknown>): Promise<ApiResponse> {
    return this.post('/attendance/clock-in', data);
  }

  async clockOut(data?: Record<string, unknown>): Promise<ApiResponse> {
    return this.post('/attendance/clock-out', data);
  }

  async getAttendanceRecords(params?: Record<string, unknown>): Promise<ApiResponse> {
    return this.get('/attendance', { params });
  }

  async getAttendanceRecord(id: string): Promise<ApiResponse> {
    return this.get(`/attendance/${id}`);
  }

  async updateAttendanceRecord(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.put(`/attendance/${id}`, data);
  }

  async getUserAttendance(userId: string, params?: Record<string, unknown>): Promise<ApiResponse> {
    return this.get(`/attendance/user/${userId}`, { params });
  }

  async getAttendanceStats(): Promise<ApiResponse> {
    return this.get('/attendance/stats/summary');
  }

  async getCurrentAttendanceStatus(): Promise<ApiResponse> {
    return this.get('/attendance/current-status');
  }

  // Messaging methods
  async getMessages(params?: Record<string, unknown>): Promise<ApiResponse> {
    return this.get('/messages', { params });
  }

  async getMessage(id: string): Promise<ApiResponse> {
    return this.get(`/messages/${id}`);
  }

  async sendMessage(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.post('/messages', data);
  }

  async markMessageAsRead(id: string): Promise<ApiResponse> {
    return this.patch(`/messages/${id}/read`);
  }

  async markAllMessagesAsRead(): Promise<ApiResponse> {
    return this.patch('/messages/mark-all-read');
  }

  async getUnreadMessageCount(): Promise<ApiResponse> {
    return this.get('/messages/unread-count');
  }

  async getConversation(userId: string, params?: Record<string, unknown>): Promise<ApiResponse> {
    return this.get(`/messages/conversation/${userId}`, { params });
  }

  async getMessageContacts(): Promise<ApiResponse> {
    return this.get('/messages/contacts');
  }

  // Accounting methods
  async seedChartOfAccounts(): Promise<ApiResponse> {
    return this.post('/accounting/seed-accounts');
  }

  async getChartOfAccounts(): Promise<ApiResponse> {
    return this.get('/accounting/accounts');
  }

  async getTrialBalance(params?: Record<string, unknown>): Promise<ApiResponse> {
    return this.get('/accounting/trial-balance', { params });
  }
}

export const apiService = new ApiService();
export default apiService;