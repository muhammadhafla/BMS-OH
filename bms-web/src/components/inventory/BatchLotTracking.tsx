'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  Minus,
  Barcode,
  Hash,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
} from 'lucide-react';
import { apiService } from '@/services/api';

export function BatchLotTracking() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterExpiry, setFilterExpiry] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Fetch batch tracking data
  const { data, error, isLoading, mutate } = useSWR(
    ['/api/inventory/batch-tracking', searchTerm, filterStatus, filterExpiry, branchFilter, currentPage],
    () => apiService.getBatchLotTracking({
      search: searchTerm || undefined,
      status: filterStatus === 'ALL' ? undefined : filterStatus,
      expiryStatus: filterExpiry === 'ALL' ? undefined : filterExpiry,
      branchId: branchFilter === 'ALL' ? undefined : branchFilter,
      page: currentPage,
      pageSize,
    }),
    {
      refreshInterval: 60000, // 1 minute
    }
  );

  const batchData = (data as any)?.data || {
    batches: [],
    summary: {
      totalBatches: 0,
      totalQuantity: 0,
      expiringSoon: 0,
      expired: 0,
      active: 0,
    },
    expiryAlerts: [],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
    },
  };

  // Format currency and dates
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get expiry status
  const getExpiryStatus = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'EXPIRED', color: 'destructive', text: 'Expired', days: daysUntilExpiry };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'EXPIRING_SOON', color: 'destructive', text: 'Expiring Soon', days: daysUntilExpiry };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'EXPIRING', color: 'secondary', text: 'Expiring', days: daysUntilExpiry };
    } else {
      return { status: 'ACTIVE', color: 'default', text: 'Active', days: daysUntilExpiry };
    }
  };

  // Get batch status
  const getBatchStatus = (batch: any) => {
    if (batch.remainingQuantity <= 0) {
      return { status: 'CONSUMED', color: 'secondary', text: 'Consumed', icon: CheckCircle2 };
    } else {
      return { status: 'ACTIVE', color: 'default', text: 'Active', icon: Activity };
    }
  };

  // Filter batches based on search and filters
  const filteredBatches = batchData.batches.filter((batch: any) => {
    const matchesSearch = !searchTerm || 
      batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Export functionality
  const handleExport = async () => {
    try {
      const response = await apiService.exportBatchTracking({
        search: searchTerm || undefined,
        status: filterStatus === 'ALL' ? undefined : filterStatus,
        expiryStatus: filterExpiry === 'ALL' ? undefined : filterExpiry,
        branchId: branchFilter === 'ALL' ? undefined : branchFilter,
      });
      
      const blob = new Blob([(response as any).data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-tracking-${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Batch & Lot Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Data</h3>
              <p className="text-red-600">{error.message || 'Failed to load batch tracking data'}</p>
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
      {/* Header with Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Batch & Lot Tracking
              </CardTitle>
              <CardDescription>
                Track inventory by batch and lot numbers with expiry management
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by batch number, product name, or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="CONSUMED">Consumed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterExpiry} onValueChange={setFilterExpiry}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Expiry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Expiry</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRING">Expiring</SelectItem>
                <SelectItem value="EXPIRING_SOON">Expiring Soon</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{batchData.summary.totalBatches}</div>
                <p className="text-xs text-muted-foreground">
                  Active batches
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{batchData.summary.totalQuantity.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Units in stock
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{batchData.summary.active}</div>
                <p className="text-xs text-muted-foreground">
                  Currently active
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-600">{batchData.summary.expiringSoon}</div>
                <p className="text-xs text-muted-foreground">
                  Within 7 days
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">{batchData.summary.expired}</div>
                <p className="text-xs text-muted-foreground">
                  Past expiry date
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiry Alerts */}
      {batchData.expiryAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Expiry Alerts</div>
            <div className="space-y-1">
              {batchData.expiryAlerts.slice(0, 3).map((alert: any, index: number) => (
                <div key={index} className="text-sm">
                  {alert.product.name} - {alert.batchNumber} expires on {formatDate(alert.expiryDate)}
                </div>
              ))}
              {batchData.expiryAlerts.length > 3 && (
                <div className="text-sm">... and {batchData.expiryAlerts.length - 3} more</div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Batch & Lot Inventory
          </CardTitle>
          <CardDescription>
            Detailed view of all batches and lots with tracking information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch/Lot</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 10 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || filterStatus !== 'ALL' || filterExpiry !== 'ALL' 
                ? 'No batches found matching your criteria'
                : 'No batches found'
              }
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch/Lot Number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Initial Quantity</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Batch Status</TableHead>
                    <TableHead>Expiry Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((batch: any) => {
                    const expiryStatus = getExpiryStatus(batch.expiryDate);
                    const batchStatus = getBatchStatus(batch);
                    const BatchIcon = batchStatus.icon;
                    
                    return (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium font-mono">{batch.batchNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(batch.createdAt)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{batch.product.name}</div>
                            <div className="text-xs text-muted-foreground">
                              SKU: {batch.product.sku}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            {batch.initialQuantity} {batch.product.unit}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <span className={batch.remainingQuantity <= 0 ? 'text-muted-foreground' : 'font-medium'}>
                              {batch.remainingQuantity} {batch.product.unit}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="font-medium">{formatDate(batch.expiryDate)}</div>
                            <div className="text-xs text-muted-foreground">
                              {expiryStatus.days} days
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <Badge variant={batchStatus.color as any} className="text-xs">
                              <BatchIcon className="h-3 w-3 mr-1" />
                              {batchStatus.text}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <Badge variant={expiryStatus.color as any} className="text-xs">
                              {expiryStatus.text}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedBatch(batch);
                                setShowDetails(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {batchData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, batchData.pagination.totalItems)} of {batchData.pagination.totalItems} results
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <div className="text-sm">
                  Page {currentPage} of {batchData.pagination.totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(Math.min(batchData.pagination.totalPages, currentPage + 1))}
                  disabled={currentPage >= batchData.pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              Batch Details - {selectedBatch?.batchNumber}
            </DialogTitle>
            <DialogDescription>
              Comprehensive view of batch information and movement history
            </DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-6">
              {/* Batch Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Batch Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Batch Number:</span>
                      <span className="text-sm font-medium">{selectedBatch.batchNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Product:</span>
                      <span className="text-sm font-medium">{selectedBatch.product.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">SKU:</span>
                      <span className="text-sm font-medium">{selectedBatch.product.sku}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Initial Quantity:</span>
                      <span className="text-sm font-medium">{selectedBatch.initialQuantity} {selectedBatch.product.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Remaining:</span>
                      <span className="text-sm font-medium">{selectedBatch.remainingQuantity} {selectedBatch.product.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Expiry Date:</span>
                      <span className="text-sm font-medium">{formatDate(selectedBatch.expiryDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Created:</span>
                      <span className="text-sm font-medium">{formatDateTime(selectedBatch.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Movement History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4 text-muted-foreground">
                      Movement history will be implemented here
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}