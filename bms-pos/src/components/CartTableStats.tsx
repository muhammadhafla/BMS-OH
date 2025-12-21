import React from 'react'
import { formatCurrency } from '../lib/utils'

interface CartStats {
  totalItems: number
  totalValue: number
  totalDiscount: number
  averagePrice: number
}

interface CartTableStatsProps {
  stats: CartStats
}

const CartTableStats: React.FC<CartTableStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-4 gap-4 mt-4">
      <div className="bg-white rounded-lg p-3 border">
        <div className="text-2xl font-bold text-blue-600">{stats.totalItems}</div>
        <div className="text-xs text-gray-600">Total Items</div>
      </div>
      <div className="bg-white rounded-lg p-3 border">
        <div className="text-lg font-bold text-green-600">
          {formatCurrency(stats.totalValue)}
        </div>
        <div className="text-xs text-gray-600">Total Value</div>
      </div>
      <div className="bg-white rounded-lg p-3 border">
        <div className="text-lg font-bold text-red-600">
          -{formatCurrency(stats.totalDiscount)}
        </div>
        <div className="text-xs text-gray-600">Total Discount</div>
      </div>
      <div className="bg-white rounded-lg p-3 border">
        <div className="text-lg font-bold text-purple-600">
          {formatCurrency(stats.totalValue - stats.totalDiscount)}
        </div>
        <div className="text-xs text-gray-600">Final Amount</div>
      </div>
    </div>
  )
}

export default CartTableStats