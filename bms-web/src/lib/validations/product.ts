import { z } from 'zod';

// Product creation validation schema
export const productSchema = z.object({
  sku: z.string()
    .min(1, 'SKU is required')
    .max(50, 'SKU must be less than 50 characters')
    .regex(/^[A-Z0-9-_]+$/, 'SKU must contain only uppercase letters, numbers, hyphens, and underscores'),
  
  name: z.string()
    .min(1, 'Product name is required')
    .max(255, 'Product name must be less than 255 characters')
    .trim(),
  
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  price: z.number()
    .min(0, 'Price must be non-negative')
    .max(999999999, 'Price cannot exceed 999,999,999'),
  
  cost: z.number()
    .min(0, 'Cost must be non-negative')
    .max(999999999, 'Cost cannot exceed 999,999,999'),
  
  stock: z.number()
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative')
    .max(999999, 'Stock cannot exceed 999,999'),
  
  minStock: z.number()
    .int('Minimum stock must be a whole number')
    .min(0, 'Minimum stock cannot be negative')
    .max(999999, 'Minimum stock cannot exceed 999,999'),
  
  maxStock: z.number()
    .int('Maximum stock must be a whole number')
    .min(0, 'Maximum stock cannot be negative')
    .max(999999, 'Maximum stock cannot exceed 999,999'),
  
  unit: z.string()
    .min(1, 'Unit is required')
    .max(20, 'Unit must be less than 20 characters')
    .trim(),
  
  barcode: z.string()
    .max(50, 'Barcode must be less than 50 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  categoryId: z.string()
    .min(1, 'Category is required'),
  
  branchId: z.string()
    .min(1, 'Branch is required'),
}).refine((data) => {
  // Additional cross-field validation
  if (data.stock > data.maxStock) {
    return false;
  }
  if (data.maxStock <= data.minStock) {
    return false;
  }
  return true;
}, {
  message: 'Current stock cannot exceed maximum stock level or maximum stock must be greater than minimum stock',
  path: ['stock'],
});

// TypeScript type for the form data
export type ProductFormData = z.infer<typeof productSchema>;

// Default values for the form
export const defaultProductValues: ProductFormData = {
  sku: '',
  name: '',
  description: '',
  price: 0,
  cost: 0,
  stock: 0,
  minStock: 0,
  maxStock: 100,
  unit: 'pcs',
  barcode: '',
  categoryId: '',
  branchId: '',
};