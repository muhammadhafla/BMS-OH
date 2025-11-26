'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Download,
  Calendar,
  FileText,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  RefreshCw
  
} from 'lucide-react';
import { apiService } from '@/services/api';
import { ApiResponse } from '@/types/api-responses';
import { toast } from 'sonner';

interface ReportData {
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    uniqueCustomers: number;
    totalProducts: number;
    avgOrderValue: number;
    salesGrowth: number;
  };
  analytics: {
    topProducts: Array<{
      product: { name: string; sku: string };
      _sum: { quantity: number; total: number };
      category: string;
    }>;
    revenueByMonth: Array<{
      month: string;
      revenue: number;
      transactions: number;
    }>;
    paymentMethods: Array<{
      method: string;
      count: number;
      total: number;
    }>;
    branchPerformance: Array<{
      id: string;
      name: string;
      _count: { transactions: number };
      totalRevenue: { _sum: { finalAmount: number } };
    }>;
  };
}

const Reports: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [branchId, setBranchId] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Load initial data
  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const response = await apiService.get<ApiResponse<ReportData>>(`/api/reports/analytics?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${branchId ? `&branchId=${branchId}` : ''}`);
      if (response.success && response.data) {
        setReportData(response.data);
      } else {
        toast.error('Failed to load report data');
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (type: 'last7' | 'last30' | 'last90' | 'custom', customStart?: string, customEnd?: string) => {
    const now = new Date();
    let start: Date;

    switch (type) {
      case 'last7':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last90':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(customStart || now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: (customEnd ? new Date(customEnd) : now).toISOString().split('T')[0]
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const exportReport = async (format: 'pdf' | 'excel') => {
    try {
      // This would implement actual export functionality
      toast.info(`${format.toUpperCase()} export will be available soon`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  if (loading && !reportData) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Business Intelligence Reports</h2>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights for your business
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportReport('pdf')}
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportReport('excel')}
            disabled={loading}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Date Range Quick Select */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDateRangeChange('last7')}
              >
                Last 7 Days
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDateRangeChange('last30')}
              >
                Last 30 Days
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDateRangeChange('last90')}
              >
                Last 90 Days
              </Button>
            </div>

            {/* Custom Date Range */}
            <div className="flex items-center gap-2">
              <div>
                <label className="text-sm font-medium">From</label>
                <input
                  type="date"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">To</label>
                <input
                  type="date"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Branch Filter */}
            <div className="min-w-[200px]">
              <label className="text-sm font-medium">Branch</label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Branches</SelectItem>
                  <SelectItem value="branch-1">Main Branch</SelectItem>
                  <SelectItem value="branch-2">Branch 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={loadReportData} disabled={loading}>
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales Analytics</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {reportData && (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(reportData.summary.totalRevenue)}
                    </div>
                    <p className={`text-xs ${getGrowthColor(reportData.summary.salesGrowth)}`}>
                      <TrendingUp className="h-3 w-3 inline mr-1" />
                      {formatPercentage(reportData.summary.salesGrowth)} from last period
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reportData.summary.totalTransactions}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Avg: {formatCurrency(reportData.summary.avgOrderValue)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Customers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reportData.summary.uniqueCustomers}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Active customers
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Products</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reportData.summary.totalProducts}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      In inventory
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Products</CardTitle>
                  <CardDescription>
                    Best performing products by revenue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.analytics.topProducts.slice(0, 10).map((product, index) => (
                      <div key={product.product.sku} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{product.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product._sum.quantity} units sold • {product.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(product._sum.total)}
                          </p>
                          <p className="text-sm text-muted-foreground">revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method Performance</CardTitle>
                  <CardDescription>
                    Revenue breakdown by payment method
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reportData.analytics.paymentMethods.map((method) => (
                      <div key={method.method} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-primary"></div>
                          <span className="font-medium">{method.method.replace('_', ' ')}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(method.total)}</p>
                          <p className="text-sm text-muted-foreground">{method.count} transactions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Performance</CardTitle>
              <CardDescription>
                Detailed sales analysis and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>Sales analytics dashboard</p>
                  <p className="text-sm">Interactive charts coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Analytics</CardTitle>
              <CardDescription>
                Stock levels and inventory insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto mb-4" />
                  <p>Inventory insights dashboard</p>
                  <p className="text-sm">Stock analysis and alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Analytics</CardTitle>
              <CardDescription>
                Customer behavior and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  <p>Customer insights dashboard</p>
                  <p className="text-sm">Segmentation and behavior analysis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>
                P&L statements and financial analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                  <p>Financial analytics dashboard</p>
                  <p className="text-sm">P&L statements and financial metrics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;