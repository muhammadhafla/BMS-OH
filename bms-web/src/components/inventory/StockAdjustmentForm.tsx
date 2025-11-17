'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { mutate } from 'swr';
import { toast } from 'sonner';
import { apiService } from '@/services/api';
import {
  stockAdjustmentSchema,
  type StockAdjustmentFormData,
  ADJUSTMENT_REASONS,
  getReasonsByType,
  requiresApproval,
} from '@/lib/validations/stock-adjustment';
import { useAuthStore } from '@/stores/authStore';

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
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Settings,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Hash,
  Info,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  stock: number;
  unit: string;
  minStock: number;
  maxStock: number;
  branch: {
    id: string;
    name: string;
  };
}

interface StockAdjustmentFormProps {
  product?: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  selectedProduct?: Product | null;
}

export function StockAdjustmentForm({ 
  product, 
  open, 
  onOpenChange, 
  onSuccess, 
  selectedProduct 
}: StockAdjustmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Use selectedProduct if available, otherwise use product prop
  const targetProduct = selectedProduct || product;

  // Initialize form
  const form = useForm<StockAdjustmentFormData>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      adjustmentType: 'INCREMENT',
      quantity: 0,
      reason: '',
      notes: '',
      reference: '',
      requiresApproval: false,
    },
    mode: 'onChange',
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    reset,
  } = form;

  const watchedValues = watch();

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      reset({
        adjustmentType: 'INCREMENT',
        quantity: 0,
        reason: '',
        notes: '',
        reference: '',
        requiresApproval: false,
      });
      setSubmitError(null);
    }
  }, [open, reset]);

  // Calculate new stock based on adjustment
  const calculateNewStock = () => {
    if (!targetProduct) return 0;
    const { adjustmentType, quantity } = watchedValues;
    if (!quantity) return targetProduct.stock;

    switch (adjustmentType) {
      case 'INCREMENT':
        return targetProduct.stock + quantity;
      case 'DECREMENT':
        return Math.max(0, targetProduct.stock - quantity);
      case 'SET_TO':
        return quantity;
      default:
        return targetProduct.stock;
    }
  };

  const newStock = targetProduct ? calculateNewStock() : 0;
  const stockChange = targetProduct ? newStock - targetProduct.stock : 0;

  // Get adjustment type styling
  const getAdjustmentTypeStyle = (type: string) => {
    switch (type) {
      case 'INCREMENT':
        return { variant: 'default' as const, icon: TrendingUp, color: 'text-green-600', text: 'Add Stock' };
      case 'DECREMENT':
        return { variant: 'destructive' as const, icon: TrendingDown, color: 'text-red-600', text: 'Remove Stock' };
      case 'SET_TO':
        return { variant: 'secondary' as const, icon: Hash, color: 'text-blue-600', text: 'Set to Exact' };
      default:
        return { variant: 'outline' as const, icon: Settings, color: 'text-gray-600', text: type };
    }
  };

  // Get stock status after adjustment
  const getStockStatus = (stock: number) => {
    if (!targetProduct) {
      return { color: 'destructive', text: 'No Product', icon: AlertCircle };
    }
    if (stock <= 0) {
      return { color: 'destructive', text: 'Out of Stock', icon: AlertCircle };
    } else if (stock <= targetProduct.minStock) {
      return { color: 'secondary', text: 'Low Stock', icon: AlertCircle };
    } else if (stock >= targetProduct.maxStock) {
      return { color: 'default', text: 'Overstock', icon: TrendingUp };
    } else {
      return { color: 'default', text: 'Normal', icon: TrendingUp };
    }
  };

  const newStockStatus = getStockStatus(newStock);

  // Check if approval is required
  const needsApproval = user ? requiresApproval(watchedValues.quantity || 0, user.role) : false;

  // Get available reasons based on adjustment type
  const availableReasons = getReasonsByType(watchedValues.adjustmentType);

  // Handle form submission
  const onSubmit = async (data: StockAdjustmentFormData) => {
    if (!targetProduct) {
      setSubmitError('No product selected');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const adjustmentData = {
        adjustmentType: data.adjustmentType,
        quantity: data.quantity,
        reason: data.reason,
        notes: data.notes,
        reference: data.reference,
        requiresApproval: needsApproval,
      };

      const response = await apiService.updateProductStock(targetProduct.id, adjustmentData);
      
      if (response.success) {
        const message = needsApproval
          ? 'Stock adjustment submitted for approval'
          : 'Stock adjusted successfully!';
        const description = needsApproval
          ? `Adjustment for ${targetProduct.name} is pending approval.`
          : `Stock for ${targetProduct.name} has been updated.`;
        
        toast.success(message, { description });
        
        // Close modal
        onOpenChange(false);
        
        // Trigger SWR mutate to refresh the data
        mutate(`/api/products/${targetProduct.id}`);
        mutate('/api/products');
        
        // Call onSuccess callback
        onSuccess();
      } else {
        throw new Error(response.error || 'Failed to adjust stock');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to adjust stock';
      setSubmitError(errorMessage);
      toast.error('Failed to adjust stock', {
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Adjust Stock
          </DialogTitle>
          <DialogDescription>
            {targetProduct 
              ? `Adjust the stock level for ${targetProduct.name} (SKU: ${targetProduct.sku})`
              : 'Adjust stock levels for products'
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

            {/* Product Selection (if no product provided) */}
            {!targetProduct && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Please select a product to adjust stock levels. This form will be enhanced with product selection functionality.
                </p>
              </div>
            )}

            {/* Current Stock Display */}
            {targetProduct && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Current Stock</h4>
                    <p className="text-2xl font-bold text-primary">
                      {targetProduct.stock} {targetProduct.unit}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Branch: {targetProduct.branch.name} • Min: {targetProduct.minStock} • Max: {targetProduct.maxStock}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    SKU: {targetProduct.sku}
                  </Badge>
                </div>
              </div>
            )}

            {/* Adjustment Type */}
            <FormField
              control={control}
              name="adjustmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment Type *</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {['INCREMENT', 'DECREMENT', 'SET_TO'].map((type) => {
                      const typeStyle = getAdjustmentTypeStyle(type);
                      const TypeIcon = typeStyle.icon;
                      const isSelected = field.value === type;
                      
                      return (
                        <Button
                          key={type}
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          className={`h-auto p-3 flex flex-col items-center gap-2 ${
                            isSelected ? 'border-primary' : ''
                          }`}
                          onClick={() => field.onChange(type)}
                        >
                          <TypeIcon className={`h-5 w-5 ${isSelected ? '' : typeStyle.color}`} />
                          <span className="text-xs font-medium">{typeStyle.text}</span>
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity */}
            <FormField
              control={control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {watchedValues.adjustmentType === 'SET_TO' ? 'New Stock Level *' : 'Quantity *'}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="999999"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className="text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        {targetProduct?.unit || 'units'}
                      </span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {watchedValues.adjustmentType === 'INCREMENT' && 'Enter the amount to add to current stock'}
                    {watchedValues.adjustmentType === 'DECREMENT' && 'Enter the amount to remove from current stock'}
                    {watchedValues.adjustmentType === 'SET_TO' && 'Enter the exact stock level to set'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason */}
            <FormField
              control={control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableReasons.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the reason for this stock adjustment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional notes or details..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide additional details if needed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reference */}
            <FormField
              control={control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Invoice #12345, Damage report, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional reference number or document
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Stock Preview */}
            {watchedValues.quantity > 0 && targetProduct && (
              <div className="space-y-3">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Current Stock:</span>
                        <span className="font-medium">{targetProduct.stock} {targetProduct.unit}</span>
                      </div>
                      {stockChange !== 0 && (
                        <div className="flex items-center justify-between">
                          <span>Change:</span>
                          <span className={`font-medium ${stockChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stockChange > 0 ? '+' : ''}{stockChange} {targetProduct.unit}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t pt-2">
                        <span>New Stock Level:</span>
                        <div className="text-right">
                          <span className="font-bold text-lg">{newStock} {targetProduct.unit}</span>
                          <Badge variant={newStockStatus.color as any} className="ml-2">
                            {newStockStatus.text}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Approval Notice */}
                {needsApproval && (
                  <Alert variant="default" className="border-orange-200 bg-orange-50">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <div className="flex items-start gap-2">
                        <div>
                          <p className="font-medium">Approval Required</p>
                          <p className="text-sm mt-1">
                            This adjustment requires manager/admin approval before being applied.
                            {user?.role === 'STAFF' && ' (Staff adjustments always require approval)'}
                            {watchedValues.quantity > 100 && ' (Large quantity adjustment)'}
                          </p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
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
                disabled={isSubmitting || !isValid || !targetProduct}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adjusting...
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4 mr-2" />
                    Adjust Stock
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