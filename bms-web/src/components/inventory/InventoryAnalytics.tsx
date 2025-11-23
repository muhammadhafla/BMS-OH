'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Download,
  AlertCircle,
  AlertTriangle,
  Package,
  DollarSign,
  Target,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { apiService } from '@/services/api';

export function InventoryAnalytics() {
  const [dateRange, setDateRange] = useState('30'); // days
  const [branchFilter, setBranchFilter] = useState('ALL');

  // Fetch analytics data
  const { data, error, isLoading, mutate } = useSWR(
    ['/api/inventory/analytics', dateRange, branchFilter],
    () => apiService.getInventoryAnalytics({
      dateRange: parseInt(dateRange),
      branchId: branchFilter === 'ALL' ? undefined : branchFilter,
    }),
    {
      refreshInterval: 60000, // 1 minute
    }
  );

  const analytics = (data as any)?.data || {
    stockMovements: {
      daily: [],
      byType: { IN: 0, OUT: 0, ADJUSTMENT: 0 },
      byBranch: {},
      trends: [],
    },
    stockLevels: {
      current: 0,
      changes: 0,
      distributions: { normal: 0, low: 0, out: 0, overstock: 0 },
      topProducts: [],
    },
    valuations: {
      totalValue: 0,
      byCategory: {},
      byBranch: {},
      methods: { FIFO: 0, LIFO: 0, AVERAGE: 0 },
    },
    alerts: {
      total: 0,
      critical: 0,
      resolved: 0,
      trends: [],
    },
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  // Export analytics
  const handleExport = async () => {
    try {
      const response = await apiService.getStockValuationReport({
        dateRange: parseInt(dateRange),
        branchId: branchFilter === 'ALL' ? undefined : branchFilter,
      });
      // Handle CSV download
      const blob = new Blob([(response as any).data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-analytics-${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Calculate percentages
  const totalMovements = analytics.stockMovements.byType.IN + 
                        analytics.stockMovements.byType.OUT + 
                        analytics.stockMovements.byType.ADJUSTMENT;

  const movementPercentages = {
    in: totalMovements > 0 ? (analytics.stockMovements.byType.IN / totalMovements) * 100 : 0,
    out: totalMovements > 0 ? (analytics.stockMovements.byType.OUT / totalMovements) * 100 : 0,
    adjustment: totalMovements > 0 ? (analytics.stockMovements.byType.ADJUSTMENT / totalMovements) * 100 : 0,
  };

  const totalStockItems = analytics.stockLevels.distributions.normal + 
                         analytics.stockLevels.distributions.low + 
                         analytics.stockLevels.distributions.out + 
                         analytics.stockLevels.distributions.overstock;

  const stockDistributions = {
    normal: totalStockItems > 0 ? (analytics.stockLevels.distributions.normal / totalStockItems) * 100 : 0,
    low: totalStockItems > 0 ? (analytics.stockLevels.distributions.low / totalStockItems) * 100 : 0,
    out: totalStockItems > 0 ? (analytics.stockLevels.distributions.out / totalStockItems) * 100 : 0,
    overstock: totalStockItems > 0 ? (analytics.stockLevels.distributions.overstock / totalStockItems) * 100 : 0,
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Inventory Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Analytics</h3>
              <p className="text-red-600">{error.message || 'Failed to load inventory analytics'}</p>
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
      {/* Header with Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Inventory Analytics & Insights
              </CardTitle>
              <CardDescription>
                Comprehensive analysis of inventory performance and trends
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[150px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Branches</SelectItem>
                  <SelectItem value="branch-1">Main Branch</SelectItem>
                  <SelectItem value="branch-2">Secondary Branch</SelectItem>
                </SelectContent>
              </Select>
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
        </CardHeader>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movements</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalMovements.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Stock movements tracked
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(analytics.valuations.totalValue)}</div>
                <p className="text-xs text-muted-foreground">
                  Total inventory value
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-600">{analytics.alerts.total}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.alerts.critical} critical issues
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Changes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${analytics.stockLevels.changes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.stockLevels.changes >= 0 ? '+' : ''}{analytics.stockLevels.changes.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Net stock change
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movement Analysis */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Movement Types Distribution
            </CardTitle>
            <CardDescription>
              Breakdown of stock movement types
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Stock In</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">
                        {analytics.stockMovements.byType.IN.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {movementPercentages.in.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">Stock Out</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-600">
                        {analytics.stockMovements.byType.OUT.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {movementPercentages.out.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Adjustments</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-600">
                        {analytics.stockMovements.byType.ADJUSTMENT.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {movementPercentages.adjustment.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Stock Level Distribution
            </CardTitle>
            <CardDescription>
              Current stock status across all products
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Normal Stock</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">
                        {analytics.stockLevels.distributions.normal}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stockDistributions.normal.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">Low Stock</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-orange-600">
                        {analytics.stockLevels.distributions.low}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stockDistributions.low.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">Out of Stock</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-600">
                        {analytics.stockLevels.distributions.out}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stockDistributions.out.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Overstock</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-600">
                        {analytics.stockLevels.distributions.overstock}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stockDistributions.overstock.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products and Valuation Analysis */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Moving Products
            </CardTitle>
            <CardDescription>
              Products with highest movement activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              ) : analytics.stockLevels.topProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No movement data available
                </div>
              ) : (
                analytics.stockLevels.topProducts.map((product: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{product.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{product.movementCount}</div>
                      <div className="text-xs text-muted-foreground">movements</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Valuation Methods
            </CardTitle>
            <CardDescription>
              Stock valuation by different methods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))
              ) : (
                Object.entries(analytics.valuations.methods).map(([method, value]) => (
                  <div key={method} className="flex items-center justify-between p-2 border rounded">
                    <div className="font-medium">{method}</div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(value as number)}</div>
                      <div className="text-xs text-muted-foreground">
                        {((value as number / analytics.valuations.totalValue) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}