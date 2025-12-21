import React, { useMemo } from 'react'
import { Card } from './ui/card'
import EmptyCart from './EmptyCart'
import CartHeader from './CartHeader'
import CartItem from './CartItem'

interface CartItemData {
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

interface CartProps {
  items: CartItemData[]
  
  onUpdateItem: (productId: string, quantity: number) => void
  
  onRemoveItem: (productId: string) => void
  onClearCart: () => void
}

const Cart: React.FC<CartProps> = ({
  items,
  onUpdateItem,
  onRemoveItem,
  onClearCart,
}) => {
  // Memoized calculations
  const totalItems = useMemo(() => 
    items.reduce((total, item) => total + item.quantity, 0), 
    [items],
  )
  
  const totalAmount = useMemo(() => 
    items.reduce((total, item) => total + item.total, 0), 
    [items],
  )

  // Empty cart state
  if (items.length === 0) {
    return <EmptyCart />
  }

  return (
    <Card className="h-full flex flex-col">
      <CartHeader
        totalItems={totalItems}
        totalAmount={totalAmount}
        onClearCart={onClearCart}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {items.map((item) => (
            <CartItem
              key={item.productId}
              item={item}
              onUpdateQuantity={onUpdateItem}
              onRemoveItem={onRemoveItem}
            />
          ))}
        </div>
      </div>
    </Card>
  )
}

export default Cart