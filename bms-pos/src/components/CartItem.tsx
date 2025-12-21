import React from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Trash2, Plus, Minus } from 'lucide-react'
import { formatCurrency } from '../lib/utils'

interface CartItemData {
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

interface CartItemProps {
  item: CartItemData
  onUpdateQuantity: (productId: string, newQuantity: number) => void
  onRemoveItem: (productId: string) => void
}

const CartItem: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemoveItem }) => {
  const handleQuantityChange = (_productId: string, _newQuantity: number) => {
    if (_newQuantity < 0) return
    onUpdateQuantity(_productId, _newQuantity)
  }

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
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

      <QuantityControls
        item={item}
        onQuantityChange={handleQuantityChange}
      />

      <PriceDisplay
        total={item.total}
        discount={item.discount}
      />

      <RemoveButton onRemove={() => onRemoveItem(item.productId)} />
    </div>
  )
}

interface QuantityControlsProps {
  item: CartItemData
  onQuantityChange: (_productId: string, _newQuantity: number) => void
}

const QuantityControls: React.FC<QuantityControlsProps> = ({ item, onQuantityChange }) => (
  <div className="flex items-center gap-2">
    <Button
      variant="outline"
      size="sm"
      onClick={() => onQuantityChange(item.productId, item.quantity - 1)}
      disabled={item.quantity <= 1}
    >
      <Minus className="h-4 w-4" />
    </Button>

    <Input
      type="number"
      value={item.quantity}
      onChange={(e) => {
        const value = parseInt(e.target.value, 10) || 0
        onQuantityChange(item.productId, value)
      }}
      className="w-16 text-center"
      min="1"
    />

    <Button
      variant="outline"
      size="sm"
      onClick={() => onQuantityChange(item.productId, item.quantity + 1)}
    >
      <Plus className="h-4 w-4" />
    </Button>
  </div>
)

interface PriceDisplayProps {
  total: number
  discount: number
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({ total, discount }) => (
  <div className="text-right min-w-0">
    <p className="font-medium text-gray-900">
      {formatCurrency(total)}
    </p>
    {discount > 0 && (
      <p className="text-sm text-red-600">
        -{formatCurrency(discount)}
      </p>
    )}
  </div>
)

interface RemoveButtonProps {
  onRemove: () => void
}

const RemoveButton: React.FC<RemoveButtonProps> = ({ onRemove }) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={onRemove}
    className="text-red-600 hover:text-red-700 hover:bg-red-50"
  >
    <Trash2 className="h-4 w-4" />
  </Button>
)

export default CartItem