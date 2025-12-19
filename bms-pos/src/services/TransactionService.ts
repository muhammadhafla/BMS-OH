/**
 * Transaction Service
 * Handles transaction-related API calls
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { sessionManager } from './SessionManager';

export interface Transaction {
  id: string;
  transactionCode: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
  }>;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  status: string;
  createdAt: string;
}

export interface TransactionParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  paymentMethod?: string;
}

export interface TransactionApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary?: {
    totalSales: number;
    totalRevenue: number;
    averageTransaction: number;
  };
}

class TransactionService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = this.detectApiEndpoint();
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Info': 'BMS-POS-PWA/1.0'
      },
    });

    this.setupInterceptors();
  }

  private detectApiEndpoint(): string {
    const savedEndpoint = localStorage.getItem('bms_api_endpoint');
    if (savedEndpoint) {
      return savedEndpoint;
    }

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      if (port && ['5173', '5174', '4173'].includes(port)) {
        return 'http://localhost:3001/api';
      }
      if (port === '3000') {
        return 'http://localhost:3001/api';
      }
      return 'http://localhost:3001/api';
    }
    
    return 'http://localhost:3001/api';
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use(
      (config) => {
        const session = sessionManager.getSession();
        if (session?.token) {
          config.headers.Authorization = `Bearer ${session.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          sessionManager.clearSession();
          window.dispatchEvent(new CustomEvent('pos-logout'));
        }
        return Promise.reject(error);
      }
    );
  }

  private async makeRequestWithRetry(requestFn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;
        
        if (error.response?.status === 401) {
          throw error;
        }
        
        if ((error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR' || !error.response) && attempt < maxRetries) {
          console.warn(`Transaction request failed (attempt ${attempt}/${maxRetries}), retrying...`);
          continue;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Create new transaction
   */
  async createTransaction(transactionData: Partial<Transaction>): Promise<TransactionApiResponse<{ transaction: Transaction }>> {
    try {
      return await this.makeRequestWithRetry(async () => {
        const response = await this.api.post('/transactions', transactionData);
        return {
          success: true,
          data: response.data.data,
          message: response.data.message || 'Transaction created successfully'
        };
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create transaction'
      };
    }
  }

  /**
   * Get transactions with filtering and pagination
   */
  async getTransactions(params: TransactionParams = {}): Promise<TransactionApiResponse<TransactionListResponse>> {
    try {
      return await this.makeRequestWithRetry(async () => {
        const response = await this.api.get('/transactions', { params });
        return {
          success: true,
          data: response.data.data
        };
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch transactions'
      };
    }
  }

  /**
   * Get single transaction by ID
   */
  async getTransaction(id: string): Promise<TransactionApiResponse<{ transaction: Transaction }>> {
    try {
      const response = await this.api.get(`/transactions/${id}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch transaction'
      };
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(id: string, status: string): Promise<TransactionApiResponse<{ transaction: Transaction }>> {
    try {
      const response = await this.api.patch(`/transactions/${id}/status`, { status });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Transaction status updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update transaction status'
      };
    }
  }

  /**
   * Cancel transaction
   */
  async cancelTransaction(id: string, reason?: string): Promise<TransactionApiResponse> {
    try {
      const response = await this.api.post(`/transactions/${id}/cancel`, { reason });
      return {
        success: true,
        message: response.data.message || 'Transaction cancelled successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to cancel transaction'
      };
    }
  }

  /**
   * Refund transaction
   */
  async refundTransaction(id: string, refundData: {
    items?: Array<{ productId: string; quantity: number }>;
    amount?: number;
    reason: string;
  }): Promise<TransactionApiResponse<{ refund: any }>> {
    try {
      const response = await this.api.post(`/transactions/${id}/refund`, refundData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Transaction refunded successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to refund transaction'
      };
    }
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  } = {}): Promise<TransactionApiResponse<{
    summary: {
      totalTransactions: number;
      totalRevenue: number;
      averageTransaction: number;
      refundRate: number;
    };
    trends: Array<{
      date: string;
      transactions: number;
      revenue: number;
    }>;
    topProducts: Array<{
      productId: string;
      productName: string;
      quantity: number;
      revenue: number;
    }>;
  }>> {
    try {
      const response = await this.api.get('/transactions/stats', { params });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch transaction statistics'
      };
    }
  }

  /**
   * Export transactions
   */
  async exportTransactions(params: TransactionParams & {
    format?: 'csv' | 'xlsx' | 'pdf';
  } = {}): Promise<Blob> {
    try {
      const response = await this.api.get('/transactions/export', {
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to export transactions');
    }
  }

  /**
   * Print transaction receipt
   */
  async printReceipt(id: string): Promise<TransactionApiResponse<{ receipt: any }>> {
    try {
      const response = await this.api.post(`/transactions/${id}/print`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Receipt printed successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to print receipt'
      };
    }
  }

  /**
   * Email receipt
   */
  async emailReceipt(id: string, email: string): Promise<TransactionApiResponse> {
    try {
      const response = await this.api.post(`/transactions/${id}/email`, { email });
      return {
        success: true,
        message: response.data.message || 'Receipt sent successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to email receipt'
      };
    }
  }

  /**
   * Get daily sales summary
   */
  async getDailySummary(date: string): Promise<TransactionApiResponse<{
    date: string;
    totalSales: number;
    totalRevenue: number;
    transactionCount: number;
    averageTransaction: number;
    topPaymentMethods: Array<{
      method: string;
      count: number;
      amount: number;
    }>;
  }>> {
    try {
      const response = await this.api.get(`/transactions/daily-summary/${date}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch daily summary'
      };
    }
  }

  /**
   * Search transactions
   */
  async searchTransactions(query: string, limit: number = 10): Promise<TransactionApiResponse<{ transactions: Transaction[] }>> {
    try {
      const response = await this.api.get('/transactions/search', {
        params: { q: query, limit }
      });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to search transactions'
      };
    }
  }
}

export const transactionService = new TransactionService();
export default transactionService;