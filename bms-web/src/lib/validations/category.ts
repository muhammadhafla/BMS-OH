import { z } from 'zod';

// Category creation validation schema
export const categorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(255, 'Category name must be less than 255 characters')
    .trim(),
  
  code: z.string()
    .max(20, 'Category code must be less than 20 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  parentId: z.string()
    .min(1, 'Parent category is required')
    .optional()
    .or(z.literal('')),
  
  isActive: z.boolean()
    .default(true),
  
  branchId: z.string()
    .optional()
    .or(z.literal(''))
});

// Category update validation schema (partial)
export const categoryUpdateSchema = categorySchema.partial().extend({
  parentId: z.string()
    .optional()
    .nullable()
});

// Bulk update products schema
export const bulkUpdateProductsSchema = z.object({
  productIds: z.array(z.string().min(1, 'Product ID is required'))
    .min(1, 'At least one product must be selected'),
  
  categoryId: z.string()
    .min(1, 'Category is required')
});

// TypeScript types for the form data
export type CategoryFormData = z.infer<typeof categorySchema>;
export type CategoryUpdateData = z.infer<typeof categoryUpdateSchema>;
export type BulkUpdateProductsData = z.infer<typeof bulkUpdateProductsSchema>;

// Import/Export validation schema
export const categoryImportSchema = z.object({
  categories: z.array(z.object({
    name: z.string().min(1, 'Category name is required'),
    code: z.string().optional(),
    description: z.string().optional(),
    parentId: z.string().optional(),
    isActive: z.boolean().default(true),
  })).min(1, 'At least one category is required')
});

// Import result type
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

// Default values for the form
export const defaultCategoryValues: CategoryFormData = {
  name: '',
  code: '',
  description: '',
  parentId: '',
  isActive: true,
  branchId: '',
};