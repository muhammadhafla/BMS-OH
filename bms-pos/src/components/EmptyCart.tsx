import React from 'react'
import { Card, CardContent } from './ui/card'
import { ShoppingCart, Package } from 'lucide-react'

const EmptyCart: React.FC = () => {
  return (
    <Card className="h-full border-2 border-dashed border-gray-300">
      <CardContent className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <ShoppingCart className="h-10 w-10 text-gray-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Cart is Empty</h3>
            <p className="text-gray-500 mb-4">Start adding products to begin a transaction</p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
              <Package className="h-4 w-4" />
              <span>Scan barcode or search products to add items</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default EmptyCart