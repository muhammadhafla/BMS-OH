import React from 'react'
import { CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { ShoppingCart, Trash2 } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import CartTableStats from './CartTableStats'

interface CartStats {
  totalItems: number
  totalValue: number
  totalDiscount: number
  averagePrice: number
}

interface CartTableHeaderProps {
  itemCount: number
  stats: CartStats
  onClearAll: () => void
}

const CartTableHeader: React.FC<CartTableHeaderProps> = ({
  itemCount,
  stats,
  onClearAll,
}) => {
  return (
    <CardHeader className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShoppingCart className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-gray-900">
              Transaction Items ({itemCount})
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
      <CartTableStats stats={stats} />
    </CardHeader>
  )
}

export default CartTableHeader