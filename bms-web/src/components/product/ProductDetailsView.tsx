'use client';

import React, { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  ArrowLeft,
  Edit3,
  Settings,
  History,
  TrendingUp,
  XCircle,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Hash,
  Tag,
  User,
  Calendar,
  Building2
} from 'lucide-react';
import { apiService } from '@/services/api';
import { ProductDetails } from './ProductDetails';
import { TransactionHistory } from './TransactionHistory';
import { InventoryLogs } from './InventoryLogs';
import { EditProductForm } from './EditProductForm';
import { StockAdjustmentForm } from './StockAdjustmentForm';
import type {
  ProductListResponse,
  TransactionListResponse,
  InventoryLogListResponse,
  ApiResponse,
  Transaction,
  InventoryLog
} from '@/types/api-responses';

interface ProductDetailsViewProps {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductUpdate?: () => void;
}

// Types
interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  barcode: string;
  category: {
    id: string;
    name: string;
  } | null;
  branch: {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}


// SWR fetcher
const fetcher = <T,>(url: string): Promise<T> => apiService.get<T>(url);

// Mapping functions to convert API types to component expected types
const mapTransaction = (transaction: import('@/types/api-responses').Transaction) => ({
  id: transaction.id,
  code: transaction.transactionNumber,
  date: transaction.createdAt,
  type: transaction.type as 'SALE' | 'PURCHASE' | 'ADJUSTMENT',
  quantity: transaction.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
  totalAmount: transaction.total,
  customer: transaction.customer ? { ...transaction.customer, email: '' } : undefined,
  staff: { name: '', email: '' },
  status: transaction.status.replace('REFUNDED', 'CANCELLED') as 'PENDING' | 'COMPLETED' | 'CANCELLED',
  notes: transaction.notes
});

const mapInventoryLog = (log: import('@/types/api-responses').InventoryLog) => ({
  id: log.id,
  type: (log.type === 'STOCK_IN' ? 'IN' : log.type === 'STOCK_OUT' ? 'OUT' : 'ADJUSTMENT') as 'IN' | 'OUT' | 'ADJUSTMENT',
  quantity: log.quantity,
  date: log.createdAt,
  reference: log.reference || '',
  notes: log.reason,
  performedBy: { name: '', email: '' }
});

export function ProductDetailsView({ 
  productId, 
  open, 
  onOpenChange, 
  onProductUpdate 
}: ProductDetailsViewProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch product details
  const { 
    data: productData, 
    error: productError, 
    isLoading: productLoading 
  } = useSWR<ApiResponse<{ product: Product }>>(
    productId ? `/api/products/${productId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Fetch transaction history
  const { 
    data: transactionsData, 
    error: transactionsError, 
    isLoading: transactionsLoading 
  } = useSWR<TransactionListResponse>(
    productId ? `/api/transactions?productId=${productId}&limit=20` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  // Fetch inventory logs
  const { 
    data: inventoryLogsData, 
    error: inventoryLogsError, 
    isLoading: inventoryLogsLoading 
  } = useSWR<InventoryLogListResponse>(
    productId ? `/api/inventory/logs?productId=${productId}&limit=20` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  // Extract data
  const product = productData?.data?.product;
  const transactions = (transactionsData?.data?.items || []).map(mapTransaction);
  const inventoryLogs = (inventoryLogsData?.data?.items || []).map(mapInventoryLog);
  const transactionsPagination = transactionsData?.data?.pagination;
  const inventoryLogsPagination = inventoryLogsData?.data?.pagination;

  // Get stock status badge
  const getStockStatus = (product: Product) => {
    if (product.stock <= 0) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Out of Stock</Badge>;
    } else if (product.stock <= product.minStock) {
      return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Low Stock</Badge>;
    } else if (product.stock >= product.maxStock) {
      return <Badge variant="default"><AlertTriangle className="w-3 h-3 mr-1" />Overstock</Badge>;
    } else {
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />In Stock</Badge>;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle product update
  const handleProductUpdate = () => {
    setIsEditing(false);
    setRefreshTrigger(prev => prev + 1);
    mutate(`/api/products/${productId}`);
    mutate('/api/products');
    onProductUpdate?.();
    toast.success('Product updated successfully!', {
      description: `${product?.name} has been updated.`,
    });
  };

  // Handle stock adjustment
  const handleStockAdjustment = () => {
    setIsAdjustingStock(false);
    setRefreshTrigger(prev => prev + 1);
    mutate(`/api/products/${productId}`);
    mutate('/api/products');
    onProductUpdate?.();
    toast.success('Stock adjusted successfully!', {
      description: `Stock for ${product?.name} has been updated.`,
    });
  };

  // Handle modal close
  const handleOpenChange = (newOpen: boolean) => {
    if (!isEditing && !isAdjustingStock) {
      onOpenChange(newOpen);
      setActiveTab('details');
    }
  };

  // Loading state for product
  if (productLoading) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state
  if (productError) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Error Loading Product
            </DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {productError.message || 'Failed to load product details'}
            </AlertDescription>
          </Alert>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => mutate(`/api/products/${productId}`)}>
              Try Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onOpenChange(false)}
                  className="p-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <DialogTitle className="flex items-center gap-3">
                    <Package className="h-5 w-5" />
                    {product.name}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-4 mt-2">
                    <span>SKU: {product.sku}</span>
                    <span>•</span>
                    <span>{product.branch.name}</span>
                    <span>•</span>
                    <span>{formatDate(product.createdAt)}</span>
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStockStatus(product)}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAdjustingStock(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Adjust Stock
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Product
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Transactions
                </TabsTrigger>
                <TabsTrigger value="inventory" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Inventory Logs
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-6">
                <ProductDetails 
                  product={product}
                  onEdit={() => setIsEditing(true)}
                />
              </TabsContent>

              <TabsContent value="transactions" className="mt-6">
                <TransactionHistory 
                  transactions={transactions}
                  pagination={transactionsPagination}
                  loading={transactionsLoading}
                  error={transactionsError}
                  productName={product.name}
                />
              </TabsContent>

              <TabsContent value="inventory" className="mt-6">
                <InventoryLogs 
                  logs={inventoryLogs}
                  pagination={inventoryLogsPagination}
                  loading={inventoryLogsLoading}
                  error={inventoryLogsError}
                  productName={product.name}
                />
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Analytics</CardTitle>
                    <CardDescription>
                      Performance metrics and insights for {product.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-4" />
                      <p>Analytics coming soon...</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Form */}
      {isEditing && (
        <EditProductForm
          product={product}
          open={isEditing}
          onOpenChange={setIsEditing}
          onSuccess={handleProductUpdate}
        />
      )}

      {/* Stock Adjustment Form */}
      {isAdjustingStock && (
        <StockAdjustmentForm
          product={product}
          open={isAdjustingStock}
          onOpenChange={setIsAdjustingStock}
          onSuccess={handleStockAdjustment}
        />
      )}
    </>
  );
}