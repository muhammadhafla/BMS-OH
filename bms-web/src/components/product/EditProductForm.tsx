'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { ProductFormData, productSchema } from '@/lib/validations/product';
import { apiService } from '@/services/api';
import type { CategoryListResponse, BranchListResponse } from '@/types/api-responses';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Edit3, AlertCircle, DollarSign, Hash, Tag } from 'lucide-react';

const fetcher = <T,>(url: string): Promise<T> => apiService.get<T>(url);

interface Category {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  barcode: string;
  category: {
    id: string;
    name: string;
  } | null;
  branch: {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EditProductFormProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditProductForm({ product, open, onOpenChange, onSuccess }: EditProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch categories and branches
  const { data: categoriesData } = useSWR<CategoryListResponse>(
    '/api/categories',
    fetcher
  );
  const { data: branchesData } = useSWR<BranchListResponse>(
    '/api/branches',
    fetcher
  );

  const categories = categoriesData?.data?.items || [];
  const branches = branchesData?.data?.items || [];

  // Initialize form with React Hook Form and Zod validation
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    mode: 'onChange',
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = form;

  // Populate form with product data when modal opens
  useEffect(() => {
    if (open && product) {
      setValue('sku', product.sku);
      setValue('name', product.name);
      setValue('description', product.description || '');
      setValue('price', product.price);
      setValue('cost', product.cost);
      setValue('stock', product.stock);
      setValue('minStock', product.minStock);
      setValue('maxStock', product.maxStock);
      setValue('unit', product.unit);
      setValue('barcode', product.barcode || '');
      setValue('categoryId', product.category?.id || '');
      setValue('branchId', product.branch.id);
    }
  }, [open, product, setValue]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSubmitError(null);
    }
  }, [open]);

  // Format currency input
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    const number = parseFloat(numericValue) || 0;
    return number.toString();
  };

  const handleCurrencyChange = (field: keyof ProductFormData, value: string) => {
    const numericValue = parseFloat(formatCurrency(value)) || 0;
    setValue(field, numericValue);
  };

  // Handle form submission
  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await apiService.updateProduct(product.id, data);
      
      if (response.success) {
        toast.success('Product updated successfully!', {
          description: `${data.name} has been updated.`,
        });
        
        // Close modal
        onOpenChange(false);
        
        // Trigger SWR mutate to refresh the data
        mutate(`/api/products/${product.id}`);
        mutate('/api/products');
        
        // Call onSuccess callback
        onSuccess();
      } else {
        throw new Error(response.message || 'Failed to update product');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update product';
      setSubmitError(errorMessage);
      toast.error('Failed to update product', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
    }
  };

  // Format currency display
  const formatCurrencyDisplay = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Product
          </DialogTitle>
          <DialogDescription>
            Update product information. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Alert */}
            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SKU */}
                <FormField
                  control={control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., PROD-001" 
                          {...field} 
                          className="uppercase"
                        />
                      </FormControl>
                      <FormDescription>
                        Unique product identifier (letters, numbers, hyphens, underscores only)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Name */}
                <FormField
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter product description" 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Optional detailed description of the product
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category and Branch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category */}
                <FormField
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Branch */}
                <FormField
                  control={control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pricing
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cost */}
                <FormField
                  control={control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost *</FormLabel>
                      <FormControl>
                        <Input 
                          type="text"
                          placeholder="0"
                          value={field.value}
                          onChange={(e) => handleCurrencyChange('cost', e.target.value)}
                          className="text-right"
                        />
                      </FormControl>
                      <FormDescription>
                        Cost price: {formatCurrencyDisplay(field.value || 0)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price */}
                <FormField
                  control={control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selling Price *</FormLabel>
                      <FormControl>
                        <Input 
                          type="text"
                          placeholder="0"
                          value={field.value}
                          onChange={(e) => handleCurrencyChange('price', e.target.value)}
                          className="text-right"
                        />
                      </FormControl>
                      <FormDescription>
                        Selling price: {formatCurrencyDisplay(field.value || 0)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Inventory Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Inventory
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stock */}
                <FormField
                  control={control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Stock *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          max="999999"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Min Stock */}
                <FormField
                  control={control}
                  name="minStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Stock *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          max="999999"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Max Stock */}
                <FormField
                  control={control}
                  name="maxStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Stock *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          max="999999"
                          placeholder="100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Unit */}
                <FormField
                  control={control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="g">Grams (g)</SelectItem>
                          <SelectItem value="l">Liters (l)</SelectItem>
                          <SelectItem value="ml">Milliliters (ml)</SelectItem>
                          <SelectItem value="m">Meters (m)</SelectItem>
                          <SelectItem value="cm">Centimeters (cm)</SelectItem>
                          <SelectItem value="box">Boxes (box)</SelectItem>
                          <SelectItem value="pack">Packs (pack)</SelectItem>
                          <SelectItem value="bottle">Bottles (bottle)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Barcode */}
                <FormField
                  control={control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter barcode (optional)" {...field} />
                      </FormControl>
                      <FormDescription>
                        Optional barcode or UPC code
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isValid}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Update Product
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}