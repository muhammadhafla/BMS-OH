import React from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { TableCell, TableRow } from './ui/table'
import { 
  Plus, 
  Minus, 
  Edit3, 
  Check, 
  X, 
  AlertTriangle,
  DollarSign,
  Trash2, 
} from 'lucide-react'
import { formatCurrency } from '../lib/utils'

interface CartItem {
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
  unit?: string
  stock?: number
  maxDiscount?: number
}

interface StockValidation {
  available: boolean
  maxQuantity: number
  warning?: string
}

interface CartTableRowProps {
  item: CartItem
  editingItem: string | null
  editingDiscount: string | null
  editQuantity: number
  editDiscount: number
  stockValidation: StockValidation | undefined
  hoveredItem: string | null
  onStartEditQuantity: (item: CartItem) => void
  onStartEditDiscount: (item: CartItem) => void
  onSaveQuantity: (productId: string) => void
  onSaveDiscount: (productId: string) => void
  onCancelEdit: () => void
  onEditQuantityChange: (_quantity: number) => void
  onEditDiscountChange: (_discount: number) => void
  onQuickQuantity: (productId: string, delta: number) => void
  onRemoveItem: (productId: string) => void
  onSetHoveredItem: (_productId: string | null) => void
}

const CartTableRow: React.FC<CartTableRowProps> = ({
  item,
  editingItem,
  editingDiscount,
  editQuantity,
  editDiscount,
  stockValidation,
  hoveredItem,
  onStartEditQuantity,
  onStartEditDiscount,
  onSaveQuantity,
  onSaveDiscount,
  onCancelEdit,
  onEditQuantityChange,
  onEditDiscountChange,
  onQuickQuantity,
  onRemoveItem,
  onSetHoveredItem,
}) => {
  const isEditing = editingItem === item.productId
  const isEditingDiscount = editingDiscount === item.productId
  const isLowStock = Boolean(stockValidation?.warning && stockValidation.available)
  const isOutOfStock = !stockValidation?.available

  const handleQuantityKeyPress = (e: React.KeyboardEvent) => {
    void e
    if (e.key === 'Enter') onSaveQuantity(item.productId)
    if (e.key === 'Escape') onCancelEdit()
  }

  const handleDiscountKeyPress = (e: React.KeyboardEvent) => {
    void e
    if (e.key === 'Enter') onSaveDiscount(item.productId)
    if (e.key === 'Escape') onCancelEdit()
  }

  return (
    <TableRow
      className={`hover:bg-gray-50 transition-colors ${
        hoveredItem === item.productId ? 'bg-blue-50' : ''
      } ${isOutOfStock ? 'bg-red-50' : ''}`}
      onMouseEnter={() => onSetHoveredItem(item.productId)}
      onMouseLeave={() => onSetHoveredItem(null)}
    >
      {/* Quantity */}
      <QuantityCell
        item={item}
        isEditing={isEditing}
        editQuantity={editQuantity}
        validation={stockValidation}
        isLowStock={isLowStock}
        isOutOfStock={isOutOfStock}
        onStartEdit={onStartEditQuantity}
        onSave={onSaveQuantity}
        onCancel={onCancelEdit}
        onQuantityChange={onEditQuantityChange}
        onQuickQuantity={onQuickQuantity}
        onKeyPress={handleQuantityKeyPress}
      />

      {/* Product Name */}
      <ProductNameCell
        item={item}
        validation={stockValidation}
      />

      {/* Unit Price */}
      <UnitPriceCell item={item} />

      {/* Discount */}
      <DiscountCell
        item={item}
        isEditing={isEditingDiscount}
        editDiscount={editDiscount}
        onStartEdit={onStartEditDiscount}
        onSave={onSaveDiscount}
        onCancel={onCancelEdit}
        onDiscountChange={onEditDiscountChange}
        onKeyPress={handleDiscountKeyPress}
      />

      {/* Total */}
      <TotalCell item={item} />

      {/* Actions */}
      <ActionsCell
        onRemove={() => onRemoveItem(item.productId)}
      />
    </TableRow>
  )
}

// Quantity Cell Component
interface QuantityCellProps {
  item: CartItem
  isEditing: boolean
  editQuantity: number
  validation: StockValidation | undefined
  isLowStock: boolean
  isOutOfStock: boolean
  onStartEdit: (item: CartItem) => void
  onSave: (productId: string) => void
  onCancel: () => void
  onQuantityChange: (_quantity: number) => void
  onQuickQuantity: (productId: string, delta: number) => void
  onKeyPress: (_e: React.KeyboardEvent) => void
}

const QuantityCell: React.FC<QuantityCellProps> = ({
  item,
  isEditing,
  editQuantity,
  validation,
  isLowStock,
  isOutOfStock,
  onStartEdit,
  onSave,
  onCancel,
  onQuantityChange,
  onQuickQuantity,
  onKeyPress,
}) => (
  <TableCell className="text-center">
    {isEditing ? (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={editQuantity}
          onChange={(e) => onQuantityChange(parseInt(e.target.value, 10) || 0)}
          className="w-16 h-8 text-center text-sm"
          min="0"
          max={validation?.maxQuantity ?? 999}
          autoFocus
          onKeyPress={onKeyPress}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onSave(item.productId)}
          className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
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
          onClick={() => onQuickQuantity(item.productId, -1)}
          disabled={item.quantity <= 1}
          className="h-6 w-6 p-0 hover:bg-red-100"
        >
          <Minus className="h-3 w-3" />
        </Button>

        <div
          className="w-10 text-center font-semibold cursor-pointer hover:bg-gray-200 rounded px-1 py-1 text-sm"
          onClick={() => onStartEdit(item)}
          title="Click to edit quantity"
        >
          {item.quantity}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onQuickQuantity(item.productId, 1)}
          disabled={
            !validation?.available ||
            item.quantity >= (validation?.maxQuantity ?? 999)
          }
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
)

// Product Name Cell Component
interface ProductNameCellProps {
  item: CartItem
  validation: StockValidation | undefined
}

const ProductNameCell: React.FC<ProductNameCellProps> = ({ item, validation }) => (
  <TableCell>
    <div className="space-y-1">
      <div className="font-semibold text-gray-900">{item.productName}</div>
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <span>SKU: {item.sku}</span>
        {item.unit && <span>• {item.unit}</span>}
        {validation && (
          <Badge
            variant={validation.available ? 'outline' : 'destructive'}
            className="text-xs"
          >
            Stock: {validation.maxQuantity}
          </Badge>
        )}
      </div>
    </div>
  </TableCell>
)

// Unit Price Cell Component
interface UnitPriceCellProps {
  item: CartItem
}

const UnitPriceCell: React.FC<UnitPriceCellProps> = ({ item }) => (
  <TableCell className="text-right">
    <div className="font-semibold">{formatCurrency(item.unitPrice)}</div>
    <div className="text-xs text-gray-500">per {item.unit || 'pcs'}</div>
  </TableCell>
)

// Discount Cell Component
interface DiscountCellProps {
  item: CartItem
  isEditing: boolean
  editDiscount: number
  onStartEdit: (item: CartItem) => void
  onSave: (productId: string) => void
  onCancel: () => void
  onDiscountChange: (_discount: number) => void
  onKeyPress: (_e: React.KeyboardEvent) => void
}

const DiscountCell: React.FC<DiscountCellProps> = ({
  item,
  isEditing,
  editDiscount,
  onStartEdit,
  onSave,
  onCancel,
  onDiscountChange,
  onKeyPress,
}) => (
  <TableCell className="text-right">
    {isEditing ? (
      <div className="flex items-center gap-1">
        <div className="flex items-center">
          <Input
            type="number"
            value={editDiscount}
            onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
            className="w-20 h-8 text-center text-sm"
            min="0"
            max={item.maxDiscount ?? item.quantity * item.unitPrice * 0.5}
            autoFocus
            onKeyPress={onKeyPress}
          />
          <DollarSign className="h-3 w-3 text-gray-400 ml-1" />
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onSave(item.productId)}
          className="h-8 w-8 p-0 text-green-600"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-8 w-8 p-0 text-red-600"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    ) : (
      <div
        className="font-semibold text-red-600 cursor-pointer hover:bg-red-50 rounded px-2 py-1 flex items-center justify-end"
        onClick={() => onStartEdit(item)}
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
)

// Total Cell Component
interface TotalCellProps {
  item: CartItem
}

const TotalCell: React.FC<TotalCellProps> = ({ item }) => {
  const calculateItemTotal = () => {
    return item.quantity * item.unitPrice - item.discount
  }

  return (
    <TableCell className="text-right">
      <div className="font-bold text-lg text-green-600">
        {formatCurrency(calculateItemTotal())}
      </div>
      <div className="text-xs text-gray-500">
        {item.quantity} × {formatCurrency(item.unitPrice)}
      </div>
    </TableCell>
  )
}

// Actions Cell Component
interface ActionsCellProps {
  onRemove: () => void
}

const ActionsCell: React.FC<ActionsCellProps> = ({ onRemove }) => (
  <TableCell className="text-center">
    <Button
      variant="ghost"
      size="sm"
      onClick={onRemove}
      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
      title="Remove item"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </TableCell>
)

export default CartTableRow