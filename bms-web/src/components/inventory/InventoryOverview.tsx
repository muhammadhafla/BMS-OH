'use client';

import React from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Activity,
  RefreshCw,
  Target,
  Layers,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { apiService } from '@/services/api';

export function InventoryOverview() {
  // Fetch inventory overview data
  const { data, error, isLoading, mutate } = useSWR(
    ['/api/inventory/overview'],
    () => apiService.getInventoryOverview(),
    {
      refreshInterval: 30000, // 30 seconds
    }
  );

  // Transform API response to match component expectations
  const transformData = (apiData: any) => {
    if (!apiData?.data) return {
      summary: {
        totalProducts: 0,
        totalValue: 0,
        totalQuantity: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        overstockItems: 0,
      },
      movements: {
        today: { in: 0, out: 0, adjustments: 0 },
        week: { in: 0, out: 0, adjustments: 0 },
        month: { in: 0, out: 0, adjustments: 0 },
      },
      topProducts: [],
      recentMovements: [],
      stockLevels: {
        normal: 0,
        low: 0,
        out: 0,
        overstock: 0,
      },
    };

    const apiSummary = apiData.data.summary;
    const inventory = apiData.data.inventory || [];

    // Calculate total quantity from inventory
    const totalQuantity = inventory.reduce((sum: number, product: any) => sum + (product.stock || 0), 0);
    
    // Calculate stock levels
    const stockLevels = {
      normal: inventory.filter((p: any) => p.stockStatus === 'IN_STOCK').length,
      low: inventory.filter((p: any) => p.stockStatus === 'LOW_STOCK').length,
      out: inventory.filter((p: any) => p.stockStatus === 'OUT_OF_STOCK').length,
      overstock: inventory.filter((p: any) => p.stockStatus === 'OVERSTOCK').length,
    };

    // Extract recent movements from inventory logs
    const recentMovements = inventory.flatMap((product: any) => 
      (product.inventoryLogs || []).map((log: any) => ({
        ...log,
        product: {
          name: product.name,
          sku: product.sku
        }
      }))
    ).slice(0, 10).sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Mock top products data (would need separate API in real implementation)
    const topProducts = inventory.slice(0, 5).map((product: any) => ({
      name: product.name,
      sku: product.sku,
      movementCount: Math.floor(Math.random() * 50) + 1 // Mock data for now
    }));

    return {
      summary: {
        totalProducts: apiSummary?.totalProducts || 0,
        totalValue: apiSummary?.totalInventoryValue || 0,
        totalQuantity,
        lowStockItems: apiSummary?.lowStock || 0,
        outOfStockItems: apiSummary?.outOfStock || 0,
        overstockItems: apiSummary?.overstock || 0,
      },
      movements: {
        today: { in: 0, out: 0, adjustments: 0 }, // Would need separate endpoint
        week: { in: 0, out: 0, adjustments: 0 },
        month: { in: 0, out: 0, adjustments: 0 },
      },
      topProducts,
      recentMovements,
      stockLevels,
    };
  };

  const overview = transformData(data);

  // Calculate stock level percentages
  const totalStockItems = overview.stockLevels.normal + overview.stockLevels.low + 
                         overview.stockLevels.out + overview.stockLevels.overstock;
  
  const stockPercentages = {
    normal: totalStockItems > 0 ? (overview.stockLevels.normal / totalStockItems) * 100 : 0,
    low: totalStockItems > 0 ? (overview.stockLevels.low / totalStockItems) * 100 : 0,
    out: totalStockItems > 0 ? (overview.stockLevels.out / totalStockItems) * 100 : 0,
    overstock: totalStockItems > 0 ? (overview.stockLevels.overstock / totalStockItems) * 100 : 0,
  };

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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Overview</h3>
              <p className="text-red-600">{error.message || 'Failed to load inventory overview'}</p>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{overview.summary.totalProducts.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Active inventory items
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(overview.summary.totalValue)}</div>
                <p className="text-xs text-muted-foreground">
                  Current inventory value
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{overview.summary.totalQuantity.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Units in stock
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-600">{overview.summary.lowStockItems}</div>
                <p className="text-xs text-muted-foreground">
                  Need restocking
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock Status Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Stock Status Distribution
            </CardTitle>
            <CardDescription>
              Current stock levels across all products
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
                    <div className="text-sm font-bold text-green-600">
                      {overview.stockLevels.normal} ({stockPercentages.normal.toFixed(1)}%)
                    </div>
                  </div>
                  <Progress value={stockPercentages.normal} className="h-2" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">Low Stock</span>
                    </div>
                    <div className="text-sm font-bold text-orange-600">
                      {overview.stockLevels.low} ({stockPercentages.low.toFixed(1)}%)
                    </div>
                  </div>
                  <Progress value={stockPercentages.low} className="h-2" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">Out of Stock</span>
                    </div>
                    <div className="text-sm font-bold text-red-600">
                      {overview.stockLevels.out} ({stockPercentages.out.toFixed(1)}%)
                    </div>
                  </div>
                  <Progress value={stockPercentages.out} className="h-2" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Overstock</span>
                    </div>
                    <div className="text-sm font-bold text-blue-600">
                      {overview.stockLevels.overstock} ({stockPercentages.overstock.toFixed(1)}%)
                    </div>
                  </div>
                  <Progress value={stockPercentages.overstock} className="h-2" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Today's Movements
            </CardTitle>
            <CardDescription>
              Stock movements for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Stock In</span>
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    +{overview.movements.today.in}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">Stock Out</span>
                  </div>
                  <div className="text-lg font-bold text-red-600">
                    -{overview.movements.today.out}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Adjustments</span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {overview.movements.today.adjustments}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Movements and Top Products */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Stock Movements
            </CardTitle>
            <CardDescription>
              Latest inventory transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }, (_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      </TableRow>
                    ))
                  ) : overview.recentMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No recent movements
                      </TableCell>
                    </TableRow>
                  ) : (
                    overview.recentMovements.map((movement: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm">
                          {formatDate(movement.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{movement.product?.name}</div>
                          <div className="text-xs text-muted-foreground">{movement.product?.sku}</div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              movement.type === 'IN' ? 'default' :
                              movement.type === 'OUT' ? 'destructive' :
                              'secondary'
                            }
                            className="text-xs"
                          >
                            {movement.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={
                            movement.type === 'IN' ? 'text-green-600' :
                            movement.type === 'OUT' ? 'text-red-600' :
                            'text-blue-600'
                          }>
                            {movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : ''}
                            {movement.quantity}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Moving Products
            </CardTitle>
            <CardDescription>
              Products with highest movement today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))
              ) : overview.topProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No movement data available
                </div>
              ) : (
                overview.topProducts.map((product: any, index: number) => (
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
      </div>
    </div>
  );
}