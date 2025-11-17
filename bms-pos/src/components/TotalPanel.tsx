import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  ShoppingCart, 
  CreditCard, 
  Trash2, 
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Star,
  Timer,
  Percent,
  FileText,
  RefreshCw,
  Zap,
  Target,
  Award
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  unit?: string;
  isPopular?: boolean;
  category?: string;
}

interface TotalPanelProps {
  cart: CartItem[];
  onPayment: () => void;
  onClearCart: () => void;
}

interface CartStatistics {
  totalItems: number;
  totalAmount: number;
  totalDiscount: number;
  finalAmount: number;
  averagePrice: number;
  itemCount: number;
  uniqueProducts: number;
  popularItems: number;
  categories: string[];
  highestValue: number;
  lowestValue: number;
}

const TotalPanel: React.FC<TotalPanelProps> = ({ cart, onPayment, onClearCart }) => {
  // Enhanced statistics calculation
  const statistics: CartStatistics = useMemo(() => {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
    const finalAmount = totalAmount - totalDiscount;
    const averagePrice = totalItems > 0 ? totalAmount / totalItems : 0;
    const uniqueProducts = cart.length;
    const popularItems = cart.filter(item => item.isPopular).length;
    const categories = [...new Set(cart.map(item => item.category).filter(Boolean))] as string[];
    const itemValues = cart.map(item => item.total);
    const highestValue = itemValues.length > 0 ? Math.max(...itemValues) : 0;
    const lowestValue = itemValues.length > 0 ? Math.min(...itemValues) : 0;

    return {
      totalItems,
      totalAmount,
      totalDiscount,
      finalAmount,
      averagePrice,
      itemCount: totalItems,
      uniqueProducts,
      popularItems,
      categories,
      highestValue,
      lowestValue
    };
  }, [cart]);

  // Get cart status and recommendations
  const getCartStatus = () => {
    if (cart.length === 0) {
      return {
        status: 'empty',
        message: 'Cart is empty',
        color: 'text-gray-500',
        bgColor: 'bg-gray-50'
      };
    }

    if (statistics.finalAmount > 100000) {
      return {
        status: 'high_value',
        message: 'High value transaction',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      };
    }

    if (statistics.popularItems > 0) {
      return {
        status: 'has_popular',
        message: 'Contains popular items',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      };
    }

    return {
      status: 'normal',
      message: 'Ready to checkout',
      color: 'text-gray-700',
      bgColor: 'bg-gray-50'
    };
  };

  // Get quick action suggestions
  const getQuickActions = () => {
    const actions = [];
    
    if (statistics.totalDiscount === 0 && statistics.finalAmount > 50000) {
      actions.push({ id: 'discount', label: 'Apply Discount', icon: Percent, color: 'bg-red-500' });
    }
    
    if (statistics.categories.length > 1) {
      actions.push({ id: 'print', label: 'Print Receipt', icon: FileText, color: 'bg-blue-500' });
    }
    
    actions.push({ id: 'save', label: 'Save Draft', icon: RefreshCw, color: 'bg-gray-500' });
    
    return actions.slice(0, 3);
  };

  const cartStatus = getCartStatus();
  const quickActions = getQuickActions();

  if (cart.length === 0) {
    return (
      <Card className="h-full bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300">
        <CardContent className="flex flex-col items-center justify-center h-full p-8">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
              <ShoppingCart className="h-12 w-12 text-gray-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Start a New Transaction</h3>
              <p className="text-gray-500 mb-4">Search and add products to begin</p>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                <Zap className="h-4 w-4" />
                <span>Scan barcode or search by name</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Calculator className="h-7 w-7 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Transaction Summary
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${cartStatus.bgColor} ${cartStatus.color} border-current`}
                >
                  {cartStatus.message}
                </Badge>
                {statistics.popularItems > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    {statistics.popularItems} popular
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(statistics.finalAmount)}
            </div>
            <div className="text-sm text-gray-600">
              {statistics.totalItems} items
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Subtotal</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(statistics.totalAmount)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Discount</p>
                <p className="text-2xl font-bold text-red-900">
                  -{formatCurrency(statistics.totalDiscount)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Detailed Statistics */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center">
            <Target className="h-5 w-5 mr-2 text-blue-600" />
            Transaction Details
          </h4>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-2xl font-bold text-purple-600">{statistics.uniqueProducts}</div>
              <div className="text-xs text-gray-600">Unique Products</div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-2xl font-bold text-orange-600">{statistics.averagePrice.toFixed(0)}</div>
              <div className="text-xs text-gray-600">Avg Price</div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-2xl font-bold text-teal-600">{statistics.categories.length}</div>
              <div className="text-xs text-gray-600">Categories</div>
            </div>
          </div>
        </div>

        {/* Value Analysis */}
        {(statistics.highestValue > 0 || statistics.lowestValue > 0) && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <Award className="h-5 w-5 mr-2 text-yellow-600" />
              Value Analysis
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              {statistics.highestValue > 0 && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-lg font-bold text-green-900">
                        {formatCurrency(statistics.highestValue)}
                      </div>
                      <div className="text-xs text-green-700">Highest Item</div>
                    </div>
                  </div>
                </div>
              )}
              
              {statistics.lowestValue > 0 && statistics.lowestValue !== statistics.highestValue && (
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="h-4 w-4 text-yellow-600" />
                    <div>
                      <div className="text-lg font-bold text-yellow-900">
                        {formatCurrency(statistics.lowestValue)}
                      </div>
                      <div className="text-xs text-yellow-700">Lowest Item</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Categories */}
        {statistics.categories.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <Package className="h-5 w-5 mr-2 text-gray-600" />
              Categories
            </h4>
            <div className="flex flex-wrap gap-2">
              {statistics.categories.map((category, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-blue-600" />
              Quick Actions
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    onClick={() => console.log(`Quick action: ${action.id}`)}
                    className="text-xs h-10"
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Transaction Insights */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
          <h4 className="font-semibold text-indigo-900 mb-2 flex items-center">
            <Timer className="h-4 w-4 mr-1" />
            Transaction Insights
          </h4>
          <div className="text-sm text-indigo-800 space-y-1">
            {statistics.finalAmount > 100000 && (
              <p>• This is a high-value transaction (&gt;$100k)</p>
            )}
            {statistics.totalItems > 10 && (
              <p>• Bulk transaction with {statistics.totalItems} items</p>
            )}
            {statistics.popularItems > 0 && (
              <p>• {statistics.popularItems} popular products included</p>
            )}
            {statistics.categories.length > 3 && (
              <p>• Diverse product mix across {statistics.categories.length} categories</p>
            )}
            {statistics.totalDiscount > 0 && (
              <p>• Customer discount applied: {formatCurrency(statistics.totalDiscount)}</p>
            )}
          </div>
        </div>
      </CardContent>

      {/* Action Buttons */}
      <div className="flex-shrink-0 p-6 border-t bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="space-y-3">
          <Button
            onClick={onPayment}
            disabled={cart.length === 0}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 text-lg font-semibold shadow-lg"
            size="lg"
          >
            <CreditCard className="h-6 w-6 mr-2" />
            Process Payment - {formatCurrency(statistics.finalAmount)}
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={onClearCart}
              disabled={cart.length === 0}
              className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              size="lg"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
            
            <Button
              variant="outline"
              onClick={() => console.log('Save draft')}
              disabled={cart.length === 0}
              className="border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
              size="lg"
            >
              <FileText className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>System Ready</span>
            </div>
            <div className="flex items-center space-x-1">
              <Timer className="h-3 w-3" />
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TotalPanel;