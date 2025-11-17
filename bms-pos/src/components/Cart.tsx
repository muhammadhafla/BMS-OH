import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2, Plus, Minus } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface CartProps {
  items: CartItem[];
  onUpdateItem: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
}

const Cart: React.FC<CartProps> = ({
  items,
  onUpdateItem,
  onRemoveItem,
  onClearCart
}) => {
  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    onUpdateItem(productId, newQuantity);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalAmount = () => {
    return items.reduce((total, item) => total + item.total, 0);
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shopping Cart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Cart is empty
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex justify-between items-center">
          <CardTitle>Shopping Cart</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearCart}
            className="text-red-600 hover:text-red-700"
          >
            Clear All
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          {getTotalItems()} items • Total: {formatCurrency(getTotalAmount())}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">
                  {item.productName}
                </h4>
                <p className="text-sm text-gray-600">
                  SKU: {item.sku}
                </p>
                <p className="text-sm text-gray-600">
                  {formatCurrency(item.unitPrice)} each
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    handleQuantityChange(item.productId, value);
                  }}
                  className="w-16 text-center"
                  min="1"
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-right min-w-0">
                <p className="font-medium text-gray-900">
                  {formatCurrency(item.total)}
                </p>
                {item.discount > 0 && (
                  <p className="text-sm text-red-600">
                    -{formatCurrency(item.discount)}
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveItem(item.productId)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Cart;