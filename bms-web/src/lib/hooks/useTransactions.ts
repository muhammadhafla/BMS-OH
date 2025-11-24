// Custom hook for transaction management
// Provides data fetching, caching, and state management for transactions

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  UnifiedTransaction,
  TransactionFilters,
  PaginatedTransactions,
  TransactionStatsUnified,
  UnifiedTransactionAnalytics,
  RefundRequest,
} from '@/types/unified';
import {
  updateTransactionStatusSchema,
  refundRequestSchema,
} from '@/lib/validations/transaction';
import { apiService } from '@/services/api';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
};

const fetcher = <T>(url: string) => apiService.get<ApiResponse<T>>(url);

export function useTransactions(initialFilters: TransactionFilters = {}) {
  const [filters, setFilters] = useState<TransactionFilters>(initialFilters);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch transactions with SWR
  const {
    data: transactionsResponse,
    error: transactionsError,
    isLoading: transactionsLoading,
    mutate: refreshTransactions,
  } = useSWR<ApiResponse<PaginatedTransactions>>(
    `/transactions?${new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)]))}`,
    (url) => fetcher<PaginatedTransactions>(url),
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  // Fetch transaction statistics
  const {
    data: statsResponse,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR<ApiResponse<TransactionStatsUnified>>(
    `/transactions/stats/summary?${new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)]))}`,
    (url) => fetcher<TransactionStatsUnified>(url),
    {
      refreshInterval: 60000, // Refresh every minute
    }
  );

  // Fetch analytics data
  const {
    data: analyticsResponse,
    error: analyticsError,
    isLoading: analyticsLoading,
  } = useSWR<ApiResponse<UnifiedTransactionAnalytics>>(
    `/transactions/analytics?${new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)]))}`,
    (url) => fetcher<UnifiedTransactionAnalytics>(url),
    {
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  );

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<TransactionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Search transactions
  const searchTransactions = useCallback(async (
    query: string,
    _type: 'code' | 'customer' | 'product' | 'all' = 'all'
  ) => {
    try {
      setSearchQuery(query);
      const searchFilters = {
        ...filters,
        search: query,
        page: 1,
      };
      setFilters(searchFilters);
      
      // Trigger SWR revalidation
      await refreshTransactions();
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed. Please try again.');
    }
  }, [filters, refreshTransactions]);

  // Get transaction details
  const getTransactionDetails = useCallback(async (transactionId: string): Promise<UnifiedTransaction> => {
    try {
      const response = await apiService.get<ApiResponse<{ transaction: UnifiedTransaction }>>(`/transactions/${transactionId}`);
      if (response.success) {
        return response.data.transaction;
      } else {
        throw new Error(response.error || 'Failed to fetch transaction details');
      }
    } catch (error) {
      console.error('Failed to fetch transaction details:', error);
      throw error;
    }
  }, []);

  // Create new transaction
  const createTransaction = useCallback(async (transactionData: any) => {
    try {
      const response = await apiService.post<ApiResponse<{ transaction: UnifiedTransaction }>>('/transactions', transactionData);
      if (response.success) {
        toast.success('Transaction created successfully');
        await refreshTransactions();
        return response.data.transaction;
      } else {
        throw new Error(response.error || 'Failed to create transaction');
      }
    } catch (error) {
      console.error('Failed to create transaction:', error);
      toast.error('Failed to create transaction. Please try again.');
      throw error;
    }
  }, [refreshTransactions]);

  // Update transaction status
  const updateTransactionStatus = useCallback(async (
    transactionId: string,
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED',
    notes?: string
  ): Promise<void> => {
    try {
      // Validate input
      const validatedData = updateTransactionStatusSchema.parse({ status, notes });
      
      const response = await apiService.patch<ApiResponse<{ transaction: UnifiedTransaction }>>(`/transactions/${transactionId}/status`, validatedData);
      if (response.success) {
        toast.success('Transaction status updated successfully');
        await refreshTransactions();
        return;
      } else {
        throw new Error(response.error || 'Failed to update transaction status');
      }
    } catch (error) {
      console.error('Failed to update transaction status:', error);
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to update transaction status');
      } else {
        toast.error('Failed to update transaction status. Please try again.');
      }
      throw error;
    }
  }, [refreshTransactions]);

  // Process refund
  const processRefund = useCallback(async (refundData: RefundRequest) => {
    try {
      // Validate input
      const validatedData = refundRequestSchema.parse(refundData);
      
      const response = await apiService.post<ApiResponse<any>>(`/transactions/${refundData.transactionId}/refund`, validatedData);
      if (response.success) {
        toast.success('Refund processed successfully');
        await refreshTransactions();
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to process refund');
      }
    } catch (error) {
      console.error('Failed to process refund:', error);
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to process refund');
      } else {
        toast.error('Failed to process refund. Please try again.');
      }
      throw error;
    }
  }, [refreshTransactions]);

  // Export transactions
  const exportTransactions = useCallback(async (format: 'csv' | 'xlsx' | 'pdf', exportFilters?: Partial<TransactionFilters>) => {
    try {
      const paramsArray = [
        ['format', format],
        ...Object.entries(exportFilters || filters).map(([key, value]) => [key, String(value)]),
      ];
      const params = new URLSearchParams(paramsArray);
      
      const response = await apiService.get(`/transactions/export?${params.toString()}`, {
        responseType: 'blob',
      }) as unknown as Blob;
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Failed to export transactions:', error);
      toast.error('Failed to export transactions. Please try again.');
      throw error;
    }
  }, [filters]);

  // Generate receipt
  const generateReceipt = useCallback(async (transactionId: string, format: 'pdf' | 'print' = 'pdf') => {
    try {
      if (format === 'print') {
        // Open print dialog
        const receiptWindow = window.open(`/transactions/${transactionId}/receipt/print`, '_blank');
        if (receiptWindow) {
          receiptWindow.focus();
          receiptWindow.print();
        }
      } else {
        // Download PDF
        const response = await apiService.get(`/transactions/${transactionId}/receipt/pdf`, {
          responseType: 'blob',
        }) as unknown as Blob;
        
        const url = window.URL.createObjectURL(new Blob([response]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `receipt-${transactionId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
      
      toast.success('Receipt generated successfully');
    } catch (error) {
      console.error('Failed to generate receipt:', error);
      toast.error('Failed to generate receipt. Please try again.');
      throw error;
    }
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setFilters(prev => {
      const { search, ...rest } = prev;
      return { ...rest, page: 1 };
    });
  }, []);

  // Get transactions by status
  const getTransactionsByStatus = useCallback((status: string) => {
    if (!transactionsResponse?.data?.transactions) return [];
    return transactionsResponse.data.transactions.filter(t => t.status === status);
  }, [transactionsResponse?.data?.transactions]);

  // Get top products
  const getTopProducts = useCallback(() => {
    return statsResponse?.data?.topProducts || [];
  }, [statsResponse?.data?.topProducts]);

  // Computed values
  const transactions = transactionsResponse?.data?.transactions || [];
  const pagination = transactionsResponse?.data?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  };
  const stats = statsResponse?.data;
  const analytics = analyticsResponse?.data;
  const loading = transactionsLoading || statsLoading || analyticsLoading;
  const error = transactionsError || statsError || analyticsError;

  return {
    // Data
    transactions,
    stats,
    analytics,
    pagination,
    searchQuery,
    
    // Loading and error states
    loading,
    error,
    
    // Actions
    updateFilters,
    searchTransactions,
    clearSearch,
    getTransactionDetails,
    createTransaction,
    updateTransactionStatus,
    processRefund,
    exportTransactions,
    generateReceipt,
    refreshTransactions,
    
    // Computed helpers
    getTransactionsByStatus,
    getTopProducts,
  };
}