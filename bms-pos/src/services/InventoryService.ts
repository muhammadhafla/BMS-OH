/**
 * Inventory Service
 * Handles inventory-related API calls
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { sessionManager } from './SessionManager'
import { Product } from './ProductService'
import { Logger } from '../utils/logger'

export interface InventoryLog {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reference?: string;
  notes?: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  stockStatus: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'CRITICAL';
  stockValue: number;
  category?: {
    name: string;
  };
}

export interface InventoryOverview {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: {
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
}

export interface InventoryParams {
  branchId?: string;
  categoryId?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export interface StockAdjustment {
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  notes?: string;
  reference?: string;
}

export interface InventoryApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class InventoryService {
  private api: AxiosInstance
  private baseURL: string

  constructor() {
    this.baseURL = this.detectApiEndpoint()
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Info': 'BMS-POS-PWA/1.0',
      },
    })

    this.setupInterceptors()
  }

  private detectApiEndpoint(): string {
    const savedEndpoint = localStorage.getItem('bms_api_endpoint')
    if (savedEndpoint) {
      return savedEndpoint
    }

    const {hostname} = window.location
    const {protocol: _protocol} = window.location
    const {port} = window.location
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      if (port && ['5173', '5174', '4173'].includes(port)) {
        return 'http://localhost:3001/api'
      }
      if (port === '3000') {
        return 'http://localhost:3001/api'
      }
      return 'http://localhost:3001/api'
    }
    
    return 'http://localhost:3001/api'
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use(
      (config) => {
        const session = sessionManager.getSession()
        if (session?.token) {
          config.headers.Authorization = `Bearer ${session.token}`
        }
        return config
      },
      (error) => Promise.reject(error),
    )

    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          sessionManager.clearSession()
          window.dispatchEvent(new CustomEvent('pos-logout'))
        }
        return Promise.reject(error)
      },
    )
  }

  private async makeRequestWithRetry(requestFn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn()
      } catch (error: any) {
        lastError = error
        
        if (error.response?.status === 401) {
          throw error
        }
        
        if ((error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR' || !error.response) && attempt < maxRetries) {
          Logger.warn(`Inventory request failed (attempt ${attempt}/${maxRetries}), retrying...`)
          continue
        }
      }
    }
    
    throw lastError
  }

  /**
   * Get inventory overview with filtering and pagination
   */
  async getInventoryOverview(params: InventoryParams = {}): Promise<InventoryApiResponse<InventoryOverview>> {
    try {
      return await this.makeRequestWithRetry(async () => {
        const response = await this.api.get('/inventory/overview', { params })
        return {
          success: true,
          data: response.data.data,
        }
      })
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error ?? 'Failed to fetch inventory overview',
      }
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(): Promise<InventoryApiResponse<{ lowStockProducts: LowStockProduct[]; summary: any }>> {
    try {
      const response = await this.api.get('/inventory/low-stock')
      return {
        success: true,
        data: response.data.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error ?? 'Failed to fetch low stock products',
      }
    }
  }

  /**
   * Get inventory logs
   */
  async getInventoryLogs(params: {
    productId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<InventoryApiResponse<{ logs: InventoryLog[]; pagination: any }>> {
    try {
      const response = await this.api.get('/inventory/logs', { params })
      return {
        success: true,
        data: response.data.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error ?? 'Failed to fetch inventory logs',
      }
    }
  }

  /**
   * Adjust stock for a single product
   */
  async adjustStock(adjustmentData: StockAdjustment): Promise<InventoryApiResponse<{ product: Product; log: InventoryLog }>> {
    try {
      const response = await this.api.post('/inventory/adjust', adjustmentData)
      return {
        success: true,
        data: response.data.data,
        message: response.data.message ?? 'Stock adjusted successfully',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error ?? 'Failed to adjust stock',
      }
    }
  }

  /**
   * Bulk adjust stock for multiple products
   */
  async bulkAdjustStock(adjustments: StockAdjustment[]): Promise<InventoryApiResponse<{
    adjustments: any[];
    logs: InventoryLog[];
    summary: {
      successful: number;
      failed: number;
    };
  }>> {
    try {
      const response = await this.api.post('/inventory/adjust/bulk', { adjustments })
      return {
        success: true,
        data: response.data.data,
        message: response.data.message ?? 'Bulk stock adjustment completed',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error ?? 'Failed to perform bulk stock adjustment',
      }
    }
  }

  /**
   * Check stock availability for multiple products
   */
  async checkStockAvailability(requests: Array<{ productId: string; quantity: number }>): Promise<InventoryApiResponse<{
    available: boolean;
    issues: Array<{
      productId: string;
      available: number;
      requested: number;
      issue: 'INSUFFICIENT_STOCK' | 'PRODUCT_NOT_FOUND';
    }>;
  }>> {
    try {
      const response = await this.api.post('/inventory/check-availability', { requests })
      return {
        success: true,
        data: response.data.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error ?? 'Failed to check stock availability',
      }
    }
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStats(): Promise<InventoryApiResponse<{
    summary: {
      totalProducts: number;
      totalValue: number;
      lowStockCount: number;
      outOfStockCount: number;
      averageStockLevel: number;
    };
    categoryBreakdown: Array<{
      categoryId: string;
      categoryName: string;
      productCount: number;
      totalValue: number;
      lowStockCount: number;
    }>;
    topValueProducts: Array<{
      productId: string;
      productName: string;
      stockValue: number;
      stockQuantity: number;
    }>;
  }>> {
    try {
      const response = await this.api.get('/inventory/analytics')
      return {
        success: true,
        data: response.data.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error ?? 'Failed to fetch inventory statistics',
      }
    }
  }

  /**
   * Set minimum stock levels
   */
  async setMinStockLevels(levels: Array<{ productId: string; minStock: number }>): Promise<InventoryApiResponse> {
    try {
      const response = await this.api.post('/inventory/set-min-levels', { levels })
      return {
        success: true,
        message: response.data.message ?? 'Minimum stock levels set successfully',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error ?? 'Failed to set minimum stock levels',
      }
    }
  }

  /**
   * Generate inventory report
   */
  async generateInventoryReport(params: {
    type: 'current' | 'movement' | 'valuation' | 'low-stock';
    format?: 'csv' | 'xlsx' | 'pdf';
    filters?: {
      categoryId?: string;
      branchId?: string;
      startDate?: string;
      endDate?: string;
    };
  }): Promise<Blob> {
    try {
      const response = await this.api.get('/inventory/reports', {
        params,
        responseType: 'blob',
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error ?? 'Failed to generate inventory report')
    }
  }

  /**
   * Transfer stock between products or branches
   */
  async transferStock(transferData: {
    fromProductId: string;
    toProductId: string;
    quantity: number;
    reason?: string;
    reference?: string;
  }): Promise<InventoryApiResponse<{ transfer: any; logs: InventoryLog[] }>> {
    try {
      const response = await this.api.post('/inventory/transfer', transferData)
      return {
        success: true,
        data: response.data.data,
        message: response.data.message ?? 'Stock transferred successfully',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error ?? 'Failed to transfer stock',
      }
    }
  }

  /**
   * Get stock movement history
   */
  async getStockMovement(productId: string, days: number = 30): Promise<InventoryApiResponse<{
    product: Product;
    movements: Array<{
      date: string;
      type: 'IN' | 'OUT' | 'ADJUSTMENT';
      quantity: number;
      reason: string;
      reference?: string;
      balance: number;
    }>;
    summary: {
      totalIn: number;
      totalOut: number;
      netMovement: number;
      currentBalance: number;
    };
  }>> {
    try {
      const response = await this.api.get(`/inventory/movement/${productId}`, {
        params: { days },
      })
      return {
        success: true,
        data: response.data.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error ?? 'Failed to fetch stock movement',
      }
    }
  }

  /**
   * Audit inventory (count physical stock)
   */
  async auditInventory(auditData: {
    productId: string;
    countedStock: number;
    notes?: string;
    adjustments?: StockAdjustment[];
  }): Promise<InventoryApiResponse<{ audit: any; adjustments: InventoryLog[] }>> {
    try {
      const response = await this.api.post('/inventory/audit', auditData)
      return {
        success: true,
        data: response.data.data,
        message: response.data.message ?? 'Inventory audit completed successfully',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error ?? 'Failed to complete inventory audit',
      }
    }
  }
}

export const inventoryService = new InventoryService()
export default inventoryService