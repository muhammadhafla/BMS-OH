import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { X, Printer, CheckCircle } from 'lucide-react'
import { formatCurrency } from '../lib/utils'

interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface Transaction {
  id: string;
  transactionCode: string;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  status: string;
  createdAt: string;
}

interface ReceiptProps {
  transaction: Transaction;
  items: CartItem[];
  cashier: { name: string; id: string };
  branch: { name: string; address: string; phone: string };
  onPrint: () => void;
  onClose: () => void;
}

const Receipt: React.FC<ReceiptProps> = ({
  transaction,
  items,
  cashier,
  branch,
  onPrint,
  onClose,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Tunai'
      case 'card': return 'Kartu'
      case 'digital': return 'Dompet Digital'
      default: return method
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Transaction Complete
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Receipt Header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-xl font-bold">{branch.name}</h2>
            <p className="text-sm text-gray-600">{branch.address}</p>
            <p className="text-sm text-gray-600">Telp: {branch.phone}</p>
          </div>

          {/* Transaction Info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>No. Transaksi:</span>
              <span className="font-mono">{transaction.transactionCode}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir:</span>
              <span>{cashier.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal:</span>
              <span>{formatDate(transaction.createdAt)}</span>
            </div>
          </div>

          {/* Items */}
          <div className="border-t border-b py-4">
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-sm font-medium text-gray-700 pb-2 border-b">
                <span>Item</span>
                <span className="text-center">Qty</span>
                <span className="text-center">@</span>
                <span className="text-right">Total</span>
              </div>

              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 text-sm">
                  <span className="truncate" title={item.productName}>
                    {item.productName}
                  </span>
                  <span className="text-center">{item.quantity}</span>
                  <span className="text-center">{formatCurrency(item.unitPrice)}</span>
                  <span className="text-right">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(transaction.totalAmount)}</span>
            </div>
            {transaction.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Diskon:</span>
                <span>-{formatCurrency(transaction.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(transaction.finalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Bayar:</span>
              <span>{formatCurrency(transaction.amountPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span>Kembalian:</span>
              <span>{formatCurrency(transaction.change)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="text-center py-2 bg-gray-50 rounded">
            <p className="text-sm font-medium">
              Pembayaran: {getPaymentMethodLabel(transaction.paymentMethod)}
            </p>
          </div>

          {/* Footer */}
          <div className="text-center space-y-1 text-sm text-gray-600">
            <p>Terima Kasih</p>
            <p>Selamat Belanja Kembali</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button onClick={onPrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Receipt