'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import type { StockAdjustment, StockAdjustmentFilters } from '@/types/stock-adjustment';
import { ADJUSTMENT_REASONS } from '@/lib/validations/stock-adjustment';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Hash,
  User,
  FileText,
  AlertCircle,
  Filter,
  X,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

interface StockAdjustmentHistoryProps {
  productId?: string;
  branchId?: string;
  showFilters?: boolean;
}

export function StockAdjustmentHistory({ 
  productId, 
  branchId,
  showFilters = true 
}: StockAdjustmentHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<StockAdjustmentFilters>({
    productId: productId || '',
    branchId: branchId || '',
    adjustmentType: 'ALL',
    status: 'ALL',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Fetch adjustments
  const { data, error, isLoading, mutate } = useSWR(
    ['/api/inventory/adjustments', filters, currentPage],
    () => apiService.getStockAdjustments({
      ...filters,
      page: currentPage,
      limit: 20,
      sortBy: 'date',
      sortOrder: 'desc',
    })
  );

  const adjustments = (data as any)?.data?.adjustments || [];
  const pagination = (data as any)?.data?.pagination;

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

  // Get adjustment type styling
  const getAdjustmentTypeStyle = (type: string) => {
    switch (type) {
      case 'INCREMENT':
        return { 
          variant: 'default' as const, 
          icon: TrendingUp, 
          color: 'text-green-600',
          text: 'Add Stock'
        };
      case 'DECREMENT':
        return { 
          variant: 'destructive' as const, 
          icon: TrendingDown, 
          color: 'text-red-600',
          text: 'Remove Stock'
        };
      case 'SET_TO':
        return { 
          variant: 'secondary' as const, 
          icon: Hash, 
          color: 'text-blue-600',
          text: 'Set to Exact'
        };
      default:
        return { 
          variant: 'outline' as const, 
          icon: FileText, 
          color: 'text-gray-600',
          text: type
        };
    }
  };

  // Get status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { 
          variant: 'default' as const, 
          icon: CheckCircle2, 
          color: 'text-green-600',
          text: 'Completed'
        };
      case 'PENDING':
        return { 
          variant: 'secondary' as const, 
          icon: Clock, 
          color: 'text-orange-600',
          text: 'Pending'
        };
      case 'APPROVED':
        return { 
          variant: 'default' as const, 
          icon: CheckCircle2, 
          color: 'text-blue-600',
          text: 'Approved'
        };
      case 'REJECTED':
        return { 
          variant: 'destructive' as const, 
          icon: XCircle, 
          color: 'text-red-600',
          text: 'Rejected'
        };
      default:
        return { 
          variant: 'outline' as const, 
          icon: FileText, 
          color: 'text-gray-600',
          text: status
        };
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle filter change
  const handleFilterChange = (key: keyof StockAdjustmentFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      productId: productId || '',
      branchId: branchId || '',
      adjustmentType: 'ALL',
      status: 'ALL',
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Export to CSV
  const handleExport = async () => {
    try {
      const response = await apiService.getStockAdjustmentReport(filters as any);
      // Handle CSV download
      const blob = new Blob([(response as any).data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-adjustments-${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Calculate summary stats
  const totalAdjustments = adjustments.length;
  const totalIncrement = adjustments
    .filter((adj: StockAdjustment) => adj.adjustmentType === 'INCREMENT')
    .reduce((sum: number, adj: StockAdjustment) => sum + adj.quantity, 0);
  const totalDecrement = adjustments
    .filter((adj: StockAdjustment) => adj.adjustmentType === 'DECREMENT')
    .reduce((sum: number, adj: StockAdjustment) => sum + adj.quantity, 0);
  const netChange = totalIncrement - totalDecrement;

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Stock Adjustment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading History</h3>
              <p className="text-red-600">{error.message || 'Failed to load adjustment history'}</p>
              <Button 
                onClick={() => mutate()} 
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
            <CardTitle className="text-sm font-medium">Total Adjustments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAdjustments}</div>
            <p className="text-xs text-muted-foreground">
              All adjustment types
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Added</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{totalIncrement}</div>
            <p className="text-xs text-muted-foreground">
              Total stock added
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Removed</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{totalDecrement}</div>
            <p className="text-xs text-muted-foreground">
              Total stock removed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Change</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netChange >= 0 ? '+' : ''}{netChange}
            </div>
            <p className="text-xs text-muted-foreground">
              Net stock change
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                  {(filters.adjustmentType !== 'ALL' || filters.status !== 'ALL' || searchTerm) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>

              {showFilterPanel && (
                <div className="grid gap-4 md:grid-cols-4 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Adjustment Type</label>
                    <Select
                      value={filters.adjustmentType || 'ALL'}
                      onValueChange={(value) => handleFilterChange('adjustmentType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Types</SelectItem>
                        <SelectItem value="INCREMENT">Add Stock</SelectItem>
                        <SelectItem value="DECREMENT">Remove Stock</SelectItem>
                        <SelectItem value="SET_TO">Set to Exact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={filters.status || 'ALL'}
                      onValueChange={(value) => handleFilterChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reason</label>
                    <Select
                      value={filters.reason || 'ALL'}
                      onValueChange={(value) => handleFilterChange('reason', value === 'ALL' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Reasons" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Reasons</SelectItem>
                        {Object.values(ADJUSTMENT_REASONS).map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adjustment History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Adjustment History
          </CardTitle>
          <CardDescription>
            Complete stock adjustment history with details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {!productId && <TableHead>Product</TableHead>}
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Previous</TableHead>
                  <TableHead>New</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Performed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      {!productId && <TableCell><Skeleton className="h-4 w-32" /></TableCell>}
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    </TableRow>
                  ))
                ) : adjustments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={productId ? 8 : 9} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground">No adjustments found</h3>
                        <p className="text-sm text-muted-foreground">
                          No stock adjustment history available
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  adjustments.map((adjustment: StockAdjustment) => {
                    const typeStyle = getAdjustmentTypeStyle(adjustment.adjustmentType);
                    const statusStyle = getStatusStyle(adjustment.status);
                    const TypeIcon = typeStyle.icon;
                    const StatusIcon = statusStyle.icon;
                    
                    return (
                      <TableRow key={adjustment.id}>
                        <TableCell className="text-sm">{formatDate(adjustment.createdAt)}</TableCell>
                        {!productId && (
                          <TableCell>
                            <div>
                              <div className="font-medium">{adjustment.product?.name}</div>
                              <div className="text-xs text-muted-foreground">{adjustment.product?.sku}</div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant={typeStyle.variant} className="flex items-center gap-1 w-fit">
                            <TypeIcon className={`w-3 h-3`} />
                            {typeStyle.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            adjustment.adjustmentType === 'INCREMENT' ? 'text-green-600' :
                            adjustment.adjustmentType === 'DECREMENT' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>
                            {adjustment.adjustmentType === 'INCREMENT' ? '+' : 
                             adjustment.adjustmentType === 'DECREMENT' ? '-' : ''}
                            {adjustment.quantity}
                          </span>
                        </TableCell>
                        <TableCell>{adjustment.previousStock}</TableCell>
                        <TableCell className="font-medium">{adjustment.newStock}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={adjustment.reason}>
                          {adjustment.reason}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusStyle.variant} className="flex items-center gap-1 w-fit">
                            <StatusIcon className={`w-3 h-3`} />
                            {statusStyle.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">
                                {adjustment.performedBy?.name || 'Unknown'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {adjustment.performedBy?.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!isLoading && adjustments.length > 0 && pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="flex-1 text-sm text-muted-foreground">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total adjustments)
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