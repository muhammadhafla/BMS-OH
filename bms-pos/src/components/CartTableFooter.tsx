import React from 'react'
import { Button } from './ui/button'
import { RefreshCw, Package } from 'lucide-react'

interface CartTableFooterProps {
  onRefreshStock?: () => void
  onBulkEdit?: () => void
}

const CartTableFooter: React.FC<CartTableFooterProps> = ({
  onRefreshStock,
  onBulkEdit,
}) => {
  return (
    <div className="flex-shrink-0 border-t bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Keyboard: F3=Clear | Esc=Cancel Edit | Click headers to sort
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRefreshStock}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh Stock
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onBulkEdit}
          >
            <Package className="h-4 w-4 mr-1" />
            Bulk Edit
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CartTableFooter