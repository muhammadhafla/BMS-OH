import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Search, Plus, Minus, Package, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { inventoryService, InventoryItem } from '../services/InventoryService'
import { useToast } from '../hooks/useToast'


interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  barcode?: string;
  // Add inventory integration fields
  inventoryItem?: InventoryItem;
}

interface ProductSearchProps {
  onAddToCart: (product: Product, quantity?: number) => void;
  onStockAlert?: (product: Product, availableStock: number) => void;
}

const ProductSearch: React.FC<ProductSearchProps> = ({ onAddToCart, onStockAlert }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [inventoryData, setInventoryData] = useState<Record<string, InventoryItem>>({})
  const { showWarning, showError } = useToast()

  useEffect(() => {
    // Get current user
    // Note: setCurrentUser usage removed
    loadProducts()
    loadInventoryData()
  }, [])

  // Load inventory data for all products
  const loadInventoryData = async () => {
    try {
      const inventory = await inventoryService.getAllInventory()
      const inventoryMap: Record<string, InventoryItem> = {}
      
      inventory.forEach(item => {
        inventoryMap[item.productId] = item
      })
      
      setInventoryData(inventoryMap)
    } catch (error) {
      console.error('Error loading inventory data:', error)
    }
  }

  const loadProducts = async () => {
    setLoading(true)
    try {
      if (!window.webAPI) return
      const result = await window.webAPI.getProducts({ limit: 50 })
      if (result.success) {
        setProducts(result.data)
      } else {
        console.error('Failed to load products:', result.error)
        // Load sample products for demo
        setProducts([
          {
            id: '1',
            sku: 'PROD001',
            name: 'Sample Product 1',
            price: 10000,
            cost: 8000,
            stock: 100,
            unit: 'pcs',
            barcode: '123456789',
          },
          {
            id: '2',
            sku: 'PROD002',
            name: 'Sample Product 2',
            price: 25000,
            cost: 20000,
            stock: 50,
            unit: 'pcs',
            barcode: '987654321',
          },
        ])
      }
    } catch (error) {
      console.error('Error loading products:', error)
      // Load sample products for demo
      setProducts([
        {
          id: '1',
          sku: 'PROD001',
          name: 'Sample Product 1',
          price: 10000,
          cost: 8000,
          stock: 100,
          unit: 'pcs',
          barcode: '123456789',
        },
        {
          id: '2',
          sku: 'PROD002',
          name: 'Sample Product 2',
          price: 25000,
          cost: 20000,
          stock: 50,
          unit: 'pcs',
          barcode: '987654321',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadProducts()
      return
    }

    setLoading(true)
    try {
      if (!window.webAPI) return
      const result = await window.webAPI.getProducts({
        search: searchTerm,
        limit: 50,
      })
      if (result.success) {
        setProducts(result.data)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Stock validation function
  const checkStockAvailability = useCallback(async (product: Product, requestedQuantity: number): Promise<{
    available: boolean;
    availableStock: number;
    issues: string[];
  }> => {
    const issues: string[] = []
    
    try {
      // Get current inventory data
      const inventoryItem = inventoryData[product.id]
      if (!inventoryItem) {
        return {
          available: false,
          availableStock: 0,
          issues: ['Product not found in inventory system'],
        }
      }

      const availableStock = inventoryItem.currentStock - inventoryItem.reservedStock
      
      if (availableStock <= 0) {
        issues.push('Product is out of stock')
      } else if (availableStock < requestedQuantity) {
        issues.push(`Only ${availableStock} units available`)
      }

      return {
        available: issues.length === 0,
        availableStock,
        issues,
      }
    } catch (error) {
      console.error('Error checking stock availability:', error)
      return {
        available: false,
        availableStock: 0,
        issues: ['Error checking stock availability'],
      }
    }
  }, [inventoryData])

  const handleAddToCart = async (product: Product) => {
    const stockCheck = await checkStockAvailability(product, quantity)
    
    if (!stockCheck.available) {
      showError(stockCheck.issues.join('. '))
      
      // Call stock alert callback if provided
      if (onStockAlert) {
        onStockAlert(product, stockCheck.availableStock)
      }
      return
    }

    // Show warning for low stock
    if (stockCheck.availableStock < 10) {
      showWarning(`Low stock warning: Only ${stockCheck.availableStock} units remaining`)
    }

    onAddToCart(product, quantity)
    setSelectedProduct(null)
    setQuantity(1)
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode?.includes(searchTerm)),
  )

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Product Search</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-full">
          {/* Search Bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name, SKU, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Product List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No products found
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {product.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            SKU: {product.sku}
                          </p>
                          {product.barcode && (
                            <p className="text-sm text-gray-600">
                              Barcode: {product.barcode}
                            </p>
                          )}
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-lg font-bold text-green-600">
                              {formatCurrency(product.price)}
                            </span>
                            {/* Inventory status indicators */}
                            <div className="flex items-center space-x-2">
                              {(() => {
                                const inventoryItem = inventoryData[product.id]
                                if (!inventoryItem) {
                                  return (
                                    <span className="text-xs text-gray-400 flex items-center">
                                      <Package className="h-3 w-3 mr-1" />
                                      No inventory data
                                    </span>
                                  )
                                }

                                const availableStock = inventoryItem.currentStock - inventoryItem.reservedStock
                                const isLowStock = availableStock <= inventoryItem.reorderLevel
                                const isOutOfStock = availableStock <= 0

                                if (isOutOfStock) {
                                  return (
                                    <span className="text-xs text-red-600 flex items-center">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Out of stock
                                    </span>
                                  )
                                }

                                if (isLowStock) {
                                  return (
                                    <span className="text-xs text-yellow-600 flex items-center">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Low stock: {availableStock}
                                    </span>
                                  )
                                }

                                return (
                                  <span className="text-xs text-green-600 flex items-center">
                                    <Package className="h-3 w-3 mr-1" />
                                    In stock: {availableStock}
                                  </span>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Quick Add Panel */}
          {selectedProduct && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
              <h4 className="font-medium mb-2">Add to Cart</h4>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(selectedProduct.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleAddToCart(selectedProduct)}
                    className="ml-2"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ProductSearch