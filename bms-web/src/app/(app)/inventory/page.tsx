'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  FileText,
  Settings,
  Bell,
  Download,
  RefreshCw,
  Activity,
  DollarSign,
  History,
  Eye,
  Plus,
  X,
} from 'lucide-react';

import { InventoryOverview } from '@/components/inventory/InventoryOverview';
import { StockMovementLogs } from '@/components/inventory/StockMovementLogs';
import { StockAdjustmentForm } from '@/components/inventory/StockAdjustmentForm';
import { LowStockAlerts } from '@/components/inventory/LowStockAlerts';
import { InventoryAnalytics } from '@/components/inventory/InventoryAnalytics';
import { StockValuationReports } from '@/components/inventory/StockValuationReports';
import { InventoryAudit } from '@/components/inventory/InventoryAudit';
import { BatchLotTracking } from '@/components/inventory/BatchLotTracking';

export default function InventoryManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showRecentActivities, setShowRecentActivities] = useState(true);

  // Mock data for demonstration
  const inventoryStats = {
    totalProducts: 1247,
    totalValue: 2450000,
    lowStockItems: 23,
    outOfStockItems: 5,
    todaysMovements: 89,
    pendingAdjustments: 12,
  };

  const recentActivities = [
    {
      id: '1',
      type: 'IN',
      product: 'Kopi Arabica 250g',
      quantity: 50,
      user: 'John Doe',
      timestamp: '2025-11-10T08:15:00Z',
    },
    {
      id: '2',
      type: 'OUT',
      product: 'Teh Celup 100g',
      quantity: -25,
      user: 'Jane Smith',
      timestamp: '2025-11-10T08:10:00Z',
    },
    {
      id: '3',
      type: 'ADJUSTMENT',
      product: 'Gula Pasir 1kg',
      quantity: 5,
      user: 'Mike Johnson',
      timestamp: '2025-11-10T08:05:00Z',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'OUT':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'ADJUSTMENT':
        return <Settings className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('id-ID', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Comprehensive inventory tracking, stock management, and analytics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAdjustmentForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adjust Stock
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryStats.totalProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Active inventory items
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {inventoryStats.totalValue.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground">
              Inventory valuation
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{inventoryStats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Need restocking
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Movements</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryStats.todaysMovements}</div>
            <p className="text-xs text-muted-foreground">
              Stock transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Movements
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Adjustments
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts
            {inventoryStats.lowStockItems > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-xs">
                {inventoryStats.lowStockItems}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="valuation" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Valuation
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Batch/Lot
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <TabsContent value="overview" className="space-y-4">
          <InventoryOverview />
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <StockMovementLogs />
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Quick Stock Adjustment
                </CardTitle>
                <CardDescription>
                  Adjust stock levels for products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => setShowAdjustmentForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Adjustment
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Pending Adjustments</CardTitle>
                <CardDescription>
                  {inventoryStats.pendingAdjustments} adjustments awaiting approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from({ length: Math.min(3, inventoryStats.pendingAdjustments) }, (_, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">Product Name</div>
                        <div className="text-sm text-muted-foreground">Requested by User</div>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <LowStockAlerts />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <InventoryAnalytics />
        </TabsContent>

        <TabsContent value="valuation" className="space-y-4">
          <StockValuationReports />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <InventoryAudit />
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <BatchLotTracking />
        </TabsContent>
      </Tabs>

      {/* Recent Activities Sidebar */}
      {showRecentActivities && (
        <Card className="fixed right-6 top-6 w-80 hidden xl:block z-10">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activities
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecentActivities(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-2 rounded-lg border">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {activity.product}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {activity.quantity > 0 ? '+' : ''}{activity.quantity} by {activity.user}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimestamp(activity.timestamp)}
                    </div>
                  </div>
                  <Badge 
                    variant={
                      activity.type === 'IN' ? 'default' :
                      activity.type === 'OUT' ? 'destructive' :
                      'secondary'
                    }
                    className="text-xs"
                  >
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Toggle Recent Activities Button */}
      {!showRecentActivities && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRecentActivities(true)}
          className="fixed right-6 top-6 z-10 hidden xl:flex"
        >
          <Activity className="h-4 w-4 mr-2" />
          Recent Activities
        </Button>
      )}

      {/* Stock Adjustment Form Modal */}
      {showAdjustmentForm && (
        <StockAdjustmentForm
          open={showAdjustmentForm}
          onOpenChange={setShowAdjustmentForm}
          product={selectedProduct}
          onSuccess={() => {
            setShowAdjustmentForm(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}