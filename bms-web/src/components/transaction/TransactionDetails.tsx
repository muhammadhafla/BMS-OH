// Transaction Details Component
// Provides detailed view of a transaction with itemized breakdown and actions

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Transaction } from '@/lib/types/transaction';
import {
  Receipt,
  Calendar,
  User,
  Building2,
  Edit,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TransactionDetailsProps {
  transaction: Transaction;
  onClose: () => void;
  onUpdateStatus: (transactionId: string, status: string, notes?: string) => Promise<void>;
  onGenerateReceipt?: (transactionId: string) => Promise<void>;
}

export function TransactionDetails({
  transaction,
  onClose,
  onUpdateStatus,
  onGenerateReceipt,
}: TransactionDetailsProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [_showCancelDialog, setShowCancelDialog] = useState(false);
  const [_showRefundDialog, setShowRefundDialog] = useState(false);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'PENDING':
        return <Badge variant="outline" className="border-yellow-300 text-yellow-700">Pending</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'REFUNDED':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus: string, notes?: string) => {
    setIsUpdatingStatus(true);
    try {
      await onUpdateStatus(transaction.id, newStatus, notes);
      toast.success(`Transaction ${newStatus.toLowerCase()} successfully`);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update transaction status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle generate receipt
  const handleGenerateReceipt = async () => {
    try {
      if (onGenerateReceipt) {
        await onGenerateReceipt(transaction.id);
      } else {
        // Default PDF download
        const response = await fetch(`/api/transactions/${transaction.id}/receipt/pdf`);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `receipt-${transaction.transactionCode}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Failed to generate receipt:', error);
      toast.error('Failed to generate receipt');
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            Complete information for transaction {transaction.transactionCode}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Transaction Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Transaction Code</Label>
                    <span className="font-mono text-sm">{transaction.transactionCode}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Status</Label>
                    {getStatusBadge(transaction.status)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Total Amount</Label>
                    <span className="font-semibold">{formatCurrency(transaction.finalAmount)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Payment Method</Label>
                    <span>{transaction.paymentMethod.replace('_', ' ')}</span>
                  </div>
                  
                  {transaction.notes && (
                    <div>
                      <Label>Notes</Label>
                      <p className="text-sm text-muted-foreground mt-1">{transaction.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* User & Branch Info */}
              <Card>
                <CardHeader>
                  <CardTitle>User & Branch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{transaction.user.name}</div>
                      <div className="text-sm text-muted-foreground">{transaction.user.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{transaction.branch.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.branch.address || 'No address specified'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Created</div>
                      <div className="text-sm text-muted-foreground">{formatDate(transaction.createdAt)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(transaction.totalAmount)}</span>
                  </div>
                  
                  {transaction.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(transaction.discount)}</span>
                    </div>
                  )}
                  
                  {transaction.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatCurrency(transaction.tax)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(transaction.finalAmount)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Amount Paid</span>
                    <span>{formatCurrency(transaction.amountPaid)}</span>
                  </div>
                  
                  {transaction.change > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Change</span>
                      <span>{formatCurrency(transaction.change)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button onClick={handleGenerateReceipt} className="w-full">
                    <Receipt className="w-4 h-4 mr-2" />
                    Generate Receipt
                  </Button>
                  
                  {transaction.status === 'PENDING' && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleStatusUpdate('COMPLETED')}
                      disabled={isUpdatingStatus}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Mark as Complete
                    </Button>
                  )}
                  
                  {['PENDING', 'COMPLETED'].includes(transaction.status) && (
                    <div className="space-y-2">
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={() => setShowCancelDialog(true)}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Cancel Transaction
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="w-full text-orange-600 border-orange-300"
                        onClick={() => setShowRefundDialog(true)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Process Refund
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="items" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Items</CardTitle>
                <CardDescription>
                  {transaction.items.length} item(s) in this transaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transaction.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {item.product.sku} • 
                          {item.product.barcode && ` Barcode: ${item.product.barcode}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(item.total)}</div>
                        {item.discount > 0 && (
                          <div className="text-sm text-green-600">
                            Discount: {formatCurrency(item.discount)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Timeline</CardTitle>
                <CardDescription>
                  History of changes and actions on this transaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Transaction Created</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(transaction.createdAt)} by {transaction.user.name}
                      </div>
                    </div>
                  </div>
                  {transaction.status !== 'PENDING' && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Status Updated</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(transaction.updatedAt)} • {transaction.status}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleGenerateReceipt}>
            <Receipt className="w-4 h-4 mr-2" />
            Generate Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}