import React from 'react'
import { Button } from './ui/button'
import { formatCurrency } from '../lib/utils'
import { CreditCard } from 'lucide-react'

interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface POSSidePanelProps {
  cart: CartItem[];
  onPayment: () => void;
  onClearCart: () => void;
  totalAmount: number;
  onPaymentSubmit: (paymentData: {
    paymentMethod: string;
    amountPaid: number;
    discount: number;
  }) => void;
}

const POSSidePanel: React.FC<POSSidePanelProps> = ({
  cart,
  onPayment,
  onClearCart,
  totalAmount,
}) => {
  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const getTotalDiscount = () => {
    return cart.reduce((total, item) => total + item.discount, 0)
  }

  const getFinalTotal = () => {
    return totalAmount - getTotalDiscount()
  }

  return (
    <div className="w-[380px] bg-white border-l shadow-lg flex flex-col">
      {/* Payment Summary */}
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
          Payment Summary
        </h3>
        
        {/* Summary Cards */}
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Items</div>
            <div className="text-xl font-bold text-gray-900">{getTotalItems()}</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Subtotal</div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(totalAmount)}
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Discount</div>
            <div className="text-xl font-bold text-red-600">
              -{formatCurrency(getTotalDiscount())}
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-4">
            <div className="text-sm opacity-90">Total</div>
            <div className="text-2xl font-bold">
              {formatCurrency(getFinalTotal())}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 space-y-4">
        <Button
          onClick={onPayment}
          disabled={cart.length === 0}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
          size="lg"
        >
          <CreditCard className="h-5 w-5 mr-2" />
          Pay Now
        </Button>
        
        <Button
          variant="outline"
          onClick={onClearCart}
          disabled={cart.length === 0}
          className="w-full border-red-300 text-red-600 hover:bg-red-50 py-3"
          size="lg"
        >
          Clear All Items
        </Button>
      </div>

      {/* Quick Payment Options */}
      <div className="px-6 pb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={cart.length === 0}
            onClick={() => console.log('Quick Cash Payment')}
          >
            Cash
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={cart.length === 0}
            onClick={() => console.log('Quick Card Payment')}
          >
            Card
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={cart.length === 0}
            onClick={() => console.log('Quick QRIS Payment')}
          >
            QRIS
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={cart.length === 0}
            onClick={() => console.log('Split Payment')}
          >
            Split
          </Button>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-auto p-6 border-t bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          <p className="mb-1">System Status: Ready</p>
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  )
}

export default POSSidePanel