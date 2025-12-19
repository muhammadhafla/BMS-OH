/**
 * Main API Service
 * Orchestrates all focused API services
 * 
 * This is a clean, refactored version that delegates to specialized services:
 * - AuthApiService: Authentication-related calls
 * - ProductService: Product-related calls
 * - TransactionService: Transaction-related calls
 * - InventoryService: Inventory-related calls
 * - CategoryService: Category-related calls
 */

import { authApiService } from './AuthApiService';
import { productService } from './ProductService';
import { transactionService } from './TransactionService';
import { inventoryService } from './InventoryService';
import { categoryService } from './CategoryService';

// Re-export all types and services for backward compatibility
export * from './AuthApiService';
export * from './ProductService';
export * from './TransactionService';
export * from './InventoryService';
export * from './CategoryService';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  token?: string;
  error?: string;
  message?: string;
}

class ApiService {
  // Authentication methods (delegated to AuthApiService)
  async login(email: string, password: string): Promise<ApiResponse> {
    return await authApiService.login(email, password);
  }

  async logout(): Promise<void> {
    return await authApiService.logout();
  }

  getCurrentUser(): any {
    return authApiService.getCurrentUser();
  }

  isAuthenticated(): boolean {
    return authApiService.isAuthenticated();
  }

  async refreshToken(): Promise<boolean> {
    return await authApiService.refreshToken();
  }

  validateSession(): boolean {
    return authApiService.validateSession();
  }

  getSessionStats() {
    return authApiService.getSessionStats();
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    return await authApiService.changePassword(currentPassword, newPassword);
  }

  async requestPasswordReset(email: string): Promise<ApiResponse> {
    return await authApiService.requestPasswordReset(email);
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    return await authApiService.resetPassword(token, newPassword);
  }

  // Product methods (delegated to ProductService)
  async getProducts(params?: any): Promise<ApiResponse> {
    return await productService.getProducts(params);
  }

  async getProduct(id: string): Promise<ApiResponse> {
    return await productService.getProduct(id);
  }

  async searchProduct(query: string): Promise<ApiResponse> {
    return await productService.searchProduct(query);
  }

  async createProduct(productData: any): Promise<ApiResponse> {
    return await productService.createProduct(productData);
  }

  async updateProduct(id: string, productData: any): Promise<ApiResponse> {
    return await productService.updateProduct(id, productData);
  }

  async deleteProduct(id: string): Promise<ApiResponse> {
    return await productService.deleteProduct(id);
  }

  async importProducts(products: any[]): Promise<ApiResponse> {
    return await productService.importProducts(products);
  }

  async exportProducts(format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    return await productService.exportProducts(format);
  }

  async checkAvailability(productIds: string[]): Promise<ApiResponse> {
    return await productService.checkAvailability(productIds);
  }

  async getLowStockProductsFromService(): Promise<ApiResponse> {
    return await productService.getLowStockProducts();
  }

  // Transaction methods (delegated to TransactionService)
  async createTransaction(transactionData: any): Promise<ApiResponse> {
    return await transactionService.createTransaction(transactionData);
  }

  async getTransactions(params?: any): Promise<ApiResponse> {
    return await transactionService.getTransactions(params);
  }

  async getTransaction(id: string): Promise<ApiResponse> {
    return await transactionService.getTransaction(id);
  }

  async updateTransactionStatus(id: string, status: string): Promise<ApiResponse> {
    return await transactionService.updateTransactionStatus(id, status);
  }

  async cancelTransaction(id: string, reason?: string): Promise<ApiResponse> {
    return await transactionService.cancelTransaction(id, reason);
  }

  async refundTransaction(id: string, refundData: any): Promise<ApiResponse> {
    return await transactionService.refundTransaction(id, refundData);
  }

  async getTransactionStats(params?: any): Promise<ApiResponse> {
    return await transactionService.getTransactionStats(params);
  }

  async exportTransactions(params?: any): Promise<Blob> {
    return await transactionService.exportTransactions(params);
  }

  async printReceipt(id: string): Promise<ApiResponse> {
    return await transactionService.printReceipt(id);
  }

  async emailReceipt(id: string, email: string): Promise<ApiResponse> {
    return await transactionService.emailReceipt(id, email);
  }

  async getDailySummary(date: string): Promise<ApiResponse> {
    return await transactionService.getDailySummary(date);
  }

  async searchTransactions(query: string, limit?: number): Promise<ApiResponse> {
    return await transactionService.searchTransactions(query, limit);
  }

  // Inventory methods (delegated to InventoryService)
  async getInventoryOverview(params?: any): Promise<ApiResponse> {
    return await inventoryService.getInventoryOverview(params);
  }

  async getLowStockProducts(): Promise<ApiResponse> {
    return await inventoryService.getLowStockProducts();
  }

  async getInventoryLogs(params?: any): Promise<ApiResponse> {
    return await inventoryService.getInventoryLogs(params);
  }

  async adjustStock(adjustmentData: any): Promise<ApiResponse> {
    return await inventoryService.adjustStock(adjustmentData);
  }

  async bulkAdjustStock(adjustments: any[]): Promise<ApiResponse> {
    return await inventoryService.bulkAdjustStock(adjustments);
  }

  async checkStockAvailability(requests: any[]): Promise<ApiResponse> {
    return await inventoryService.checkStockAvailability(requests);
  }

  async getInventoryStats(): Promise<ApiResponse> {
    return await inventoryService.getInventoryStats();
  }

  async setMinStockLevels(levels: any[]): Promise<ApiResponse> {
    return await inventoryService.setMinStockLevels(levels);
  }

  async generateInventoryReport(params: any): Promise<Blob> {
    return await inventoryService.generateInventoryReport(params);
  }

  async transferStock(transferData: any): Promise<ApiResponse> {
    return await inventoryService.transferStock(transferData);
  }

  async getStockMovement(productId: string, days?: number): Promise<ApiResponse> {
    return await inventoryService.getStockMovement(productId, days);
  }

  async auditInventory(auditData: any): Promise<ApiResponse> {
    return await inventoryService.auditInventory(auditData);
  }

  // Category methods (delegated to CategoryService)
  async getCategories(): Promise<ApiResponse> {
    return await categoryService.getCategories();
  }

  async getCategory(id: string): Promise<ApiResponse> {
    return await categoryService.getCategory(id);
  }

  async createCategory(categoryData: any): Promise<ApiResponse> {
    return await categoryService.createCategory(categoryData);
  }

  async updateCategory(id: string, categoryData: any): Promise<ApiResponse> {
    return await categoryService.updateCategory(id, categoryData);
  }

  async deleteCategory(id: string): Promise<ApiResponse> {
    return await categoryService.deleteCategory(id);
  }

  async getCategoryTree(): Promise<ApiResponse> {
    return await categoryService.getCategoryTree();
  }

  async getCategoriesWithCounts(): Promise<ApiResponse> {
    return await categoryService.getCategoriesWithCounts();
  }

  async searchCategories(query: string): Promise<ApiResponse> {
    return await categoryService.searchCategories(query);
  }

  async toggleCategoryStatus(id: string, isActive: boolean): Promise<ApiResponse> {
    return await categoryService.toggleCategoryStatus(id, isActive);
  }

  async bulkCreateCategories(categories: any[]): Promise<ApiResponse> {
    return await categoryService.bulkCreateCategories(categories);
  }

  async reorderCategories(categoryIds: string[]): Promise<ApiResponse> {
    return await categoryService.reorderCategories(categoryIds);
  }

  async getCategoryStats(): Promise<ApiResponse> {
    return await categoryService.getCategoryStats();
  }

  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      // Simple health check by trying to get categories
      const result = await categoryService.getCategories();
      return result.success;
    } catch (error) {
      return false;
    }
  }

  // Legacy compatibility methods
  // These maintain backward compatibility with existing code
  async fallbackProducts(): Promise<ApiResponse> {
    // Delegate to product service fallback
    return await productService.getProducts({ limit: 500 });
  }

  // Configuration methods
  getApiEndpoints(): string[] {
    return [
      import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
      'http://localhost:3001/api',
      'http://127.0.0.1:3001/api'
    ];
  }

  // Utility methods
  isOnline(): boolean {
    return navigator.onLine;
  }

  getCurrentEndpoint(): string {
    return localStorage.getItem('bms_api_endpoint') || 'http://localhost:3001/api';
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;