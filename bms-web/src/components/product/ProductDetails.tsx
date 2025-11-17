'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  Hash,
  DollarSign,
  Tag,
  Building2,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Edit3,
  QrCode
} from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  barcode: string;
  category: {
    id: string;
    name: string;
  } | null;
  branch: {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductDetailsProps {
  product: Product;
  onEdit: () => void;
}

export function ProductDetails({ product, onEdit }: ProductDetailsProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate metrics
  const profitMargin = product.cost > 0 ? ((product.price - product.cost) / product.cost) * 100 : 0;
  const stockUtilization = product.maxStock > 0 ? (product.stock / product.maxStock) * 100 : 0;

  // Get status indicators
  const getStockStatus = () => {
    if (product.stock <= 0) {
      return { color: 'destructive', text: 'Out of Stock', icon: AlertCircle };
    } else if (product.stock <= product.minStock) {
      return { color: 'secondary', text: 'Low Stock', icon: AlertCircle };
    } else if (product.stock >= product.maxStock) {
      return { color: 'default', text: 'Overstock', icon: TrendingUp };
    } else {
      return { color: 'default', text: 'Normal', icon: CheckCircle };
    }
  };

  const stockStatus = getStockStatus();
  const StatusIcon = stockStatus.icon;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product.stock} {product.unit}</div>
            <p className="text-xs text-muted-foreground">
              Min: {product.minStock} • Max: {product.maxStock}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selling Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(product.price)}</div>
            <p className="text-xs text-muted-foreground">
              Cost: {formatCurrency(product.cost)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profitMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(product.price - product.cost)} per unit
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Status</CardTitle>
            <StatusIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={stockStatus.color as any} className="mb-2">
              {stockStatus.text}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {stockUtilization.toFixed(1)}% of max stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Product Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">SKU</label>
                <div className="flex items-center gap-2 mt-1">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {product.sku}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={product.isActive ? 'default' : 'secondary'}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Product Name</label>
              <p className="text-sm font-semibold mt-1">{product.name}</p>
            </div>

            {product.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm mt-1 text-muted-foreground">{product.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <div className="flex items-center gap-2 mt-1">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span>{product.category?.name || 'No Category'}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Unit</label>
                <div className="flex items-center gap-2 mt-1">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span>{product.unit}</span>
                </div>
              </div>
            </div>

            {product.barcode && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Barcode</label>
                <div className="flex items-center gap-2 mt-1">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{product.barcode}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing & Inventory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing & Inventory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cost Price</label>
                <p className="text-lg font-semibold mt-1 text-red-600">
                  {formatCurrency(product.cost)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Selling Price</label>
                <p className="text-lg font-semibold mt-1 text-green-600">
                  {formatCurrency(product.price)}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Current Stock Level</label>
              <div className="mt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>{product.stock} {product.unit}</span>
                  <span className="text-muted-foreground">
                    {product.minStock} - {product.maxStock} {product.unit}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      product.stock <= 0 ? 'bg-red-500' :
                      product.stock <= product.minStock ? 'bg-yellow-500' :
                      product.stock >= product.maxStock ? 'bg-blue-500' :
                      'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min((product.stock / product.maxStock) * 100, 100)}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Stock utilization: {stockUtilization.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Minimum Stock</label>
                <p className="text-sm font-semibold mt-1">{product.minStock} {product.unit}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Maximum Stock</label>
                <p className="text-sm font-semibold mt-1">{product.maxStock} {product.unit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch & Timestamps */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Branch Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Current Branch</label>
              <p className="text-sm font-semibold mt-1">{product.branch.name}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timestamps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm mt-1">{formatDate(product.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="text-sm mt-1">{formatDate(product.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button onClick={onEdit} className="flex items-center gap-2">
          <Edit3 className="h-4 w-4" />
          Edit Product
        </Button>
      </div>
    </div>
  );
}