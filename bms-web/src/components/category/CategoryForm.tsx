'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { CategoryFormData, CategoryUpdateData, categorySchema, defaultCategoryValues } from '@/lib/validations/category';
import { apiService } from '@/services/api';
import { Category } from '@/types/category';
import { CategoryListResponse } from '@/types/api-responses';

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
import { Badge } from '@/components/ui/badge';
import { Loader2, Folder, AlertCircle, Tag } from 'lucide-react';

const fetcher = (url: string) => apiService.get(url);

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  category?: Category | null;
  parentId?: string;
  mode: 'create' | 'edit';
}

export function CategoryForm({ open, onOpenChange, onSuccess, category, parentId, mode }: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch categories for parent selection
  const { data: categoriesData } = useSWR(
    '/api/categories?limit=1000',
    fetcher
  );

  const categories = (categoriesData as CategoryListResponse)?.data?.items || [];

  // Get available parent categories (exclude current category and its descendants)
  const getAvailableParents = (): Category[] => {
    if (!categories.length) return [];

    const excludeIds = new Set<string>();
    
    // Exclude current category if editing
    if (category) {
      excludeIds.add(category.id);
      
      // Exclude descendants
      const addDescendants = (catId: string) => {
        const descendants = categories.filter(c => c.parentId === catId);
        descendants.forEach(desc => {
          excludeIds.add(desc.id);
          addDescendants(desc.id);
        });
      };
      addDescendants(category.id);
    }

    return categories.filter(cat => !excludeIds.has(cat.id));
  };

  const availableParents = getAvailableParents();

  // Initialize form with React Hook Form and Zod validation
  const form = useForm<CategoryFormData | CategoryUpdateData>({
    resolver: zodResolver(mode === 'create' ? categorySchema : categorySchema.partial()),
    defaultValues: mode === 'create' ? { ...defaultCategoryValues, parentId } : {},
    mode: 'onChange',
  });

  const {
    control,
    handleSubmit,
    formState: { isValid },
    reset,
    setValue,
    watch,
  } = form;

  watch();

  // Reset form when modal opens/closes or category changes
  useEffect(() => {
    if (!open) {
      reset(mode === 'create' ? { ...defaultCategoryValues, parentId } : {});
      setSubmitError(null);
    } else if (category && mode === 'edit') {
      reset({
        name: category.name || '',
        code: category.code || '',
        description: category.description || '',
        parentId: category.parentId || '',
        isActive: category.isActive,
        branchId: category.branchId || '',
      });
    } else if (parentId && mode === 'create') {
      setValue('parentId', parentId);
    }
  }, [open, category, mode, parentId, reset, setValue]);

  // Handle form submission
  const onSubmit = async (data: CategoryFormData | CategoryUpdateData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let response;
      
      if (mode === 'create') {
        response = await apiService.createCategory(data as CategoryFormData);
      } else if (category) {
        response = await apiService.updateCategory(category.id, data as CategoryUpdateData);
      } else {
        throw new Error('Invalid edit mode');
      }
      
      if (response.success) {
        toast.success(
          mode === 'create' ? 'Category created successfully!' : 'Category updated successfully!',
          {
            description: mode === 'create' 
              ? `${data.name} has been added to your categories.`
              : `${data.name} has been updated.`,
          }
        );
        
        // Reset form and close modal
        reset();
        onOpenChange(false);
        
        // Trigger SWR mutate to refresh the categories list
        mutate('/api/categories');
        mutate('/api/categories/tree');
        
        // Call onSuccess callback if provided
        onSuccess?.();
      } else {
      throw new Error(response.message || `Failed to ${mode} category`);
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || `Failed to ${mode} category`;
    setSubmitError(errorMessage);
    toast.error(`Failed to ${mode} category`, {
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

  // Get parent category name for display
  const getParentCategoryName = (parentId: string) => {
    const parent = categories.find(c => c.id === parentId);
    return parent ? parent.name : 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            {mode === 'create' ? 'Add New Category' : 'Edit Category'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a new category to organize your products. All fields marked with * are required.'
              : 'Update category information. All fields marked with * are required.'
            }
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
                {/* Name */}
                <FormField
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter category name" {...field} />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for the category
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Code */}
                <FormField
                  control={control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., ELEC" 
                          {...field} 
                          className="uppercase"
                        />
                      </FormControl>
                      <FormDescription>
                        Unique identifier (optional)
                      </FormDescription>
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
                        placeholder="Enter category description (optional)" 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Optional detailed description of the category
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Hierarchy Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Category Hierarchy
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Parent Category */}
                <FormField
                  control={control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Category</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select parent category (optional)" />
                          </SelectTrigger>
                        </Select>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No parent (Root category)</SelectItem>
                        {availableParents.map((parent) => (
                          <SelectItem key={parent.id} value={parent.id}>
                            <div className="flex items-center gap-2">
                              <span>{parent.name}</span>
                              {parent.code && (
                                <Badge variant="outline" className="text-xs">
                                  {parent.code}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                      <FormDescription>
                        {field.value ? `Current parent: ${getParentCategoryName(field.value)}` : 'This will be a root category'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <FormControl>
                        <Select onValueChange={(value) => field.onChange(value === 'true')} defaultValue={field.value?.toString() || 'true'}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </Select>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                      <FormDescription>
                        Inactive categories won't appear in product selection
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Category Preview (Edit mode) */}
            {mode === 'edit' && category && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Category Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Created:</span>
                    <p className="text-sm">{new Date(category.createdAt).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Last Updated:</span>
                    <p className="text-sm">{new Date(category.updatedAt).toLocaleDateString('id-ID')}</p>
                  </div>
                  {category.branch && (
                    <div className="md:col-span-2">
                      <span className="text-sm font-medium text-muted-foreground">Branch:</span>
                      <p className="text-sm">{category.branch.name}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                    {mode === 'create' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    <Folder className="w-4 h-4 mr-2" />
                    {mode === 'create' ? 'Create Category' : 'Update Category'}
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