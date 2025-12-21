import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import {
  X,
  CreditCard,
  DollarSign,
  QrCode,
  Calculator,
  Percent,
  Banknote,
  Receipt,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { useToast } from '../hooks/useToast'

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onPayment: (paymentData: {
    paymentMethod: string;
    amountPaid: number;
    discount: number;
    discountType: 'percentage' | 'amount';
    change: number;
  }) => void;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  requiresAmount: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  onPayment,
}) => {
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('amount')
  const [isProcessing, setIsProcessing] = useState(false)
  const { showSuccess, showError } = useToast()

  const paymentMethods: PaymentMethod[] = [
    { 
      id: 'cash', 
      name: 'Cash', 
      icon: Banknote, 
      color: 'text-green-600', 
      bgColor: 'bg-green-50 border-green-200',
      requiresAmount: true,
    },
    { 
      id: 'debit', 
      name: 'Debit Card', 
      icon: CreditCard, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50 border-blue-200',
      requiresAmount: false,
    },
    { 
      id: 'credit', 
      name: 'Credit Card', 
      icon: CreditCard, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-50 border-purple-200',
      requiresAmount: false,
    },
    { 
      id: 'qris', 
      name: 'QRIS', 
      icon: QrCode, 
      color: 'text-indigo-600', 
      bgColor: 'bg-indigo-50 border-indigo-200',
      requiresAmount: false,
    },
  ]

  // Calculated values
  const finalAmount = useMemo(() => {
    if (discountType === 'percentage') {
      return totalAmount * (1 - discount / 100)
    }
    return totalAmount - discount
  }, [totalAmount, discount, discountType])

  const amountPaidNum = useMemo(() => parseFloat(amountPaid) || 0, [amountPaid])
  const change = useMemo(() => Math.max(0, amountPaidNum - finalAmount), [amountPaidNum, finalAmount])
  
  // Quick cash amount suggestions
  const suggestedCashAmounts = useMemo(() => {
    const amounts = []
    for (let i = 1; i <= 10; i++) {
      amounts.push(Math.ceil(finalAmount / 1000) * i * 1000)
    }
    return amounts.slice(0, 4)
  }, [finalAmount])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmountPaid((Math.ceil(finalAmount / 1000) * 1000).toString()) // Round up to nearest 1000
      setDiscount(0)
    }
  }, [isOpen, finalAmount])

  const handlePayment = async () => {
    if (isProcessing) return

    const currentMethod = paymentMethods.find(m => m.id === paymentMethod)
    if (!currentMethod) return

    // Validation
    if (currentMethod.requiresAmount && amountPaidNum < finalAmount) {
      showError('Amount paid is less than the total amount')
      return
    }

    setIsProcessing(true)

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      onPayment({
        paymentMethod,
        amountPaid: currentMethod.requiresAmount ? amountPaidNum : finalAmount,
        discount,
        discountType,
        change: currentMethod.requiresAmount ? change : 0,
      })

      showSuccess('Payment completed successfully')
    } catch (error) {
      showError('Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleQuickCash = (amount: number) => {
    setAmountPaid(amount.toString())
  }

  const handleDiscountChange = (value: number) => {
    if (discountType === 'percentage') {
      // Ensure percentage doesn't exceed 100
      if (value > 100) value = 100
    } else {
      // Ensure amount doesn't exceed total
      if (value > totalAmount) value = totalAmount
    }
    setDiscount(Math.max(0, value))
  }

  const getKeyboardShortcuts = () => {
    const shortcuts = [
      { key: 'Esc', action: 'Close modal' },
      { key: 'Enter', action: 'Confirm payment' },
      { key: 'F1', action: 'Cash' },
      { key: 'F2', action: 'Card' },
      { key: 'F3', action: 'QRIS' },
    ]
    return shortcuts
  }

  if (!isOpen) return null

  const currentMethod = paymentMethods.find(m => m.id === paymentMethod)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
              <Receipt className="h-6 w-6 mr-2 text-blue-600" />
              Payment Processing
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">Complete your transaction securely</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              ID: {Date.now().toString().slice(-6)}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isProcessing}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex h-[600px]">
            {/* Left Panel - Payment Methods & Controls */}
            <div className="flex-1 p-6 overflow-y-auto">
              {/* Transaction Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Transaction Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Subtotal</p>
                    <p className="font-semibold">{formatCurrency(totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Items</p>
                    <p className="font-semibold">1 item</p>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Payment Method</h3>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon
                    return (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          paymentMethod === method.id
                            ? `${method.bgColor  } border-current`
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={`h-6 w-6 ${paymentMethod === method.id ? method.color : 'text-gray-400'}`} />
                          <div>
                            <p className="font-medium text-gray-900">{method.name}</p>
                            {method.requiresAmount && (
                              <p className="text-xs text-gray-500">Requires cash amount</p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Discount Section */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Percent className="h-5 w-5 mr-2" />
                  Discount
                </h3>
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Button
                      variant={discountType === 'amount' ? 'default' : 'outline'}
                      onClick={() => setDiscountType('amount')}
                      className="flex-1"
                    >
                      Amount (Rp)
                    </Button>
                    <Button
                      variant={discountType === 'percentage' ? 'default' : 'outline'}
                      onClick={() => setDiscountType('percentage')}
                      className="flex-1"
                    >
                      Percentage (%)
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                      placeholder={discountType === 'amount' ? '0' : '0'}
                      min="0"
                      max={discountType === 'percentage' ? 100 : totalAmount}
                      className="flex-1"
                    />
                    <div className="flex items-center px-3 bg-gray-100 rounded-md text-sm text-gray-600">
                      {discountType === 'amount' ? 'Rp' : '%'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Cash Options (for cash payments) */}
              {currentMethod?.requiresAmount && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Quick Cash
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {suggestedCashAmounts.map((amount, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => handleQuickCash(amount)}
                        className="text-sm"
                      >
                        {formatCurrency(amount)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Amount Input (for cash payments) */}
              {currentMethod?.requiresAmount && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Amount Paid</h3>
                  <Input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0"
                    min={finalAmount}
                    step="100"
                    className="text-lg font-mono"
                  />
                  {amountPaidNum > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Remaining: {formatCurrency(Math.max(0, finalAmount - amountPaidNum))}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right Panel - Summary & Actions */}
            <div className="w-80 bg-gray-50 p-6 border-l">
              <h3 className="font-semibold text-gray-900 mb-4">Payment Summary</h3>
              
              {/* Amount Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(totalAmount)}</span>
                </div>
                
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Discount {discountType === 'percentage' ? `(${discount}%)` : ''}
                    </span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(discountType === 'percentage' ? (totalAmount * discount / 100) : discount)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between text-lg font-bold border-t pt-3">
                  <span>Total Amount</span>
                  <span className="text-blue-600">{formatCurrency(finalAmount)}</span>
                </div>
                
                {currentMethod?.requiresAmount && amountPaidNum > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Amount Paid</span>
                      <span className="font-medium">{formatCurrency(amountPaidNum)}</span>
                    </div>
                    
                    {change > 0 && (
                      <div className="flex justify-between text-lg font-bold text-green-600 bg-green-50 p-3 rounded-lg">
                        <span>Change</span>
                        <span>{formatCurrency(change)}</span>
                      </div>
                    )}
                    
                    {amountPaidNum < finalAmount && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Short Amount</span>
                        <span>{formatCurrency(finalAmount - amountPaidNum)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Payment Status */}
              <div className="mb-6">
                {isProcessing ? (
                  <div className="flex items-center justify-center p-3 bg-blue-50 rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-blue-800">Processing...</span>
                  </div>
                ) : currentMethod?.requiresAmount && amountPaidNum < finalAmount ? (
                  <div className="flex items-center p-3 bg-red-50 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                    <span className="text-sm text-red-800">Insufficient amount</span>
                  </div>
                ) : (
                  <div className="flex items-center p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-800">Ready to process</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handlePayment}
                  disabled={
                    isProcessing || 
                    (currentMethod?.requiresAmount && amountPaidNum < finalAmount)
                  }
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Complete Payment
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Shortcuts</h4>
                <div className="text-xs text-gray-500 space-y-1">
                  {getKeyboardShortcuts().map((shortcut) => (
                    <div key={shortcut.key} className="flex justify-between">
                      <span>{shortcut.action}</span>
                      <span className="font-mono bg-gray-200 px-1 rounded">{shortcut.key}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentModal