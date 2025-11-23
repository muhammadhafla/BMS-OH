// Transaction Management Page - Main entry point
// Provides comprehensive transaction management with history, details, and analytics

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionHistory } from '@/components/transaction/TransactionHistory';
import { SalesDashboard } from '@/components/transaction/SalesDashboard';
import { TransactionAnalytics } from '@/components/transaction/TransactionAnalytics';
import { TransactionCreation } from '@/components/transaction/TransactionCreation';
import { TransactionDetails } from '@/components/transaction/TransactionDetails';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { TransactionFilters, Transaction } from '@/lib/types/transaction';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState('history');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    limit: 20,
  });

  const {
    transactions,
    stats,
    analytics,
    loading,
    pagination,
    getTransactionDetails,
    updateTransactionStatus,
    exportTransactions,
  } = useTransactions(filters);

  const handleFilterChange = (newFilters: Partial<TransactionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query, page: 1 }));
  };

  const handleViewDetails = async (transactionId: string) => {
    try {
      const transaction = await getTransactionDetails(transactionId);
      setSelectedTransaction(transaction);
    } catch (error) {
      console.error('Failed to fetch transaction details:', error);
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      await exportTransactions(format, filters);
    } catch (error) {
      console.error('Failed to export transactions:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction Management</h1>
          <p className="text-muted-foreground">
            Manage transactions, view sales analytics, and track performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={loading}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Transaction
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats?.totalTransactions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `$${stats?.totalRevenue?.toFixed(2) || '0.00'}`}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `$${stats?.avgTransactionValue?.toFixed(2) || '0.00'}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats?.totalQuantity || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="history">Transaction History</TabsTrigger>
          <TabsTrigger value="dashboard">Sales Dashboard</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="create">Create Transaction</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                View and manage all transactions with advanced filtering and search
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionHistory
                transactions={transactions}
                loading={loading}
                pagination={pagination}
                filters={filters}
                onFilterChange={handleFilterChange}
                onSearch={handleSearch}
                onViewDetails={handleViewDetails}
                onUpdateStatus={(id, status, notes) => updateTransactionStatus(id, status as "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED", notes)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Dashboard</CardTitle>
              <CardDescription>
                Real-time sales performance and key metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalesDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Analytics</CardTitle>
              <CardDescription>
                Detailed analytics and reporting for transaction insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionAnalytics
                analytics={analytics}
                loading={loading}
                onDateRangeChange={handleFilterChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Transaction</CardTitle>
              <CardDescription>
                Manually create a new transaction entry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionCreation
                onSuccess={() => {
                  setShowCreateForm(false);
                  // Refresh transactions list
                  setFilters(prev => ({ ...prev }));
                }}
                onCancel={() => setShowCreateForm(false)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetails
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onUpdateStatus={(id, status, notes) => updateTransactionStatus(id, status as "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED", notes)}
        />
      )}

      {/* Create Transaction Modal */}
      {showCreateForm && (
        <TransactionCreation
          onSuccess={() => {
            setShowCreateForm(false);
            setFilters(prev => ({ ...prev }));
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}