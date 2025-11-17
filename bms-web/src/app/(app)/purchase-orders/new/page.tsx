'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2, Package } from 'lucide-react';
import Link from 'next/link';
import { apiService } from '@/services/api';

interface POItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const NewPurchaseOrder: React.FC = () => {
  const [formData, setFormData] = useState({
    supplierId: '',
    expectedDate: '',
    notes: '',
  });
  const [items, setItems] = useState<POItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Mock suppliers and products
  const [suppliers] = useState([
    { id: '1', name: 'Supplier A', contact: 'supplierA@example.com' },
    { id: '2', name: 'Supplier B', contact: 'supplierB@example.com' },
    { id: '3', name: 'Supplier C', contact: 'supplierC@example.com' },
  ]);

  const [products] = useState([
    { id: '1', name: 'Product A', currentPrice: 10000 },
    { id: '2', name: 'Product B', currentPrice: 15000 },
    { id: '3', name: 'Product C', currentPrice: 20000 },
  ]);

  const addItem = () => {
    if (!selectedProduct || quantity <= 0 || unitPrice <= 0) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const newItem: POItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice,
      total: unitPrice * quantity
    };

    setItems(prev => [...prev, newItem]);
    setSelectedProduct('');
    setQuantity(1);
    setUnitPrice(0);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !formData.supplierId) return;

    setIsLoading(true);
    try {
      const poData = {
        supplierId: formData.supplierId,
        expectedDate: formData.expectedDate,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        totalAmount: calculateTotal(),
        notes: formData.notes
      };

      await apiService.createPurchaseOrder(poData);
      alert('Purchase Order created successfully!');
      // Reset form
      setFormData({ supplierId: '', expectedDate: '', notes: '' });
      setItems([]);
    } catch (error) {
      console.error('Error creating purchase order:', error);
      alert('Failed to create purchase order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/purchase-orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">New Purchase Order</h2>
            <p className="text-muted-foreground">
              Buat purchase order untuk pembelian barang
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Purchase Order Form */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Purchase Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Supplier Selection */}
              <div>
                <Label htmlFor="supplierId">Supplier *</Label>
                <Select value={formData.supplierId} onValueChange={(value) => setFormData(prev => ({ ...prev, supplierId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.contact})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expectedDate">Expected Delivery Date</Label>
                <Input
                  id="expectedDate"
                  type="date"
                  value={formData.expectedDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedDate: e.target.value }))}
                />
              </div>

              {/* Add Item Form */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Add Items</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="product">Product</Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
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
                  <div>
                    <Label htmlFor="unitPrice">Unit Price (Rp)</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      min="0"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={addItem} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Items</h4>
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

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes for the supplier..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Items:</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">Rp {calculateTotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (10%):</span>
                  <span className="font-medium">Rp {(calculateTotal() * 0.1).toLocaleString()}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>Rp {(calculateTotal() * 1.1).toLocaleString()}</span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={items.length === 0 || !formData.supplierId || isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Purchase Order'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default NewPurchaseOrder;