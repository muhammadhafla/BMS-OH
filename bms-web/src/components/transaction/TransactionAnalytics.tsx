// Transaction Analytics Component
// Provides detailed analytics and reporting for transaction insights

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedTransactionAnalytics } from '@/types/unified';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Line,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts';
import {
  TrendingUp,
  Filter,
  BarChart3,
  LineChart as LineChartIcon,
  DollarSign
} from 'lucide-react';

interface TransactionAnalyticsProps {
  analytics: UnifiedTransactionAnalytics | undefined;
  loading: boolean;
  onDateRangeChange: (filters: any) => void;
}

export function TransactionAnalytics({ analytics, loading, onDateRangeChange }: TransactionAnalyticsProps) {
  const [dateRange, setDateRange] = useState({
    startDate: '2025-11-01',
    endDate: '2025-11-30',
  });
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  // Sample analytics data (replace with real data)
  const sampleAnalytics: UnifiedTransactionAnalytics = {
    dailySales: [
      { date: '2025-11-01', revenue: 1500000, transactions: 45, items: 89 },
      { date: '2025-11-02', revenue: 2300000, transactions: 67, items: 134 },
      { date: '2025-11-03', revenue: 1800000, transactions: 52, items: 98 },
      { date: '2025-11-04', revenue: 2100000, transactions: 58, items: 116 },
      { date: '2025-11-05', revenue: 2800000, transactions: 78, items: 156 },
      { date: '2025-11-06', revenue: 3200000, transactions: 92, items: 184 },
      { date: '2025-11-07', revenue: 2900000, transactions: 85, items: 170 },
    ],
    paymentMethods: [
      { method: 'CASH', count: 234, total: 45600000 },
      { method: 'DEBIT_CARD', count: 156, total: 28900000 },
      { method: 'CREDIT_CARD', count: 89, total: 18700000 },
      { method: 'QRIS', count: 123, total: 22100000 },
    ],
    branchPerformance: [
      { branchId: '1', branchName: 'Main Branch', revenue: 85000000, transactions: 340 },
      { branchId: '2', branchName: 'North Branch', revenue: 65000000, transactions: 280 },
      { branchId: '3', branchName: 'South Branch', revenue: 75000000, transactions: 310 },
    ],
    monthlyTrends: [
      { month: '2025-06', revenue: 125000000, transactions: 890, growth: 12.5 },
      { month: '2025-07', revenue: 132000000, transactions: 920, growth: 5.6 },
      { month: '2025-08', revenue: 128000000, transactions: 890, growth: -3.0 },
      { month: '2025-09', revenue: 145000000, transactions: 1020, growth: 13.3 },
      { month: '2025-10', revenue: 152000000, transactions: 1080, growth: 4.8 },
      { month: '2025-11', revenue: 225000000, transactions: 1600, growth: 48.0 },
    ],
    productPerformance: [],
    categoryPerformance: [],
    comparisons: {
      today: { sales: 0, transactions: 0, customers: 0 },
      yesterday: { sales: 0, transactions: 0, customers: 0 },
      thisWeek: { sales: 0, transactions: 0, customers: 0 },
      lastWeek: { sales: 0, transactions: 0, customers: 0 },
    }
  };

  const data = analytics || sampleAnalytics;

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Period options
  const periodOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' },
  ];

  // Handle date range change
  const handleDateRangeChange = () => {
    onDateRangeChange({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  };

  // Handle period change
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }
    
    setDateRange({
      startDate: startDate.toISOString().split('T')[0] || '',
      endDate: endDate.toISOString().split('T')[0] || '',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 bg-gray-200 rounded animate-pulse mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Controls</CardTitle>
          <CardDescription>
            Configure date range and view settings for analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label>Quick Select</Label>
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            
            <div className="flex-1">
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={handleDateRangeChange}>
                <Filter className="w-4 h-4 mr-2" />
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.dailySales.reduce((sum, day) => sum + day.revenue, 0))}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              <span className="text-green-500">+15.3%</span>
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.dailySales.reduce((sum, day) => sum + day.transactions, 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              <span className="text-green-500">+8.7%</span>
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <LineChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                data.dailySales.reduce((sum, day) => sum + day.revenue, 0) /
                data.dailySales.reduce((sum, day) => sum + day.transactions, 0)
              )}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              <span className="text-green-500">+6.1%</span>
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              +{(data.monthlyTrends[data.monthlyTrends.length - 1]?.growth || 0).toFixed(1)}%
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="text-green-500">Improving</span>
              <span className="ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="payment">Payment Analysis</TabsTrigger>
          <TabsTrigger value="branch">Branch Performance</TabsTrigger>
          <TabsTrigger value="trends">Growth Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue Trend</CardTitle>
                <CardDescription>
                  Revenue and transaction count over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={data.dailySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis yAxisId="left" tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        name === 'revenue' ? formatCurrency(value) : value,
                        name === 'revenue' ? 'Revenue' : 'Transactions'
                      ]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="transactions" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>
                  Daily revenue breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.dailySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Payment Method Distribution</CardTitle>
                <CardDescription>
                  Breakdown by payment method
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.paymentMethods}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.paymentMethods.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [value, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method Performance</CardTitle>
                <CardDescription>
                  Revenue by payment method
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.paymentMethods.map((method, index) => (
                    <div key={method.method} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{method.method}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(method.total)}</div>
                        <div className="text-sm text-muted-foreground">
                          {method.count} transactions
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="branch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Branch Performance</CardTitle>
              <CardDescription>
                Revenue and transaction count by branch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.branchPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="branchName" />
                  <YAxis yAxisId="left" tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'revenue' ? formatCurrency(value) : value,
                      name === 'revenue' ? 'Revenue' : 'Transactions'
                    ]}
                  />
                  <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" />
                  <Bar yAxisId="right" dataKey="transactions" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {data.branchPerformance.map((branch, _index) => (
              <Card key={branch.branchId}>
                <CardHeader>
                  <CardTitle className="text-lg">{branch.branchName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Revenue</span>
                    <span className="font-medium">{formatCurrency(branch.revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Transactions</span>
                    <span className="font-medium">{branch.transactions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg per Transaction</span>
                    <span className="font-medium">
                      {formatCurrency(branch.revenue / branch.transactions)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Growth Trends</CardTitle>
              <CardDescription>
                Revenue and growth rate over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={data.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={(value) => new Date(value + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                  />
                  <YAxis yAxisId="left" tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'revenue' ? formatCurrency(value) : `${value}%`,
                      name === 'revenue' ? 'Revenue' : 'Growth Rate'
                    ]}
                    labelFormatter={(label) => new Date(label + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  />
                  <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="growth" 
                    stroke="#ff7300" 
                    strokeWidth={3}
                    dot={{ fill: '#ff7300', strokeWidth: 2, r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}