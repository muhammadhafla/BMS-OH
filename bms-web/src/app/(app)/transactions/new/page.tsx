'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2, Calculator } from 'lucide-react';
import Link from 'next/link';
import { apiService } from '@/services/api';

interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const NewTransaction: React.FC = () => {
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'QRIS'>('CASH');
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock products for now
  const [products] = useState([
    { id: '1', name: 'Product A', price: 10000 },
    { id: '2', name: 'Product B', price: 15000 },
    { id: '3', name: 'Product C', price: 20000 },
  ]);

  const addItem = () => {
    if (!selectedProduct || quantity <= 0) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const newItem: TransactionItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      total: product.price * quantity
    };

    setItems(prev => [...prev, newItem]);
    setSelectedProduct('');
    setQuantity(1);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateChange = () => {
    return Math.max(0, amountPaid - calculateTotal());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsLoading(true);
    try {
      const transactionData = {
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        totalAmount: calculateTotal(),
        finalAmount: calculateTotal(),
        paymentMethod,
        amountPaid,
        change: calculateChange(),
        notes
      };

      await apiService.createTransaction(transactionData);
      alert('Transaction created successfully!');
      // Reset form
      setItems([]);
      setAmountPaid(0);
      setNotes('');
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Failed to create transaction');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/transactions">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">New Transaction</h2>
            <p className="text-muted-foreground">
              Buat transaksi penjualan baru
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Transaction Items */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Item Form */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="product">Product</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - Rp {product.price.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={addItem} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x Rp {item.unitPrice.toLocaleString()} = Rp {item.total.toLocaleString()}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'QRIS')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                    <SelectItem value="QRIS">QRIS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amountPaid">Amount Paid</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-medium">Rp {calculateTotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span className="font-medium text-green-600">
                    Rp {calculateChange().toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={items.length === 0 || amountPaid < calculateTotal() || isLoading}
              >
                {isLoading ? 'Processing...' : 'Complete Transaction'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default NewTransaction;