// Sales Dashboard Component
// Provides real-time sales performance and key metrics visualization

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiService } from '@/services/api';
import { TransactionStats, TransactionStatsResponse, TransactionListResponse } from '@/types/api-responses';
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
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  CreditCard,
  Calendar,
  Loader2
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ExtendedTransactionStats extends TransactionStats {
  totalQuantity: number;
}

interface DailySalesData {
  date: string;
  revenue: number;
  transactions: number;
  items: number;
}

interface PaymentMethodData {
  method: string;
  count: number;
  total: number;
}

interface TopProductData {
  name: string;
  sales: number;
  revenue: number;
}

export function SalesDashboard() {
  const [stats, setStats] = useState<ExtendedTransactionStats | undefined>();
  const [dailySales, setDailySales] = useState<DailySalesData[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load transaction stats and transactions together
        const [statsResponse, transactionsResponse] = await Promise.all([
          apiService.getTransactionStats(),
          apiService.getTransactions({
            limit: 100,
            sort: 'createdAt',
            order: 'desc'
          })
        ]);
        
        // Calculate total quantity from transactions
        const totalQuantity = transactionsResponse.data?.items.reduce((total, transaction) => 
          total + transaction.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0), 0
        ) || 0;

        // Update stats with calculated total quantity
        if (statsResponse.success && statsResponse.data) {
          setStats({
            ...statsResponse.data,
            totalQuantity
          } as ExtendedTransactionStats);
        }
        
        // Process daily sales data
        const processedDailySales = processDailySales(transactionsResponse.data?.items || []);
        setDailySales(processedDailySales);

        // Process payment methods
        const processedPaymentMethods = processPaymentMethods(transactionsResponse.data?.items || []);
        setPaymentMethods(processedPaymentMethods);

        // Process top products
        const processedTopProducts = processTopProducts(transactionsResponse.data?.items || []);
        setTopProducts(processedTopProducts);

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Process daily sales data from transactions
  const processDailySales = (transactions: any[]): DailySalesData[] => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayTransactions = transactions.filter(t =>
        new Date(t.createdAt).toISOString().split('T')[0] === date
      );
      
      const revenue = dayTransactions.reduce((sum, t) => sum + parseFloat(t.finalAmount), 0);
      const items = dayTransactions.reduce((sum, t) =>
        sum + (t.items?.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0) || 0), 0
      );

      return {
        date,
        revenue,
        transactions: dayTransactions.length,
        items
      };
    });
  };

  // Process payment methods from transactions
  const processPaymentMethods = (transactions: any[]): PaymentMethodData[] => {
    const methodCounts: { [key: string]: { count: number; total: number } } = {};
    
    transactions.forEach(t => {
      const method = t.paymentMethod || 'UNKNOWN';
      if (!methodCounts[method]) {
        methodCounts[method] = { count: 0, total: 0 };
      }
      methodCounts[method].count++;
      methodCounts[method].total += parseFloat(t.finalAmount);
    });

    return Object.entries(methodCounts).map(([method, data]) => ({
      method,
      count: data.count,
      total: data.total
    }));
  };

  // Process top products from transaction items
  const processTopProducts = (transactions: any[]): TopProductData[] => {
    const productStats: { [key: string]: { name: string; sales: number; revenue: number } } = {};
    
    transactions.forEach(t => {
      (t.items || []).forEach((item: any) => {
        const productId = item.productId;
        if (!productStats[productId]) {
          productStats[productId] = {
            name: item.product?.name || `Product ${productId.slice(0, 8)}`,
            sales: 0,
            revenue: 0
          };
        }
        productStats[productId].sales += item.quantity;
        productStats[productId].revenue += parseFloat(item.total);
      });
    });

    return Object.values(productStats)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Memuat data dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalRevenue || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              <span className="text-green-500">+12.5%</span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalTransactions || 0}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              <span className="text-green-500">+8.2%</span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.averageTransactionValue || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
              <span className="text-red-500">-2.1%</span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalQuantity || 0}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              <span className="text-green-500">+15.3%</span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales</CardTitle>
            <CardDescription>
              Revenue and transaction count over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Revenue' : name === 'transactions' ? 'Transactions' : 'Items'
                  ]}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID')}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Line
                  type="monotone"
                  dataKey="transactions"
                  stroke="#82ca9d"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              Distribution of payment methods used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentMethods}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, name: string) => [
                  name === 'count' ? value : formatCurrency(value),
                  name === 'count' ? 'Count' : 'Total'
                ]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>
              Best performing products by sales volume
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.length > 0 ? topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {product.sales} units sold
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(product.revenue)}</div>
                    <div className="text-sm text-muted-foreground">
                      {topProducts.length > 0 ? ((product.revenue / topProducts.reduce((sum, p) => sum + p.revenue, 0)) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center text-muted-foreground py-8">
                  Tidak ada data produk
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>
              Key performance indicators this month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Revenue Target</span>
                <span className="text-sm text-muted-foreground">85%</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Transaction Goal</span>
                <span className="text-sm text-muted-foreground">92%</span>
              </div>
              <Progress value={92} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Customer Satisfaction</span>
                <span className="text-sm text-muted-foreground">96%</span>
              </div>
              <Progress value={96} className="h-2" />
            </div>

            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">156</div>
                  <div className="text-xs text-muted-foreground">New Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">2.8</div>
                  <div className="text-xs text-muted-foreground">Avg Items/Txn</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
          <CardDescription>
            Revenue and transaction trends over the last 6 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('id-ID', { month: 'short' })}
              />
              <YAxis yAxisId="left" tickFormatter={(value) => formatCurrency(value)} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                formatter={(value: any, name: string) => [
                  name === 'revenue' ? formatCurrency(value) : value,
                  name === 'revenue' ? 'Revenue' : 'Transactions'
                ]}
                labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID')}
              />
              <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="transactions"
                stroke="#82ca9d"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
