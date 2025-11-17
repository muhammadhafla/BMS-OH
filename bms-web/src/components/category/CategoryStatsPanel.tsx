'use client';

import React from 'react';
import useSWR from 'swr';
import { CategoryStats } from '@/types/category';
import { apiService } from '@/services/api';
import { CategoryStatsResponse } from '@/types/api-responses';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Package, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Folder
} from 'lucide-react';

interface CategoryStatsPanelProps {
  categoryId: string;
  categoryName: string;
}

// SWR fetcher
const fetcher = (url: string) => apiService.get(url);

export function CategoryStatsPanel({ categoryId, categoryName }: CategoryStatsPanelProps) {
  const { data: statsData, error: statsError, isLoading: statsLoading } = useSWR(
    `/api/categories/${categoryId}/stats`,
    fetcher
  ) as { data?: any; error?: any; isLoading?: boolean };

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-20 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (statsError || !statsData?.data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Failed to load category statistics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = (statsData as CategoryStatsResponse).data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Category Statistics
          </CardTitle>
          <CardDescription>
            Analytics and insights for "{categoryName}"
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Direct Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.directProductsCount}</div>
            <p className="text-xs text-muted-foreground">
              Products in this category
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProductsCount}</div>
            <p className="text-xs text-muted-foreground">
              Including subcategories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStock.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Units in stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Direct Products</span>
                <span className="text-sm font-medium">
                  {stats.directProductsCount} ({((stats.directProductsCount / Math.max(stats.totalProductsCount, 1)) * 100).toFixed(1)}%)
                </span>
              </div>
              <Progress 
                value={(stats.directProductsCount / Math.max(stats.totalProductsCount, 1)) * 100} 
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Subcategory Products</span>
                <span className="text-sm font-medium">
                  {stats.totalProductsCount - stats.directProductsCount} ({(((stats.totalProductsCount - stats.directProductsCount) / Math.max(stats.totalProductsCount, 1)) * 100).toFixed(1)}%)
                </span>
              </div>
              <Progress 
                value={((stats.totalProductsCount - stats.directProductsCount) / Math.max(stats.totalProductsCount, 1)) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Category Hierarchy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Hierarchy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Subcategories</span>
                <Badge variant="outline">{stats.descendantCategoriesCount}</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Hierarchy Depth</span>
                <Badge variant={stats.descendantCategoriesCount > 0 ? "default" : "secondary"}>
                  {stats.descendantCategoriesCount > 0 ? "2-3 levels" : "1 level"}
                </Badge>
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {stats.descendantCategoriesCount > 0 
                  ? "This category has subcategories and products across multiple levels."
                  : "This is a top-level category with direct products only."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory Health</CardTitle>
          <CardDescription>
            Overview of stock levels and potential issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stock Status */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.totalProductsCount - stats.lowStockCount}
              </div>
              <p className="text-sm text-muted-foreground">Well Stocked</p>
              <p className="text-xs text-muted-foreground">
                {((stats.totalProductsCount - stats.lowStockCount) / Math.max(stats.totalProductsCount, 1) * 100).toFixed(1)}% of products
              </p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.lowStockCount}
              </div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="text-xs text-muted-foreground">
                {(stats.lowStockCount / Math.max(stats.totalProductsCount, 1) * 100).toFixed(1)}% of products
              </p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold">
                {stats.totalStock.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Total Units</p>
              <p className="text-xs text-muted-foreground">
                Average {(stats.totalStock / Math.max(stats.totalProductsCount, 1)).toFixed(1)} per product
              </p>
            </div>
          </div>

          {/* Health Indicator */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Inventory Health Score</span>
              <div className="flex items-center gap-2">
                {stats.lowStockCount === 0 ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Excellent
                  </Badge>
                ) : stats.lowStockCount < stats.totalProductsCount * 0.2 ? (
                  <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Good
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Needs Attention
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.lowStockCount === 0 
                ? "All products have adequate stock levels."
                : `${stats.lowStockCount} products are below minimum stock levels.`
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}