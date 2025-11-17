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
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  User,
  FileText,
  AlertCircle
} from 'lucide-react';

interface InventoryLog {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  date: string;
  reference: string;
  notes?: string;
  performedBy: {
    name: string;
    email: string;
  };
}

interface InventoryLogsProps {
  logs: InventoryLog[];
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

export function InventoryLogs({ 
  logs, 
  pagination, 
  loading, 
  error, 
  productName 
}: InventoryLogsProps) {
  const [currentPage, setCurrentPage] = useState(1);

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
    // In a real implementation, you would trigger a fetch for the specific page
  };

  // Calculate summary stats
  const totalLogs = logs.length;
  const totalStockIn = logs
    .filter(log => log.type === 'IN')
    .reduce((sum, log) => sum + log.quantity, 0);
  const totalStockOut = logs
    .filter(log => log.type === 'OUT')
    .reduce((sum, log) => sum + log.quantity, 0);
  const totalAdjustments = logs
    .filter(log => log.type === 'ADJUSTMENT')
    .reduce((sum, log) => sum + Math.abs(log.quantity), 0);

  // Net movement (Stock In - Stock Out)
  const netMovement = totalStockIn - totalStockOut;

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Inventory Movement Logs
          </CardTitle>
          <CardDescription>
            Stock movement history for {productName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Inventory Logs</h3>
              <p className="text-red-600">{error.message || 'Failed to load inventory movement logs'}</p>
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
            <CardTitle className="text-sm font-medium">Total Movements</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLogs}</div>
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
            <div className={`text-2xl font-bold ${netMovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netMovement >= 0 ? '+' : ''}{netMovement}
            </div>
            <p className="text-xs text-muted-foreground">
              Net stock change
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Movement Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Inventory Movement Logs
          </CardTitle>
          <CardDescription>
            Complete stock movement history for {productName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Performed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground">No inventory logs found</h3>
                        <p className="text-sm text-muted-foreground">
                          No stock movement history available for this product
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const typeStyle = getMovementTypeStyle(log.type);
                    const TypeIcon = typeStyle.icon;
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell>{formatDate(log.date)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={typeStyle.variant} 
                            className="flex items-center gap-1 w-fit"
                          >
                            <TypeIcon className={`w-3 h-3 ${typeStyle.color}`} />
                            {typeStyle.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${
                              log.type === 'IN' ? 'text-green-600' :
                              log.type === 'OUT' ? 'text-red-600' :
                              'text-orange-600'
                            }`}>
                              {log.type === 'IN' ? '+' : log.type === 'OUT' ? '-' : ''}
                              {Math.abs(log.quantity)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{log.reference}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            {log.notes ? (
                              <p className="text-sm text-muted-foreground truncate" title={log.notes}>
                                {log.notes}
                              </p>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">
                                {log.performedBy.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {log.performedBy.email}
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
          {!loading && logs.length > 0 && pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="flex-1 text-sm text-muted-foreground">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total logs)
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