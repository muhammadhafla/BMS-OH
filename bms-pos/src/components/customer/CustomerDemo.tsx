import React, { useState } from 'react'
import CustomerSearch from './CustomerSearch'
import { Customer } from '@/services/CustomerService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'

interface DemoTransaction {
  id: string;
  customer: Customer | null;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  timestamp: Date;
}

const CustomerDemo: React.FC = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [demoTransactions, setDemoTransactions] = useState<DemoTransaction[]>([])
  const [cart, setCart] = useState<Array<{ name: string; quantity: number; price: number }>>([])
  const { showSuccess, showError } = useToast()

  // Demo product catalog
  const demoProducts = [
    { id: 1, name: 'Coffee', price: 15000 },
    { id: 2, name: 'Sandwich', price: 25000 },
    { id: 3, name: 'Cake', price: 20000 },
    { id: 4, name: 'Juice', price: 12000 },
  ]

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer)
    if (customer) {
      showSuccess(`Customer selected: ${customer.name}`)
    } else {
      showSuccess('Customer selection cleared')
    }
  }

  // Add item to demo cart
  const addToCart = (product: typeof demoProducts[0]) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.name === product.name)
      if (existingItem) {
        return prevCart.map(item =>
          item.name === product.name
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      } else {
        return [...prevCart, { name: product.name, quantity: 1, price: product.price }]
      }
    })
  }

  // Remove item from demo cart
  const removeFromCart = (productName: string) => {
    setCart(prevCart => prevCart.filter(item => item.name !== productName))
  }

  // Calculate cart total
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0)

  // Process demo transaction
  const processTransaction = () => {
    if (cart.length === 0) {
      showError('Cart is empty')
      return
    }

    if (!selectedCustomer) {
      showError('Please select a customer')
      return
    }

    // Create demo transaction
    const transaction: DemoTransaction = {
      id: `TXN${Date.now()}`,
      customer: selectedCustomer,
      items: [...cart],
      total: cartTotal,
      timestamp: new Date(),
    }

    setDemoTransactions(prev => [transaction, ...prev])
    setCart([])
    showSuccess(`Transaction processed for ${selectedCustomer.name}!`)
  }

  // Clear cart
  const clearCart = () => {
    setCart([])
    showSuccess('Cart cleared')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center mb-8">
          🛒 BMS-POS Customer Management Demo
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Search Section */}
          <div>
            <CustomerSearch
              onCustomerSelect={handleCustomerSelect}
              selectedCustomer={selectedCustomer}
              className="h-fit"
            />
          </div>

          {/* Demo POS Interface */}
          <div className="space-y-6">
            {/* Product Catalog */}
            <Card>
              <CardHeader>
                <CardTitle>Product Catalog</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {demoProducts.map((product) => (
                    <Button
                      key={product.id}
                      variant="outline"
                      onClick={() => addToCart(product)}
                      className="h-auto p-4 flex flex-col items-center"
                    >
                      <span className="font-medium">{product.name}</span>
                      <span className="text-sm text-muted-foreground">
                        Rp {product.price.toLocaleString('id-ID')}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shopping Cart */}
            <Card>
              <CardHeader>
                <CardTitle>Shopping Cart</CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Cart is empty. Add products to get started.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.name}
                        className="flex justify-between items-center p-3 border rounded"
                      >
                        <div>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            x{item.quantity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.name)}
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center font-bold">
                        <span>Total:</span>
                        <span>Rp {cartTotal.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={processTransaction}
                        disabled={!selectedCustomer || cart.length === 0}
                        className="flex-1"
                      >
                        Process Transaction
                      </Button>
                      <Button variant="outline" onClick={clearCart}>
                        Clear Cart
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transaction History */}
            {demoTransactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {demoTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="p-3 border rounded"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium">{transaction.id}</span>
                            <div className="text-sm text-muted-foreground">
                              {transaction.customer?.name} • {transaction.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                          <span className="font-medium">
                            Rp {transaction.total.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="text-sm">
                          {transaction.items.map(item => (
                            <span key={item.name} className="text-muted-foreground">
                              {item.name} x{item.quantity}
                              {item !== transaction.items[transaction.items.length - 1] && ', '}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Demo Information */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Demo Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Customer Management:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Real-time customer search</li>
                  <li>• Add new customers with validation</li>
                  <li>• Customer selection and deselection</li>
                  <li>• Loyalty points tracking</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Demo Functionality:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Add products to cart</li>
                  <li>• Process transactions with customers</li>
                  <li>• View transaction history</li>
                  <li>• Toast notifications</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CustomerDemo