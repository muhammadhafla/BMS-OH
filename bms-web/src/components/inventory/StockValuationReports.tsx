'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/dialog';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw,
  AlertCircle,
  Package,
  Target,
  Filter,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { apiService } from '@/services/api';

export function StockValuationReports() {
  const [dateRange, setDateRange] = useState('30'); // days
  const [valuationMethod, setValuationMethod] = useState('AVERAGE');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [branchFilter] = useState('ALL');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'value' | 'quantity' | 'name'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch valuation reports data
  const { data, error, isLoading, mutate } = useSWR(
    ['/api/inventory/valuation', dateRange, valuationMethod, categoryFilter, branchFilter],
    () => apiService.getStockValuationReport({
      dateRange: parseInt(dateRange),
      method: valuationMethod,
      categoryId: categoryFilter === 'ALL' ? undefined : categoryFilter,
      branchId: branchFilter === 'ALL' ? undefined : branchFilter,
    }),
    {
      refreshInterval: 300000, // 5 minutes
    }
  );

  const valuationData = (data as any)?.data || {
    summary: {
      totalValue: 0,
      totalQuantity: 0,
      totalProducts: 0,
      averageValue: 0,
    },
    byCategory: [],
    byMethod: {
      FIFO: 0,
      LIFO: 0,
      AVERAGE: 0,
      STANDARD: 0,
    },
    byBranch: [],
    trends: [],
    topValuedItems: [],
    lowValuedItems: [],
    expiringItems: [],
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  // Export functionality
  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await apiService.exportStockValuation({
        dateRange: parseInt(dateRange),
        method: valuationMethod,
        format,
        categoryId: categoryFilter === 'ALL' ? undefined : categoryFilter,
        branchId: branchFilter === 'ALL' ? undefined : branchFilter,
      });
      
      if (format === 'csv') {
        const blob = new Blob([(response as any).data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-valuation-${new Date().toISOString()}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Handle sorting
  const sortedCategories = [...valuationData.byCategory].sort((a, b) => {
    let aValue, bValue;
    switch (sortBy) {
      case 'value':
        aValue = a.totalValue;
        bValue = b.totalValue;
        break;
      case 'quantity':
        aValue = a.totalQuantity;
        bValue = b.totalQuantity;
        break;
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSort = (column: 'value' | 'quantity' | 'name') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Stock Valuation Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Reports</h3>
              <p className="text-red-600">{error.message || 'Failed to load valuation reports'}</p>
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
                <DollarSign className="h-5 w-5" />
                Stock Valuation Reports
              </CardTitle>
              <CardDescription>
                Comprehensive inventory valuation analysis and reporting
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
              
              <Select value={valuationMethod} onValueChange={setValuationMethod}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Valuation Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVERAGE">Average Cost</SelectItem>
                  <SelectItem value="FIFO">FIFO</SelectItem>
                  <SelectItem value="LIFO">LIFO</SelectItem>
                  <SelectItem value="STANDARD">Standard Cost</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <div className="text-2xl font-bold">{formatCurrency(valuationData.summary.totalValue)}</div>
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
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{valuationData.summary.totalQuantity.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Units in stock
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{valuationData.summary.totalProducts}</div>
                <p className="text-xs text-muted-foreground">
                  Active products
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(valuationData.summary.averageValue)}</div>
                <p className="text-xs text-muted-foreground">
                  Per unit average
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Valuation Methods Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Valuation Methods Comparison
          </CardTitle>
          <CardDescription>
            Different valuation methods and their calculated values
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="space-y-4">
              {Object.entries(valuationData.byMethod).map(([method, value]) => {
                const percentage = valuationData.summary.totalValue > 0 
                  ? ((value as number) / valuationData.summary.totalValue) * 100 
                  : 0;
                return (
                  <div key={method} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{method}</span>
                      <div className="text-right">
                        <div className="text-sm font-bold">{formatCurrency(value as number)}</div>
                        <div className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Category Valuation Breakdown
              </CardTitle>
              <CardDescription>
                Inventory value by product category
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="food">Food & Beverage</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="books">Books</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Avg Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : sortedCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No valuation data available
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Category
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('quantity')}
                    >
                      <div className="flex items-center gap-2">
                        Quantity
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('value')}
                    >
                      <div className="flex items-center gap-2">
                        Total Value
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Average Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCategories.map((category: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-xs text-muted-foreground">{category.code}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">{category.productCount}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">{category.totalQuantity.toLocaleString()}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-green-600">
                          {formatCurrency(category.totalValue)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          {formatCurrency(category.averageValue)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedCategory(category.name);
                            setShowDetails(true);
                          }}
                        >
                          <Search className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top and Bottom Valued Items */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Highest Valued Items
            </CardTitle>
            <CardDescription>
              Top 10 products by total value
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))
              ) : valuationData.topValuedItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No high-value items found
                </div>
              ) : (
                valuationData.topValuedItems.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">{formatCurrency(item.totalValue)}</div>
                      <div className="text-xs text-muted-foreground">{item.quantity} units</div>
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
              <TrendingDown className="h-5 w-5 text-red-600" />
              Lowest Valued Items
            </CardTitle>
            <CardDescription>
              Products with lowest total value
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))
              ) : valuationData.lowValuedItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No low-value items found
                </div>
              ) : (
                valuationData.lowValuedItems.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">{formatCurrency(item.totalValue)}</div>
                      <div className="text-xs text-muted-foreground">{item.quantity} units</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedCategory} - Detailed Valuation
            </DialogTitle>
            <DialogDescription>
              Comprehensive breakdown of {selectedCategory} inventory valuation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* This would contain detailed breakdown of the selected category */}
            <div className="text-center py-8 text-muted-foreground">
              Detailed category breakdown will be implemented here
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}