'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  DollarSign,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { apiService } from '@/services/api';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, description, icon, trend, isLoading }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      ) : (
        <>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend && (
            <div className={`flex items-center text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="h-3 w-3 mr-1" />
              {trend.value}
            </div>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalRevenue: '0',
    totalProducts: 0,
    totalUsers: 0,
    lowStockItems: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<Array<{
    id: number;
    type: string;
    message: string;
    timestamp: string;
    status: string;
  }>>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);

        // Load transaction stats - now returns properly typed response
        const transactionStats = await apiService.getTransactionStats();
        const userStats = await apiService.getUserStats();
        const inventoryData = await apiService.getLowStockProducts();

        setStats({
          totalRevenue: `Rp ${transactionStats.data.totalRevenue.toLocaleString()}`,
          totalProducts: transactionStats.data.totalTransactions,
          totalUsers: userStats.data.totalUsers,
          lowStockItems: inventoryData.data.length || 0,
        });

        // Mock recent activities - in real app, this would come from API
        setRecentActivities([
          {
            id: 1,
            type: 'transaction',
            message: 'Transaksi baru dari Branch A - Rp 850.000',
            timestamp: '2 menit lalu',
            status: 'success'
          },
          {
            id: 2,
            type: 'inventory',
            message: 'Stok produk "Laptop ASUS" hampir habis (3 unit)',
            timestamp: '15 menit lalu',
            status: 'warning'
          },
          {
            id: 3,
            type: 'user',
            message: 'User baru terdaftar: John Doe',
            timestamp: '1 jam lalu',
            status: 'info'
          },
          {
            id: 4,
            type: 'purchase',
            message: 'Pembelian dari supplier PT ABC sebesar Rp 2.500.000',
            timestamp: '2 jam lalu',
            status: 'success'
          }
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const quickActions = [
    {
      title: 'Tambah Transaksi',
      description: 'Buat transaksi penjualan baru',
      href: '/transactions/new',
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: 'Kelola Inventaris',
      description: 'Lihat dan kelola stok produk',
      href: '/inventory',
      icon: <Package className="h-4 w-4" />,
    },
    {
      title: 'Catat Pembelian',
      description: 'Rekam pembelian barang baru',
      href: '/purchase-orders/new',
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      title: 'Lihat Laporan',
      description: 'Akses laporan bisnis lengkap',
      href: '/reports',
      icon: <Users className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Selamat datang kembali! Berikut adalah gambaran umum bisnis Anda.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Online
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Pendapatan"
          value={stats.totalRevenue}
          description="dari semua transaksi"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          trend={{ value: "+12.5%", isPositive: true }}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Produk"
          value={stats.totalProducts.toString()}
          description="produk aktif"
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Pengguna"
          value={stats.totalUsers.toString()}
          description="pengguna aktif"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          trend={{ value: "+2.4%", isPositive: true }}
          isLoading={isLoading}
        />
        <StatCard
          title="Stok Menipis"
          value={stats.lowStockItems.toString()}
          description="perlu restock"
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Quick Actions */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
            <CardDescription>
              Akses fitur-fitur yang paling sering digunakan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {quickActions.map((action) => (
                <div key={action.href} className="flex items-center space-x-4 rounded-md border p-4 hover:bg-muted/50">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    {action.icon}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={action.href}>
                      Buka <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
            <CardDescription>
              Update terbaru dari sistem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`mt-1 h-2 w-2 rounded-full ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'warning' ? 'bg-yellow-500' :
                    activity.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{activity.message}</p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {activity.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;