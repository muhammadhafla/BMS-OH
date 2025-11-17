'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { apiService } from '@/services/api';
import type { StockAdjustmentStats } from '@/types/stock-adjustment';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  TrendingDown,
  Hash,
  FileText,
  Download,
  Calendar,
  AlertCircle,
  PieChart,
  Activity,
} from 'lucide-react';

interface StockAdjustmentReportsProps {
  branchId?: string;
}

export function StockAdjustmentReports({ branchId }: StockAdjustmentReportsProps) {
  const [dateRange, setDateRange] = useState('30'); // days
  const [reportType, setReportType] = useState('summary');

  // Calculate date range
  const getDateRange = () => {
    const to = new Date().toISOString();
    const from = new Date();
    from.setDate(from.getDate() - parseInt(dateRange));
    return { from: from.toISOString(), to };
  };

  // Fetch stats
  const { data, error, isLoading } = useSWR(
    ['/api/inventory/adjustments/stats', branchId, dateRange],
    () => apiService.getStockAdjustmentStats({
      branchId,
      ...getDateRange(),
    })
  );

  const stats: StockAdjustmentStats = (data as any)?.data || {
    totalAdjustments: 0,
    pendingApprovals: 0,
    approvedAdjustments: 0,
    rejectedAdjustments: 0,
    totalStockIn: 0,
    totalStockOut: 0,
    netStockChange: 0,
    byType: { INCREMENT: 0, DECREMENT: 0, SET_TO: 0 },
    byReason: {},
    byBranch: {},
    byUser: {},
  };

  // Export report
  const handleExportReport = async () => {
    try {
      const response = await apiService.getStockAdjustmentReport({
        branchId,
        ...getDateRange(),
      });
      // Handle CSV download
      const blob = new Blob([(response as any).data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-adjustment-report-${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Get top reasons
  const topReasons = Object.entries(stats.byReason || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Get top users
  const topUsers = Object.entries(stats.byUser || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Stock Adjustment Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Reports</h3>
              <p className="text-red-600">{error.message || 'Failed to load reports'}</p>
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
                <BarChart3 className="h-5 w-5" />
                Stock Adjustment Reports & Analytics
              </CardTitle>
              <CardDescription>
                Comprehensive analysis of stock adjustments
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[180px]">
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
              <Button variant="outline" size="sm" onClick={handleExportReport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Adjustments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalAdjustments}</div>
                <p className="text-xs text-muted-foreground">
                  All adjustment types
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Added</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">+{stats.totalStockIn}</div>
                <p className="text-xs text-muted-foreground">
                  Total units added
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Removed</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">-{stats.totalStockOut}</div>
                <p className="text-xs text-muted-foreground">
                  Total units removed
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Change</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${stats.netStockChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.netStockChange >= 0 ? '+' : ''}{stats.netStockChange}
                </div>
                <p className="text-xs text-muted-foreground">
                  Net stock movement
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approval Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-600">{stats.pendingApprovals}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting approval
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{stats.approvedAdjustments}</div>
                <p className="text-xs text-muted-foreground">
                  Successfully approved
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <Activity className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">{stats.rejectedAdjustments}</div>
                <p className="text-xs text-muted-foreground">
                  Rejected adjustments
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Adjustment Types Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Adjustment Types Breakdown
          </CardTitle>
          <CardDescription>
            Distribution of adjustment types
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">Add Stock (INCREMENT)</div>
                    <div className="text-sm text-muted-foreground">Stock additions</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{stats.byType.INCREMENT}</div>
                  <div className="text-xs text-muted-foreground">
                    {stats.totalAdjustments > 0 
                      ? ((stats.byType.INCREMENT / stats.totalAdjustments) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-medium">Remove Stock (DECREMENT)</div>
                    <div className="text-sm text-muted-foreground">Stock removals</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">{stats.byType.DECREMENT}</div>
                  <div className="text-xs text-muted-foreground">
                    {stats.totalAdjustments > 0 
                      ? ((stats.byType.DECREMENT / stats.totalAdjustments) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Hash className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Set to Exact (SET_TO)</div>
                    <div className="text-sm text-muted-foreground">Direct stock setting</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{stats.byType.SET_TO}</div>
                  <div className="text-xs text-muted-foreground">
                    {stats.totalAdjustments > 0 
                      ? ((stats.byType.SET_TO / stats.totalAdjustments) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Reasons and Users */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Reasons */}
        <Card>
          <CardHeader>
            <CardTitle>Top Adjustment Reasons</CardTitle>
            <CardDescription>
              Most common reasons for adjustments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : topReasons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data available
              </div>
            ) : (
              <div className="space-y-3">
                {topReasons.map(([reason, count], index) => (
                  <div key={reason} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{reason}</span>
                    </div>
                    <span className="text-lg font-bold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle>Top Users</CardTitle>
            <CardDescription>
              Users with most adjustments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : topUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data available
              </div>
            ) : (
              <div className="space-y-3">
                {topUsers.map(([user, count], index) => (
                  <div key={user} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{user}</span>
                    </div>
                    <span className="text-lg font-bold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}