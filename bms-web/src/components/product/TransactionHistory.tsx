'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  ChevronLeft,
  ChevronRight,
  History,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  User,
  Receipt,
  AlertCircle
} from 'lucide-react';

interface Transaction {
  id: string;
  code: string;
  date: string;
  type: 'SALE' | 'PURCHASE' | 'ADJUSTMENT';
  quantity: number;
  totalAmount: number;
  customer?: {
    name: string;
    email: string;
  };
  staff?: {
    name: string;
    email: string;
  };
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  notes?: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  loading: boolean;
  error: any;
  productName: string;
}

export function TransactionHistory({ 
  transactions, 
  pagination, 
  loading, 
  error, 
  productName 
}: TransactionHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1);

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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get transaction type styling
  const getTransactionTypeStyle = (type: string) => {
    switch (type) {
      case 'SALE':
        return { variant: 'default' as const, icon: TrendingDown, color: 'text-green-600' };
      case 'PURCHASE':
        return { variant: 'secondary' as const, icon: TrendingUp, color: 'text-blue-600' };
      case 'ADJUSTMENT':
        return { variant: 'outline' as const, icon: ArrowUpDown, color: 'text-orange-600' };
      default:
        return { variant: 'secondary' as const, icon: Receipt, color: 'text-gray-600' };
    }
  };

  // Get status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { variant: 'default' as const, text: 'Completed' };
      case 'PENDING':
        return { variant: 'secondary' as const, text: 'Pending' };
      case 'CANCELLED':
        return { variant: 'destructive' as const, text: 'Cancelled' };
      default:
        return { variant: 'secondary' as const, text: status };
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // In a real implementation, you would trigger a fetch for the specific page
  };

  // Calculate summary stats
  const totalTransactions = transactions.length;
  const totalSales = transactions.filter(t => t.type === 'SALE').length;
  const totalPurchases = transactions.filter(t => t.type === 'PURCHASE').length;
  const totalAdjustments = transactions.filter(t => t.type === 'ADJUSTMENT').length;
  const totalRevenue = transactions
    .filter(t => t.type === 'SALE' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.totalAmount, 0);

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            Transaction history for {productName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Transactions</h3>
              <p className="text-red-600">{error.message || 'Failed to load transaction history'}</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              All transaction types
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Completed sales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchases</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalPurchases}</div>
            <p className="text-xs text-muted-foreground">
              Stock purchases
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From completed sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            Complete transaction history for {productName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Customer/Staff</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <History className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground">No transactions found</h3>
                        <p className="text-sm text-muted-foreground">
                          No transaction history available for this product
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => {
                    const typeStyle = getTransactionTypeStyle(transaction.type);
                    const statusStyle = getStatusStyle(transaction.status);
                    const TypeIcon = typeStyle.icon;
                    
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-muted-foreground" />
                            {transaction.code}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell>
                          <Badge variant={typeStyle.variant} className="flex items-center gap-1 w-fit">
                            <TypeIcon className={`w-3 h-3 ${typeStyle.color}`} />
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {transaction.quantity}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(transaction.totalAmount)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">
                                {transaction.customer?.name || transaction.staff?.name || 'N/A'}
                              </div>
                              {transaction.customer?.email && (
                                <div className="text-xs text-muted-foreground">
                                  {transaction.customer.email}
                                </div>
                              )}
                              {transaction.staff?.email && (
                                <div className="text-xs text-muted-foreground">
                                  Staff: {transaction.staff.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusStyle.variant}>
                            {statusStyle.text}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && transactions.length > 0 && pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="flex-1 text-sm text-muted-foreground">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total transactions)
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const page = i + Math.max(1, pagination.page - 2);
                    if (page > pagination.pages) return null;
                    return (
                      <Button
                        key={page}
                        variant={pagination.page === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}