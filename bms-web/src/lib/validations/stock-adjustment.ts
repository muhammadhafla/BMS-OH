import { z } from 'zod';

// Stock adjustment types
export const ADJUSTMENT_TYPES = {
  INCREMENT: 'INCREMENT',
  DECREMENT: 'DECREMENT',
  SET_TO: 'SET_TO',
} as const;

// Stock adjustment reasons with categories
export const ADJUSTMENT_REASONS = {
  // Positive adjustments
  PURCHASE: 'Purchase Order Received',
  RETURN: 'Customer Return',
  FOUND: 'Stock Found (Inventory Count)',
  TRANSFER_IN: 'Transfer from Another Branch',
  PRODUCTION: 'Production/Manufacturing',
  CORRECTION_INCREASE: 'Correction - Increase',
  
  // Negative adjustments
  DAMAGED: 'Damaged/Defective',
  EXPIRED: 'Expired',
  LOST: 'Lost/Missing',
  THEFT: 'Theft/Shrinkage',
  TRANSFER_OUT: 'Transfer to Another Branch',
  SAMPLE: 'Sample/Demo',
  CORRECTION_DECREASE: 'Correction - Decrease',
  WASTE: 'Waste/Spoilage',
  
  // Other
  INITIAL_STOCK: 'Initial Stock Entry',
  RECOUNT: 'Physical Inventory Recount',
  OTHER: 'Other (Specify in Notes)',
} as const;

// Get reasons by adjustment type
export const getReasonsByType = (type: keyof typeof ADJUSTMENT_TYPES) => {
  if (type === 'INCREMENT') {
    return [
      ADJUSTMENT_REASONS.PURCHASE,
      ADJUSTMENT_REASONS.RETURN,
      ADJUSTMENT_REASONS.FOUND,
      ADJUSTMENT_REASONS.TRANSFER_IN,
      ADJUSTMENT_REASONS.PRODUCTION,
      ADJUSTMENT_REASONS.CORRECTION_INCREASE,
      ADJUSTMENT_REASONS.INITIAL_STOCK,
      ADJUSTMENT_REASONS.RECOUNT,
      ADJUSTMENT_REASONS.OTHER,
    ];
  } else if (type === 'DECREMENT') {
    return [
      ADJUSTMENT_REASONS.DAMAGED,
      ADJUSTMENT_REASONS.EXPIRED,
      ADJUSTMENT_REASONS.LOST,
      ADJUSTMENT_REASONS.THEFT,
      ADJUSTMENT_REASONS.TRANSFER_OUT,
      ADJUSTMENT_REASONS.SAMPLE,
      ADJUSTMENT_REASONS.CORRECTION_DECREASE,
      ADJUSTMENT_REASONS.WASTE,
      ADJUSTMENT_REASONS.OTHER,
    ];
  } else {
    return Object.values(ADJUSTMENT_REASONS);
  }
};

// Individual stock adjustment schema
export const stockAdjustmentSchema = z.object({
  adjustmentType: z.enum(['INCREMENT', 'DECREMENT', 'SET_TO'], {
    required_error: 'Adjustment type is required',
  }),
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(999999, 'Quantity cannot exceed 999,999'),
  reason: z.string()
    .min(1, 'Reason is required')
    .max(500, 'Reason cannot exceed 500 characters'),
  notes: z.string()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional()
    .or(z.literal('')),
  reference: z.string()
    .max(100, 'Reference cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  requiresApproval: z.boolean().optional(),
});

export type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>;

// Bulk stock adjustment schema
export const bulkStockAdjustmentSchema = z.object({
  adjustments: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      sku: z.string().optional(),
      adjustmentType: z.enum(['INCREMENT', 'DECREMENT', 'SET_TO']),
      quantity: z.number()
        .int('Quantity must be a whole number')
        .min(1, 'Quantity must be at least 1')
        .max(999999, 'Quantity cannot exceed 999,999'),
      reason: z.string().min(1, 'Reason is required'),
      notes: z.string().optional(),
      reference: z.string().optional(),
    })
  ).min(1, 'At least one adjustment is required'),
  globalReason: z.string().optional(),
  globalReference: z.string().optional(),
});

export type BulkStockAdjustmentFormData = z.infer<typeof bulkStockAdjustmentSchema>;

// Stock adjustment approval schema
export const stockAdjustmentApprovalSchema = z.object({
  adjustmentId: z.string().min(1, 'Adjustment ID is required'),
  status: z.enum(['APPROVED', 'REJECTED'], {
    required_error: 'Approval status is required',
  }),
  approvalNotes: z.string()
    .max(500, 'Approval notes cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
});

export type StockAdjustmentApprovalFormData = z.infer<typeof stockAdjustmentApprovalSchema>;

// Stock adjustment filter schema
export const stockAdjustmentFilterSchema = z.object({
  productId: z.string().optional(),
  branchId: z.string().optional(),
  adjustmentType: z.enum(['INCREMENT', 'DECREMENT', 'SET_TO', 'ALL']).optional(),
  reason: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ALL']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  performedBy: z.string().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['date', 'quantity', 'product', 'user']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type StockAdjustmentFilterData = z.infer<typeof stockAdjustmentFilterSchema>;

// Low stock alert schema
export const lowStockAlertSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  threshold: z.number()
    .int('Threshold must be a whole number')
    .min(0, 'Threshold cannot be negative')
    .max(999999, 'Threshold cannot exceed 999,999'),
  enabled: z.boolean(),
  notifyUsers: z.array(z.string()).optional(),
  notifyRoles: z.array(z.enum(['ADMIN', 'MANAGER', 'STAFF'])).optional(),
});

export type LowStockAlertFormData = z.infer<typeof lowStockAlertSchema>;

// CSV import schema for bulk adjustments
export const csvStockAdjustmentSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  adjustmentType: z.enum(['INCREMENT', 'DECREMENT', 'SET_TO'], {
    required_error: 'Adjustment type is required',
  }),
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(999999, 'Quantity cannot exceed 999,999'),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
  reference: z.string().optional(),
});

export type CsvStockAdjustmentData = z.infer<typeof csvStockAdjustmentSchema>;

// Stock valuation schema
export const stockValuationSchema = z.object({
  method: z.enum(['FIFO', 'LIFO', 'AVERAGE', 'SPECIFIC'], {
    required_error: 'Valuation method is required',
  }),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  branchId: z.string().optional(),
  categoryId: z.string().optional(),
});

export type StockValuationFormData = z.infer<typeof stockValuationSchema>;

// Default values
export const defaultStockAdjustmentValues: StockAdjustmentFormData = {
  adjustmentType: 'INCREMENT',
  quantity: 0,
  reason: '',
  notes: '',
  reference: '',
  requiresApproval: false,
};

export const defaultBulkStockAdjustmentValues: BulkStockAdjustmentFormData = {
  adjustments: [],
  globalReason: '',
  globalReference: '',
};

export const defaultStockAdjustmentFilterValues: StockAdjustmentFilterData = {
  adjustmentType: 'ALL',
  status: 'ALL',
  page: 1,
  limit: 20,
  sortBy: 'date',
  sortOrder: 'desc',
};

// Validation helpers
export const validateStockAdjustment = (data: unknown) => {
  return stockAdjustmentSchema.safeParse(data);
};

export const validateBulkStockAdjustment = (data: unknown) => {
  return bulkStockAdjustmentSchema.safeParse(data);
};

export const validateStockAdjustmentFilter = (data: unknown) => {
  return stockAdjustmentFilterSchema.safeParse(data);
};

// Business rule validators
export const requiresApproval = (quantity: number, userRole: string): boolean => {
  // Large adjustments (>100 items) require approval
  if (quantity > 100) return true;
  
  // STAFF role requires approval for any adjustment
  if (userRole === 'STAFF') return true;
  
  return false;
};

export const canApproveAdjustment = (userRole: string): boolean => {
  return userRole === 'ADMIN' || userRole === 'MANAGER';
};

export const canPerformBulkAdjustment = (userRole: string): boolean => {
  return userRole === 'ADMIN' || userRole === 'MANAGER';
};