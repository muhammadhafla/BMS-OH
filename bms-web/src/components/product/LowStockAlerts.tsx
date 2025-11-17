'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import type { LowStockAlert, Product } from '@/types/stock-adjustment';

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
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Package,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface LowStockAlertsProps {
  branchId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function LowStockAlerts({ 
  branchId, 
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: LowStockAlertsProps) {
  const { user } = useAuthStore();
  const [selectedAlert, setSelectedAlert] = useState<LowStockAlert | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch low stock alerts
  const { data, error, isLoading, mutate } = useSWR(
    ['/api/inventory/low-stock-alerts', branchId],
    () => apiService.getLowStockAlerts({ 
      branchId,
      status: 'ACTIVE',
    }),
    {
      refreshInterval: autoRefresh ? refreshInterval : 0,
    }
  );

  const alerts = (data as any)?.data?.alerts || [];
  const products = (data as any)?.data?.products || [];

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

  // Get alert severity
  const getAlertSeverity = (currentStock: number, threshold: number) => {
    const percentage = (currentStock / threshold) * 100;
    if (percentage <= 25) {
      return { 
        level: 'critical', 
        color: 'text-red-600', 
        bgColor: 'bg-red-100',
        variant: 'destructive' as const,
        icon: AlertCircle,
        text: 'Critical'
      };
    } else if (percentage <= 50) {
      return { 
        level: 'high', 
        color: 'text-orange-600', 
        bgColor: 'bg-orange-100',
        variant: 'default' as const,
        icon: AlertTriangle,
        text: 'High'
      };
    } else {
      return { 
        level: 'medium', 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-100',
        variant: 'secondary' as const,
        icon: AlertTriangle,
        text: 'Medium'
      };
    }
  };

  // Handle dismiss alert
  const handleDismissAlert = async (alertId: string) => {
    setIsProcessing(true);
    try {
      await apiService.dismissLowStockAlert(alertId);
      toast.success('Alert dismissed', {
        description: 'The low stock alert has been dismissed',
      });
      mutate();
    } catch (error: any) {
      toast.error('Failed to dismiss alert', {
        description: error.message || 'An error occurred',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle resolve alert
  const handleResolveAlert = async (alertId: string) => {
    setIsProcessing(true);
    try {
      await apiService.resolveLowStockAlert(alertId);
      toast.success('Alert resolved', {
        description: 'The low stock alert has been marked as resolved',
      });
      setShowResolveDialog(false);
      setSelectedAlert(null);
      mutate();
    } catch (error: any) {
      toast.error('Failed to resolve alert', {
        description: error.message || 'An error occurred',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate summary stats
  const criticalAlerts = alerts.filter((alert: LowStockAlert) => {
    const severity = getAlertSeverity(alert.currentStock, alert.threshold);
    return severity.level === 'critical';
  }).length;

  const highAlerts = alerts.filter((alert: LowStockAlert) => {
    const severity = getAlertSeverity(alert.currentStock, alert.threshold);
    return severity.level === 'high';
  }).length;

  const mediumAlerts = alerts.filter((alert: LowStockAlert) => {
    const severity = getAlertSeverity(alert.currentStock, alert.threshold);
    return severity.level === 'medium';
  }).length;

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Alerts</h3>
              <p className="text-red-600">{error.message || 'Failed to load low stock alerts'}</p>
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
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Active low stock alerts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              ≤25% of threshold
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{highAlerts}</div>
            <p className="text-xs text-muted-foreground">
              ≤50% of threshold
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{mediumAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {'>'}50% of threshold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>
                Products that are running low on stock
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Alert Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                        <h3 className="text-lg font-semibold text-green-900">All Stock Levels Normal</h3>
                        <p className="text-sm text-muted-foreground">
                          No low stock alerts at this time
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.map((alert: LowStockAlert) => {
                    const severity = getAlertSeverity(alert.currentStock, alert.threshold);
                    const SeverityIcon = severity.icon;
                    const percentage = ((alert.currentStock / alert.threshold) * 100).toFixed(0);
                    
                    return (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <Badge variant={severity.variant} className="flex items-center gap-1 w-fit">
                            <SeverityIcon className="w-3 h-3" />
                            {severity.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{alert.product?.name}</div>
                            <div className="text-xs text-muted-foreground">{alert.product?.sku}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${severity.color}`}>
                            {alert.currentStock} {alert.product?.unit}
                          </span>
                        </TableCell>
                        <TableCell>
                          {alert.threshold} {alert.product?.unit}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${severity.bgColor}`}
                                style={{ width: `${Math.min(100, parseInt(percentage))}%` }}
                              />
                            </div>
                            <span className="text-sm">{percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{alert.product?.branch?.name}</TableCell>
                        <TableCell className="text-sm">{formatDate(alert.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedAlert(alert);
                                setShowResolveDialog(true);
                              }}
                              disabled={isProcessing}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Resolve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDismissAlert(alert.id)}
                              disabled={isProcessing}
                            >
                              <EyeOff className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Resolve Alert Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Low Stock Alert</DialogTitle>
            <DialogDescription>
              Mark this alert as resolved. This indicates that the stock issue has been addressed.
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Product:</span>
                    <span className="text-sm">{selectedAlert.product?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Stock:</span>
                    <span className="text-sm font-bold text-red-600">
                      {selectedAlert.currentStock} {selectedAlert.product?.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Threshold:</span>
                    <span className="text-sm">{selectedAlert.threshold} {selectedAlert.product?.unit}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Have you restocked this product or addressed the low stock issue?
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResolveDialog(false);
                setSelectedAlert(null);
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedAlert && handleResolveAlert(selectedAlert.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark as Resolved
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}