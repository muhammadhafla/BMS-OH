// Transaction Creation Component
// Provides interface for manual transaction entry

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { CreateTransactionInput } from '@/lib/validations/transaction';
import { createTransactionSchema } from '@/lib/validations/transaction';
import { Plus, X, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

interface TransactionCreationProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export function TransactionCreation({ onSuccess, onCancel }: TransactionCreationProps) {
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      items: [],
      totalAmount: 0,
      discount: 0,
      tax: 0,
      finalAmount: 0,
      paymentMethod: 'CASH',
      amountPaid: 0,
      change: 0,
      notes: '',
    },
  });

  // Calculate totals
  const calculateTotals = (currentItems: TransactionItem[]) => {
    const totalAmount = currentItems.reduce((sum, item) => sum + item.total, 0);
    const discount = form.watch('discount') || 0;
    const tax = form.watch('tax') || 0;
    const finalAmount = totalAmount - discount + tax;
    const amountPaid = form.watch('amountPaid') || 0;
    const change = Math.max(0, amountPaid - finalAmount);

    form.setValue('totalAmount', totalAmount);
    form.setValue('finalAmount', finalAmount);
    form.setValue('change', change);
    form.setValue('items', currentItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      total: item.total,
    })));
  };

  // Add item
  const addItem = () => {
    const newItem: TransactionItem = {
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      total: 0,
    };
    setItems([...items, newItem]);
  };

  // Update item
  const updateItem = (index: number, field: keyof TransactionItem, value: any) => {
    const updatedItems = [...items];
    const existingItem = updatedItems[index];
    
    if (!existingItem) return;
    
    updatedItems[index] = { ...existingItem, [field]: value };
    
    // Recalculate item total
    if (['quantity', 'unitPrice', 'discount'].includes(field)) {
      const item = updatedItems[index];
      if (item) {
        updatedItems[index].total = (item.quantity * item.unitPrice) - item.discount;
      }
    }
    
    setItems(updatedItems);
    calculateTotals(updatedItems);
  };

  // Remove item
  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    calculateTotals(updatedItems);
  };

  // Handle form submission
  const onSubmit = async (data: CreateTransactionInput) => {
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setIsSubmitting(true);
    try {
      // In a real implementation, this would call the API
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('Transaction created successfully');
        onSuccess();
      } else {
        throw new Error('Failed to create transaction');
      }
    } catch (error) {
      console.error('Failed to create transaction:', error);
      toast.error('Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Transaction Items */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Items</CardTitle>
              <CardDescription>
                Add products to this transaction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Product</Label>
                      <Input
                        placeholder="Select product"
                        value={item.productName}
                        onChange={(e) => updateItem(index, 'productName', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Total</Label>
                      <div className="p-2 bg-gray-50 rounded text-sm font-medium">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <Button type="button" variant="outline" onClick={addItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => {
                            field.onChange(Number(e.target.value));
                            calculateTotals(items);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => {
                            field.onChange(Number(e.target.value));
                            calculateTotals(items);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                          <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                          <SelectItem value="QRIS">QRIS</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amountPaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Paid</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => {
                            field.onChange(Number(e.target.value));
                            calculateTotals(items);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes about this transaction..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(form.watch('totalAmount'))}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-{formatCurrency(form.watch('discount') || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(form.watch('tax') || 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>{formatCurrency(form.watch('finalAmount'))}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Change:</span>
                <span>{formatCurrency(form.watch('change') || 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Creating...' : 'Create Transaction'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}