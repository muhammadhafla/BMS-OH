import { z } from 'zod';

// Transaction item schema
export const transactionItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  discount: z.number().min(0, 'Discount cannot be negative').default(0),
  total: z.number().min(0, 'Total must be positive'),
  branchId: z.string().optional(),
});

// Create transaction schema
export const createTransactionSchema = z.object({
  items: z.array(transactionItemSchema).min(1, 'At least one item is required'),
  totalAmount: z.number().min(0, 'Total amount must be positive'),
  discount: z.number().min(0, 'Discount cannot be negative').default(0),
  tax: z.number().min(0, 'Tax cannot be negative').default(0),
  finalAmount: z.number().min(0, 'Final amount must be positive'),
  paymentMethod: z.enum(['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'QRIS'], {
    required_error: 'Payment method is required',
  }),
  amountPaid: z.number().min(0, 'Amount paid must be positive'),
  change: z.number().min(0, 'Change cannot be negative'),
  notes: z.string().optional(),
});

// Transaction filters schema
export const transactionFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED']).optional(),
  branchId: z.string().optional(),
  search: z.string().optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
});

// Transaction status update schema
export const updateTransactionStatusSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED'], {
    required_error: 'Status is required',
  }),
  notes: z.string().optional(),
});

// Refund request schema
export const refundRequestSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
  reason: z.string().min(1, 'Refund reason is required'),
  refundItems: z.array(z.object({
    itemId: z.string().min(1, 'Item ID is required'),
    quantity: z.number().min(1, 'Refund quantity must be positive'),
    refundAmount: z.number().min(0, 'Refund amount must be positive'),
  })).optional(),
  refundAmount: z.number().min(0, 'Refund amount must be positive'),
  notes: z.string().optional(),
});

// Transaction search schema
export const transactionSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  type: z.enum(['code', 'customer', 'product', 'all']).default('all'),
  filters: z.object({
    dateRange: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
    amountRange: z.object({
      min: z.number().min(0),
      max: z.number().min(0),
    }).optional(),
  }).optional(),
});

// Analytics date range schema
export const analyticsDateRangeSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  branchId: z.string().optional(),
});

// Export transactions schema
export const exportTransactionsSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'pdf']).default('csv'),
  filters: transactionFiltersSchema.partial(),
  includeDetails: z.boolean().default(false),
});

// Quick sale schema (for POS-style quick transactions)
export const quickSaleSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  paymentMethod: z.enum(['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'QRIS']),
  amountPaid: z.number().min(0, 'Amount paid must be positive'),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

// Manual transaction entry schema
export const manualTransactionSchema = createTransactionSchema.extend({
  customerInfo: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }).optional(),
  invoiceNumber: z.string().optional(),
  dueDate: z.string().optional(),
  isCredit: z.boolean().default(false),
});

// Bulk operations schema
export const bulkTransactionOperationsSchema = z.object({
  transactionIds: z.array(z.string()).min(1, 'At least one transaction ID is required'),
  operation: z.enum(['cancel', 'refund', 'export', 'print_receipts']),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

// Receipt template schema
export const receiptTemplateSchema = z.object({
  headerText: z.string().optional(),
  footerText: z.string().optional(),
  showLogo: z.boolean().default(true),
  showBranchAddress: z.boolean().default(true),
  showPaymentMethod: z.boolean().default(true),
  showItems: z.boolean().default(true),
  paperSize: z.enum(['a4', 'receipt', 'a5']).default('receipt'),
});

// Transaction report schema
export const transactionReportSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  includeCharts: z.boolean().default(true),
  groupBy: z.enum(['day', 'week', 'month', 'branch', 'product']).default('day'),
  branchIds: z.array(z.string()).optional(),
});

// Type exports
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type TransactionFiltersInput = z.infer<typeof transactionFiltersSchema>;
export type UpdateTransactionStatusInput = z.infer<typeof updateTransactionStatusSchema>;
export type RefundRequestInput = z.infer<typeof refundRequestSchema>;
export type TransactionSearchInput = z.infer<typeof transactionSearchSchema>;
export type AnalyticsDateRangeInput = z.infer<typeof analyticsDateRangeSchema>;
export type ExportTransactionsInput = z.infer<typeof exportTransactionsSchema>;
export type QuickSaleInput = z.infer<typeof quickSaleSchema>;
export type ManualTransactionInput = z.infer<typeof manualTransactionSchema>;
export type BulkTransactionOperationsInput = z.infer<typeof bulkTransactionOperationsSchema>;
export type ReceiptTemplateInput = z.infer<typeof receiptTemplateSchema>;
export type TransactionReportInput = z.infer<typeof transactionReportSchema>;