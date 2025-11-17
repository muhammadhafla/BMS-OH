'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  User,
  FileText,
  AlertCircle,
  Filter,
  X,
  Download,
  Search,
  Calendar,
  Package,
  Eye,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { apiService } from '@/services/api';

export function StockMovementLogs() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    type: 'ALL',
    branch: 'ALL',
    dateFrom: '',
    dateTo: '',
    search: '',
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Fetch stock movement logs
  const { data, error, isLoading, mutate } = useSWR(
    ['/api/inventory/logs', filters, currentPage],
    () => apiService.getStockMovementLogs({
      ...filters,
      page: currentPage,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }),
    {
      refreshInterval: 30000, // 30 seconds
    }
  );

  const movements = (data as any)?.data?.movements || [];
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

  // Get movement type styling
  const getMovementTypeStyle = (type: string) => {
    switch (type) {
      case 'IN':
        return { 
          variant: 'default' as const, 
          icon: TrendingUp, 
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          text: 'Stock In'
        };
      case 'OUT':
        return { 
          variant: 'destructive' as const, 
          icon: TrendingDown, 
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          text: 'Stock Out'
        };
      case 'ADJUSTMENT':
        return { 
          variant: 'secondary' as const, 
          icon: ArrowUpDown, 
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          text: 'Adjustment'
        };
      default:
        return { 
          variant: 'outline' as const, 
          icon: FileText, 
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          text: type
        };
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle filter change
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      type: 'ALL',
      branch: 'ALL',
      dateFrom: '',
      dateTo: '',
      search: '',
    });
    setCurrentPage(1);
  };

  // Export movements
  const handleExport = async () => {
    try {
      const response = await apiService.exportStockMovements(filters as any);
      // Handle CSV download
      const blob = new Blob([(response as any).data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-movements-${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Show movement details
  const handleShowDetails = (movement: any) => {
    setSelectedMovement(movement);
    setShowDetailsDialog(true);
  };

  // Calculate summary stats
  const totalMovements = movements.length;
  const totalStockIn = movements
    .filter((m: any) => m.type === 'IN')
    .reduce((sum: number, m: any) => sum + m.quantity, 0);
  const totalStockOut = movements
    .filter((m: any) => m.type === 'OUT')
    .reduce((sum: number, m: any) => sum + m.quantity, 0);
  const totalAdjustments = movements
    .filter((m: any) => m.type === 'ADJUSTMENT')
    .reduce((sum: number, m: any) => sum + Math.abs(m.quantity), 0);

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Stock Movement Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Movement Logs</h3>
              <p className="text-red-600">{error.message || 'Failed to load stock movement logs'}</p>
              <Button onClick={() => mutate()} className="mt-4" variant="outline">
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
            <CardTitle className="text-sm font-medium">Total Movements</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMovements}</div>
            <p className="text-xs text-muted-foreground">
              All movement types
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock In</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{totalStockIn}</div>
            <p className="text-xs text-muted-foreground">
              Total stock added
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Out</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{totalStockOut}</div>
            <p className="text-xs text-muted-foreground">
              Total stock removed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Movement</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(totalStockIn - totalStockOut) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(totalStockIn - totalStockOut) >= 0 ? '+' : ''}{totalStockIn - totalStockOut}
            </div>
            <p className="text-xs text-muted-foreground">
              Net stock change
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
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
                {(filters.type !== 'ALL' || filters.branch !== 'ALL' || filters.search || filters.dateFrom || filters.dateTo) && (
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mutate()}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {showFilterPanel && (
              <div className="grid gap-4 md:grid-cols-5 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Product, SKU, user..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Movement Type</Label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => handleFilterChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="IN">Stock In</SelectItem>
                      <SelectItem value="OUT">Stock Out</SelectItem>
                      <SelectItem value="ADJUSTMENT">Adjustments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select
                    value={filters.branch}
                    onValueChange={(value) => handleFilterChange('branch', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Branches</SelectItem>
                      <SelectItem value="branch-1">Main Branch</SelectItem>
                      <SelectItem value="branch-2">Secondary Branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Movement Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Stock Movement Logs
          </CardTitle>
          <CardDescription>
            Complete stock movement history with detailed tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <Activity className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground">No movement logs found</h3>
                        <p className="text-sm text-muted-foreground">
                          No stock movement history available for the selected filters
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement: any) => {
                    const typeStyle = getMovementTypeStyle(movement.type);
                    const TypeIcon = typeStyle.icon;
                    
                    return (
                      <TableRow key={movement.id}>
                        <TableCell className="text-sm">{formatDate(movement.createdAt)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{movement.product?.name}</div>
                            <div className="text-xs text-muted-foreground">{movement.product?.sku}</div>
                            <div className="text-xs text-muted-foreground">{movement.branch?.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={typeStyle.variant} 
                            className="flex items-center gap-1 w-fit"
                          >
                            <TypeIcon className={`w-3 h-3`} />
                            {typeStyle.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${
                              movement.type === 'IN' ? 'text-green-600' :
                              movement.type === 'OUT' ? 'text-red-600' :
                              'text-orange-600'
                            }`}>
                              {movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : ''}
                              {Math.abs(movement.quantity)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {movement.product?.unit}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{movement.reference || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">
                                {movement.performedBy?.name || 'System'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {movement.performedBy?.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShowDetails(movement)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!isLoading && movements.length > 0 && pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="flex-1 text-sm text-muted-foreground">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total movements)
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

      {/* Movement Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Movement Details</DialogTitle>
            <DialogDescription>
              Detailed information about this stock movement
            </DialogDescription>
          </DialogHeader>
          {selectedMovement && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Product</Label>
                  <div>
                    <div className="font-medium">{selectedMovement.product?.name}</div>
                    <div className="text-sm text-muted-foreground">SKU: {selectedMovement.product?.sku}</div>
                    <div className="text-sm text-muted-foreground">Unit: {selectedMovement.product?.unit}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Movement Type</Label>
                  <div>
                    <Badge variant={
                      selectedMovement.type === 'IN' ? 'default' :
                      selectedMovement.type === 'OUT' ? 'destructive' :
                      'secondary'
                    }>
                      {selectedMovement.type}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <div className="text-lg font-bold">
                    {selectedMovement.type === 'IN' ? '+' : selectedMovement.type === 'OUT' ? '-' : ''}
                    {Math.abs(selectedMovement.quantity)} {selectedMovement.product?.unit}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date & Time</Label>
                  <div className="text-sm">{formatDate(selectedMovement.createdAt)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reference</Label>
                <div className="text-sm">{selectedMovement.reference || 'No reference provided'}</div>
              </div>

              {selectedMovement.notes && (
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <div className="text-sm p-2 border rounded bg-muted/50">
                    {selectedMovement.notes}
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Performed By</Label>
                  <div>
                    <div className="font-medium">{selectedMovement.performedBy?.name || 'System'}</div>
                    <div className="text-sm text-muted-foreground">{selectedMovement.performedBy?.email}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <div className="text-sm">{selectedMovement.branch?.name}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}