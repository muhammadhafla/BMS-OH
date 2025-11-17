import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  Trash2,
  Plus,
  Minus,
  Edit3,
  Check,
  X,
  Package,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useToast } from '../hooks/useToast';

interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  unit?: string;
  stock?: number;
  maxDiscount?: number;
}

interface CartTableProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdateDiscount: (productId: string, discount: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearAll: () => void;
}

const CartTable: React.FC<CartTableProps> = ({
  items,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemoveItem,
  onClearAll
}) => {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'quantity' | 'total'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { showSuccess, showError, showWarning } = useToast();

  // Stock validation
  const [stockValidation, setStockValidation] = useState<{[key: string]: {
    available: boolean;
    maxQuantity: number;
    warning?: string;
  }}>({});

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === 'Escape') {
        setEditingItem(null);
        setEditingDiscount(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Stock validation for all items
  useEffect(() => {
    const validation: {[key: string]: any} = {};
    items.forEach(item => {
      const stock = item.stock || 100; // Default stock if not available
      validation[item.productId] = {
        available: stock > 0,
        maxQuantity: Math.min(stock, 999), // Reasonable max
        warning: stock <= 5 ? `Low stock: ${stock} left` : undefined
      };
    });
    setStockValidation(validation);
  }, [items]);

  const startEditQuantity = (item: CartItem) => {
    const validation = stockValidation[item.productId];
    setEditingItem(item.productId);
    setEditQuantity(Math.min(item.quantity, validation?.maxQuantity || item.quantity));
  };

  const startEditDiscount = (item: CartItem) => {
    const maxDiscount = item.maxDiscount || (item.quantity * item.unitPrice * 0.5); // 50% max
    setEditingDiscount(item.productId);
    setEditDiscount(Math.min(item.discount, maxDiscount));
  };

  const saveQuantity = (productId: string) => {
    const item = items.find(i => i.productId === productId);
    if (!item) return;

    const validation = stockValidation[productId];
    if (editQuantity > (validation?.maxQuantity || 0)) {
      showError(`Maximum quantity is ${validation?.maxQuantity}`);
      return;
    }

    if (editQuantity <= 0) {
      onRemoveItem(productId);
      showSuccess('Item removed from cart');
    } else {
      onUpdateQuantity(productId, editQuantity);
      showSuccess('Quantity updated');
    }
    setEditingItem(null);
  };

  const saveDiscount = (productId: string) => {
    const item = items.find(i => i.productId === productId);
    if (!item) return;

    const maxDiscount = item.maxDiscount || (item.quantity * item.unitPrice * 0.5);
    if (editDiscount > maxDiscount) {
      showError(`Maximum discount is ${formatCurrency(maxDiscount)}`);
      return;
    }

    if (editDiscount < 0) {
      showError('Discount cannot be negative');
      return;
    }

    onUpdateDiscount(productId, editDiscount);
    showSuccess('Discount updated');
    setEditingDiscount(null);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditingDiscount(null);
  };

  const calculateItemTotal = (item: CartItem) => {
    return (item.quantity * item.unitPrice) - item.discount;
  };

  const handleQuickQuantity = (productId: string, delta: number) => {
    const item = items.find(i => i.productId === productId);
    if (!item) return;

    const newQuantity = Math.max(0, item.quantity + delta);
    const validation = stockValidation[productId];
    
    if (delta > 0 && newQuantity > (validation?.maxQuantity || 0)) {
      showWarning(`Only ${validation?.maxQuantity} items available`);
      return;
    }

    if (newQuantity === 0) {
      onRemoveItem(productId);
    } else {
      onUpdateQuantity(productId, newQuantity);
    }
  };

  const getSortedItems = () => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.productName.localeCompare(b.productName);
          break;
        case 'price':
          comparison = a.unitPrice - b.unitPrice;
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'total':
          comparison = calculateItemTotal(a) - calculateItemTotal(b);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const toggleSort = (column: 'name' | 'price' | 'quantity' | 'total') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getTotalStats = () => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
    const averagePrice = totalItems > 0 ? totalValue / totalItems : 0;
    
    return { totalItems, totalValue, totalDiscount, averagePrice };
  };

  const stats = getTotalStats();

  if (items.length === 0) {
    return (
      <Card className="h-full border-2 border-dashed border-gray-300">
        <CardContent className="flex flex-col items-center justify-center h-full p-8">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <ShoppingCart className="h-10 w-10 text-gray-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Cart is Empty</h3>
              <p className="text-gray-500 mb-4">Start adding products to begin a transaction</p>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                <Package className="h-4 w-4" />
                <span>Scan barcode or search products to add items</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedItems = getSortedItems();

  return (
    <Card className="h-full flex flex-col border-0 shadow-lg bg-white">
      <CardHeader className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                Transaction Items ({items.length})
              </CardTitle>
              <p className="text-sm text-gray-600">
                {stats.totalItems} items • {formatCurrency(stats.totalValue)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              Avg: {formatCurrency(stats.averagePrice)}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-2xl font-bold text-blue-600">{stats.totalItems}</div>
            <div className="text-xs text-gray-600">Total Items</div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-lg font-bold text-green-600">{formatCurrency(stats.totalValue)}</div>
            <div className="text-xs text-gray-600">Total Value</div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-lg font-bold text-red-600">-{formatCurrency(stats.totalDiscount)}</div>
            <div className="text-xs text-gray-600">Total Discount</div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-lg font-bold text-purple-600">{formatCurrency(stats.totalValue - stats.totalDiscount)}</div>
            <div className="text-xs text-gray-600">Final Amount</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white border-b z-10">
              <TableRow className="text-sm font-semibold text-gray-700">
                <TableHead className="w-20 text-center cursor-pointer hover:bg-gray-50" 
                           onClick={() => toggleSort('quantity')}>
                  <div className="flex items-center justify-center space-x-1">
                    <span>Qty</span>
                    {sortBy === 'quantity' && (
                      <TrendingUp className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" 
                           onClick={() => toggleSort('name')}>
                  <div className="flex items-center space-x-1">
                    <span>Product</span>
                    {sortBy === 'name' && (
                      <TrendingUp className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right w-24 cursor-pointer hover:bg-gray-50" 
                           onClick={() => toggleSort('price')}>
                  <div className="flex items-center justify-end space-x-1">
                    <span>Price</span>
                    {sortBy === 'price' && (
                      <TrendingUp className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right w-20">Discount</TableHead>
                <TableHead className="text-right w-28 cursor-pointer hover:bg-gray-50" 
                           onClick={() => toggleSort('total')}>
                  <div className="flex items-center justify-end space-x-1">
                    <span>Total</span>
                    {sortBy === 'total' && (
                      <TrendingUp className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-20 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item) => {
                const isEditing = editingItem === item.productId;
                const isEditingDiscount = editingDiscount === item.productId;
                const validation = stockValidation[item.productId];
                const isLowStock = validation?.warning && validation.available;
                const isOutOfStock = !validation?.available;
                
                return (
                  <TableRow 
                    key={item.productId} 
                    className={`hover:bg-gray-50 transition-colors ${
                      hoveredItem === item.productId ? 'bg-blue-50' : ''
                    } ${isOutOfStock ? 'bg-red-50' : ''}`}
                    onMouseEnter={() => setHoveredItem(item.productId)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {/* Quantity */}
                    <TableCell className="text-center">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                            className="w-16 h-8 text-center text-sm"
                            min="0"
                            max={validation?.maxQuantity || 999}
                            autoFocus
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') saveQuantity(item.productId);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => saveQuantity(item.productId)}
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuickQuantity(item.productId, -1)}
                            disabled={item.quantity <= 1}
                            className="h-6 w-6 p-0 hover:bg-red-100"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          
                          <div 
                            className="w-10 text-center font-semibold cursor-pointer hover:bg-gray-200 rounded px-1 py-1 text-sm"
                            onClick={() => startEditQuantity(item)}
                            title="Click to edit quantity"
                          >
                            {item.quantity}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuickQuantity(item.productId, 1)}
                            disabled={!validation?.available || item.quantity >= (validation?.maxQuantity || 999)}
                            className="h-6 w-6 p-0 hover:bg-green-100"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          
                          {isLowStock && (
                            <span title={validation?.warning}>
                              <AlertTriangle className="h-3 w-3 text-yellow-500 ml-1" />
                            </span>
                          )}
                          {isOutOfStock && (
                            <span title="Out of stock">
                              <AlertTriangle className="h-3 w-3 text-red-500 ml-1" />
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Product Name */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">{item.productName}</div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>SKU: {item.sku}</span>
                          {item.unit && <span>• {item.unit}</span>}
                          {validation && (
                            <Badge 
                              variant={validation.available ? "outline" : "destructive"} 
                              className="text-xs"
                            >
                              Stock: {validation.maxQuantity}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Unit Price */}
                    <TableCell className="text-right">
                      <div className="font-semibold">{formatCurrency(item.unitPrice)}</div>
                      <div className="text-xs text-gray-500">per {item.unit || 'pcs'}</div>
                    </TableCell>

                    {/* Discount */}
                    <TableCell className="text-right">
                      {isEditingDiscount ? (
                        <div className="flex items-center gap-1">
                          <div className="flex items-center">
                            <Input
                              type="number"
                              value={editDiscount}
                              onChange={(e) => setEditDiscount(parseFloat(e.target.value) || 0)}
                              className="w-20 h-8 text-center text-sm"
                              min="0"
                              max={item.maxDiscount || (item.quantity * item.unitPrice * 0.5)}
                              autoFocus
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') saveDiscount(item.productId);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <DollarSign className="h-3 w-3 text-gray-400 ml-1" />
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => saveDiscount(item.productId)}
                            className="h-8 w-8 p-0 text-green-600"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                            className="h-8 w-8 p-0 text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="font-semibold text-red-600 cursor-pointer hover:bg-red-50 rounded px-2 py-1 flex items-center justify-end"
                          onClick={() => startEditDiscount(item)}
                          title="Click to edit discount"
                        >
                          {item.discount > 0 ? (
                            <>
                              <span>-{formatCurrency(item.discount)}</span>
                              <Edit3 className="h-3 w-3 ml-1" />
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Total */}
                    <TableCell className="text-right">
                      <div className="font-bold text-lg text-green-600">
                        {formatCurrency(calculateItemTotal(item))}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveItem(item.productId)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Quick Actions Footer */}
      <div className="flex-shrink-0 border-t bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Keyboard: F3=Clear | Esc=Cancel Edit | Click headers to sort
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh Stock
            </Button>
            <Button variant="outline" size="sm">
              <Package className="h-4 w-4 mr-1" />
              Bulk Edit
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CartTable;