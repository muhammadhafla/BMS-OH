import React from 'react'
import { CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { formatCurrency } from '../lib/utils'

interface CartHeaderProps {
  totalItems: number
  totalAmount: number
  onClearCart: () => void
}

const CartHeader: React.FC<CartHeaderProps> = ({
  totalItems,
  totalAmount,
  onClearCart,
}) => {
  return (
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
        {totalItems} items • Total: {formatCurrency(totalAmount)}
      </div>
    </CardHeader>
  )
}

export default CartHeader