'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
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
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Bell,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { apiService } from '@/services/api';

export function LowStockAlerts() {
  const [showResolved, setShowResolved] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [actionType, setActionType] = useState<'resolve' | 'dismiss'>('resolve');

  // Fetch low stock alerts
  const { data, isLoading, mutate } = useSWR(
    ['/api/inventory/low-stock-alerts', showResolved],
    () => apiService.getLowStockAlerts({
      includeResolved: showResolved,
    }),
    {
      refreshInterval: 30000, // 30 seconds
    }
  );

  const alerts = (data as any)?.data?.alerts || [];

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

  // Handle alert action
  const handleAlertAction = async (alertId: string, action: 'resolve' | 'dismiss') => {
    try {
      if (action === 'resolve') {
        await apiService.resolveLowStockAlert(alertId);
      } else {
        await apiService.dismissLowStockAlert(alertId);
      }
      
      // Refresh the data
      mutate();
      
      // Close dialog
      setShowActionDialog(false);
      setSelectedAlert(null);
      
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  // Calculate summary stats
  const activeAlerts = alerts.filter((alert: any) => alert.status === 'ACTIVE');
  const criticalAlerts = activeAlerts.filter((alert: any) => {
    const severity = getAlertSeverity(alert.currentStock, alert.threshold);
    return severity.level === 'critical';
  }).length;

  const highAlerts = activeAlerts.filter((alert: any) => {
    const severity = getAlertSeverity(alert.currentStock, alert.threshold);
    return severity.level === 'high';
  }).length;

  const mediumAlerts = activeAlerts.filter((alert: any) => {
    const severity = getAlertSeverity(alert.currentStock, alert.threshold);
    return severity.level === 'medium';
  }).length;

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
            <div className="text-2xl font-bold">{activeAlerts.length}</div>
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResolved(!showResolved)}
              >
                {showResolved ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showResolved ? 'Hide Resolved' : 'Show Resolved'}
              </Button>
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
                  <TableHead>Status</TableHead>
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
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
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
                  alerts.map((alert: any) => {
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
                          <Badge 
                            variant={
                              alert.status === 'ACTIVE' ? 'destructive' :
                              alert.status === 'RESOLVED' ? 'default' :
                              'secondary'
                            }
                          >
                            {alert.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {alert.status === 'ACTIVE' && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAlert(alert);
                                  setActionType('resolve');
                                  setShowActionDialog(true);
                                }}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Resolve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedAlert(alert);
                                  setActionType('dismiss');
                                  setShowActionDialog(true);
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          {alert.status !== 'ACTIVE' && (
                            <span className="text-sm text-muted-foreground">
                              {alert.status === 'RESOLVED' ? 'Resolved' : 'Dismissed'}
                            </span>
                          )}
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

      {/* Action Confirmation Dialog */}
      {showActionDialog && selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {actionType === 'resolve' ? 'Resolve Alert' : 'Dismiss Alert'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to {actionType} the low stock alert for{' '}
              <span className="font-medium">{selectedAlert.product?.name}</span>?
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowActionDialog(false);
                  setSelectedAlert(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant={actionType === 'resolve' ? 'default' : 'destructive'}
                onClick={() => handleAlertAction(selectedAlert.id, actionType)}
              >
                {actionType === 'resolve' ? 'Resolve' : 'Dismiss'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}