import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from './ui/card'
import { Table, TableBody } from './ui/table'
import { useToast } from '../hooks/useToast'
import { formatCurrency } from '../lib/utils'

// Import smaller components
import EmptyCart from './EmptyCart'
import CartTableHeader from './CartTableHeader'
import TableHeaders from './TableHeaders'
import CartTableRow from './CartTableRow'
import CartTableFooter from './CartTableFooter'

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

interface CartTableProps {
  items: CartItem[]
  onUpdateQuantity: (_productId: string, _quantity: number) => void
  onUpdateDiscount: (_productId: string, _discount: number) => void
  onRemoveItem: (_productId: string) => void
  onClearAll: () => void
}

interface StockValidation {
  available: boolean
  maxQuantity: number
  warning?: string
}

const CartTable: React.FC<CartTableProps> = ({
  items,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemoveItem,
  onClearAll,
}) => {
  // State management
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editingDiscount, setEditingDiscount] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState<number>(0)
  const [editDiscount, setEditDiscount] = useState<number>(0)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'quantity' | 'total'>('total')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [stockValidation, setStockValidation] = useState<{
    [key: string]: StockValidation
  }>({})

  const { showSuccess, showError, showWarning } = useToast()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      if (event.key === 'Escape') {
        setEditingItem(null)
        setEditingDiscount(null)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Memoized stock validation for all items
  const stockValidationMemo = useMemo(() => {
    const validation: { [key: string]: StockValidation } = {}
    items.forEach(item => {
      const stock = item.stock || 100 // Default stock if not available
      validation[item.productId] = {
        available: stock > 0,
        maxQuantity: Math.min(stock, 999), // Reasonable max
        warning: stock <= 5 ? `Low stock: ${stock} left` : undefined,
      }
    })
    return validation
  }, [items])

  useEffect(() => {
    setStockValidation(stockValidationMemo)
  }, [stockValidationMemo])

  // Callback handlers
  const startEditQuantity = useCallback((item: CartItem) => {
    const validation = stockValidation[item.productId]
    setEditingItem(item.productId)
    setEditQuantity(Math.min(item.quantity, validation?.maxQuantity ?? item.quantity))
  }, [stockValidation])

  const startEditDiscount = useCallback((item: CartItem) => {
    const maxDiscount = item.maxDiscount ?? item.quantity * item.unitPrice * 0.5 // 50% max
    setEditingDiscount(item.productId)
    setEditDiscount(Math.min(item.discount, maxDiscount))
  }, [])

  const saveQuantity = useCallback((productId: string) => {
    const item = items.find(i => i.productId === productId)
    if (!item) return

    const validation = stockValidation[productId]
    if (editQuantity > (validation?.maxQuantity ?? 0)) {
      showError(`Maximum quantity is ${validation?.maxQuantity}`)
      return
    }

    if (editQuantity <= 0) {
      onRemoveItem(productId)
      showSuccess('Item removed from cart')
    } else {
      onUpdateQuantity(productId, editQuantity)
      showSuccess('Quantity updated')
    }
    setEditingItem(null)
  }, [items, stockValidation, editQuantity, onRemoveItem, onUpdateQuantity, showError, showSuccess])

  const saveDiscount = useCallback((productId: string) => {
    const item = items.find(i => i.productId === productId)
    if (!item) return

    const maxDiscount = item.maxDiscount ?? item.quantity * item.unitPrice * 0.5
    if (editDiscount > maxDiscount) {
      showError(`Maximum discount is ${formatCurrency(maxDiscount)}`)
      return
    }

    if (editDiscount < 0) {
      showError('Discount cannot be negative')
      return
    }

    onUpdateDiscount(productId, editDiscount)
    showSuccess('Discount updated')
    setEditingDiscount(null)
  }, [items, editDiscount, onUpdateDiscount, showError, showSuccess])

  const cancelEdit = useCallback(() => {
    setEditingItem(null)
    setEditingDiscount(null)
  }, [])

  const handleQuickQuantity = useCallback((productId: string, delta: number) => {
    const item = items.find(i => i.productId === productId)
    if (!item) return

    const newQuantity = Math.max(0, item.quantity + delta)
    const validation = stockValidation[productId]

    if (delta > 0 && newQuantity > (validation?.maxQuantity ?? 0)) {
      showWarning(`Only ${validation?.maxQuantity} items available`)
      return
    }

    if (newQuantity === 0) {
      onRemoveItem(productId)
    } else {
      onUpdateQuantity(productId, newQuantity)
    }
  }, [items, stockValidation, onRemoveItem, onUpdateQuantity, showWarning])

  // Sorting
  const toggleSort = useCallback((column: 'name' | 'price' | 'quantity' | 'total') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }, [sortBy, sortOrder])

  const calculateItemTotal = (item: CartItem) => {
    return item.quantity * item.unitPrice - item.discount
  }

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.productName.localeCompare(b.productName)
          break
        case 'price':
          comparison = a.unitPrice - b.unitPrice
          break
        case 'quantity':
          comparison = a.quantity - b.quantity
          break
        case 'total':
          comparison = calculateItemTotal(a) - calculateItemTotal(b)
          break
        default:
          comparison = 0
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [items, sortBy, sortOrder])

  // Statistics
  const stats = useMemo(() => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
    const totalValue = items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
    const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0)
    const averagePrice = totalItems > 0 ? totalValue / totalItems : 0

    return { totalItems, totalValue, totalDiscount, averagePrice }
  }, [items])

  // Empty cart state
  if (items.length === 0) {
    return <EmptyCart />
  }

  // Main component rendering
  return (
    <Card className="h-full flex flex-col border-0 shadow-lg bg-white">
      <CartTableHeader
        itemCount={items.length}
        stats={stats}
        onClearAll={onClearAll}
      />

      <div className="flex-1 overflow-hidden p-0">
        <div className="h-full overflow-y-auto">
          <Table>
            <TableHeaders
              sortConfig={{ sortBy, sortOrder }}
              onToggleSort={toggleSort}
            />
            <TableBody>
              {sortedItems.map(item => (
                <CartTableRow
                  key={item.productId}
                  item={item}
                  editingItem={editingItem}
                  editingDiscount={editingDiscount}
                  editQuantity={editQuantity}
                  editDiscount={editDiscount}
                  stockValidation={stockValidation[item.productId]}
                  hoveredItem={hoveredItem}
                  onStartEditQuantity={startEditQuantity}
                  onStartEditDiscount={startEditDiscount}
                  onSaveQuantity={saveQuantity}
                  onSaveDiscount={saveDiscount}
                  onCancelEdit={cancelEdit}
                  onEditQuantityChange={setEditQuantity}
                  onEditDiscountChange={setEditDiscount}
                  onQuickQuantity={handleQuickQuantity}
                  onRemoveItem={onRemoveItem}
                  onSetHoveredItem={setHoveredItem}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <CartTableFooter
        onRefreshStock={() => {
          // TODO: Implement refresh stock functionality
        }}
        onBulkEdit={() => {
          // TODO: Implement bulk edit functionality
        }}
      />
    </Card>
  )
}



export default CartTable
