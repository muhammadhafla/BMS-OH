import { z } from 'zod';

// CSV Import validation schema for each row
export const csvImportRowSchema = z.object({
  sku: z.string()
    .min(1, 'SKU is required')
    .max(50, 'SKU must be less than 50 characters')
    .regex(/^[A-Z0-9-_]+$/, 'SKU must contain only uppercase letters, numbers, hyphens, and underscores'),
  
  name: z.string()
    .min(1, 'Product name is required')
    .max(255, 'Product name must be less than 255 characters')
    .trim(),
  
  price: z.string()
    .min(1, 'Price is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Price must be a non-negative number')
    .transform((val) => Number(val)),
  
  cost: z.string()
    .min(1, 'Cost is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Cost must be a non-negative number')
    .transform((val) => Number(val)),
  
  stock: z.string()
    .min(1, 'Stock is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val)), 'Stock must be a non-negative whole number')
    .transform((val) => Number(val)),
  
  // Optional fields
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional()
    .or(z.literal(''))
    .transform(val => val || ''),
  
  barcode: z.string()
    .max(50, 'Barcode must be less than 50 characters')
    .trim()
    .optional()
    .or(z.literal(''))
    .transform(val => val || ''),
  
  unit: z.string()
    .max(20, 'Unit must be less than 20 characters')
    .trim()
    .optional()
    .or(z.literal(''))
    .transform(val => val || 'pcs'),
  
  minStock: z.string()
    .optional()
    .or(z.literal(''))
    .refine(val => !val || val === '' || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), 'MinStock must be a non-negative whole number')
    .transform(val => !val || val === '' ? 0 : Number(val)),
  
  maxStock: z.string()
    .optional()
    .or(z.literal(''))
    .refine(val => !val || val === '' || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), 'MaxStock must be a non-negative whole number')
    .transform(val => !val || val === '' ? 100 : Number(val)),
}).refine((data) => {
  // Cross-field validation
  if (data.stock > data.maxStock) {
    return false;
  }
  return true;
}, {
  message: 'Current stock cannot exceed maximum stock level',
  path: ['stock'],
}).refine((data) => {
  if (data.maxStock <= data.minStock) {
    return false;
  }
  return true;
}, {
  message: 'Maximum stock must be greater than minimum stock',
  path: ['maxStock'],
});

// CSV Import validation schema for the entire file
export const csvImportFileSchema = z.object({
  rows: z.array(csvImportRowSchema),
  duplicates: z.array(z.object({
    sku: z.string(),
    rowIndex: z.number(),
  })),
  errors: z.array(z.object({
    rowIndex: z.number(),
    field: z.string(),
    message: z.string(),
  })),
});

// TypeScript types
export type CsvImportRow = z.infer<typeof csvImportRowSchema>;
export type CsvImportFile = z.infer<typeof csvImportFileSchema>;

// Import status types
export interface ImportStatus {
  id: string;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentBatch?: number;
  totalBatches?: number;
  errors: ImportError[];
  startedAt: string;
  completedAt?: string;
}

export interface ImportError {
  rowIndex: number;
  field: string;
  message: string;
  sku?: string;
  value?: string;
}

// Import result types
export interface ImportResult {
  id: string;
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: ImportError[];
  duration: number;
  startedAt: string;
  completedAt: string;
  duplicateSkus: string[];
}

// CSV template configuration
export const CSV_TEMPLATE = {
  headers: [
    'SKU',
    'Name', 
    'Price',
    'Cost',
    'Stock',
    'Description',
    'Barcode',
    'Unit',
    'MinStock',
    'MaxStock'
  ],
  sampleData: [
    ['ELEC001', 'Samsung Galaxy S24', '15000000', '12000000', '50', 'Latest Samsung smartphone', '880123456789', 'pcs', '5', '100'],
    ['CLOTH002', 'Cotton T-Shirt', '85000', '45000', '200', '100% cotton t-shirt', '', 'pcs', '20', '500'],
    ['FOOD003', 'Organic Coffee Beans', '125000', '85000', '75', 'Premium arabica coffee beans', '899123456789', 'kg', '10', '200']
  ]
};