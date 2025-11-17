'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Search,
  Calendar,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Activity,
  Filter,
} from 'lucide-react';
import useSWR from 'swr';
import { apiService } from '@/services/api';

export function InventoryAudit() {
  const [auditType, setAuditType] = useState('ALL');
  const [dateRange, setDateRange] = useState('30');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Fetch audit data
  const { data, error, isLoading, mutate } = useSWR(
    ['/api/inventory/audit', auditType, dateRange],
    () => apiService.getInventoryAudit({
      type: auditType === 'ALL' ? undefined : auditType,
      dateRange: parseInt(dateRange),
    }),
    {
      refreshInterval: 60000, // 1 minute
    }
  );

  const audits = (data as any)?.data?.audits || [];
  const summary = (data as any)?.data?.summary || {
    totalAudits: 0,
    completed: 0,
    pending: 0,
    discrepancies: 0,
    byType: {},
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get audit status styling
  const getAuditStatusStyle = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { variant: 'default' as const, icon: CheckCircle2, color: 'text-green-600', text: 'Completed' };
      case 'IN_PROGRESS':
        return { variant: 'secondary' as const, icon: Clock, color: 'text-blue-600', text: 'In Progress' };
      case 'PENDING':
        return { variant: 'outline' as const, icon: AlertCircle, color: 'text-orange-600', text: 'Pending' };
      case 'CANCELLED':
        return { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600', text: 'Cancelled' };
      default:
        return { variant: 'outline' as const, icon: FileText, color: 'text-gray-600', text: status };
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const response = await apiService.getInventoryAudit({
        type: auditType === 'ALL' ? undefined : auditType,
        dateRange: parseInt(dateRange),
        export: true,
      });
      
      // Handle CSV download
      const blob = new Blob([(response as any).data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-audit-${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Show audit details
  const handleShowDetails = (audit: any) => {
    setSelectedAudit(audit);
    setShowDetailsDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Inventory Audit & Reconciliation
              </CardTitle>
              <CardDescription>
                Track inventory audits, physical counts, and discrepancy resolutions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={auditType} onValueChange={setAuditType}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Audits</SelectItem>
                  <SelectItem value="PHYSICAL_COUNT">Physical Count</SelectItem>
                  <SelectItem value="CYCLE_COUNT">Cycle Count</SelectItem>
                  <SelectItem value="SPOT_CHECK">Spot Check</SelectItem>
                  <SelectItem value="RECONCILIATION">Reconciliation</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[120px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                  <SelectItem value="365">1 Year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowCreateDialog(true)}
              >
                <FileText className="w-4 h-4 mr-2" />
                New Audit
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
            <CardTitle className="text-sm font-medium">Total Audits</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{summary.totalAudits}</div>
                <p className="text-xs text-muted-foreground">
                  All audit types
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
                <p className="text-xs text-muted-foreground">
                  Successfully completed
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-600">{summary.pending}</div>
                <p className="text-xs text-muted-foreground">
                  Currently ongoing
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discrepancies</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">{summary.discrepancies}</div>
                <p className="text-xs text-muted-foreground">
                  Found discrepancies
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Audit List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Audit History
          </CardTitle>
          <CardDescription>
            Complete list of inventory audits and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Audit ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items Counted</TableHead>
                  <TableHead>Discrepancies</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : audits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground">No audits found</h3>
                        <p className="text-sm text-muted-foreground">
                          No inventory audits have been performed yet
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  audits.map((audit: any) => {
                    const statusStyle = getAuditStatusStyle(audit.status);
                    const StatusIcon = statusStyle.icon;
                    
                    return (
                      <TableRow key={audit.id}>
                        <TableCell className="font-mono text-sm">{audit.auditId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{audit.type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(audit.date)}</TableCell>
                        <TableCell>
                          <Badge variant={statusStyle.variant} className="flex items-center gap-1 w-fit">
                            <StatusIcon className="w-3 h-3" />
                            {statusStyle.text}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {audit.itemsCounted?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={audit.discrepancies > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {audit.discrepancies || 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">{audit.performedBy?.name}</div>
                              <div className="text-xs text-muted-foreground">{audit.performedBy?.role}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShowDetails(audit)}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create New Audit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Audit</DialogTitle>
            <DialogDescription>
              Start a new inventory audit or physical count
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Audit Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select audit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHYSICAL_COUNT">Physical Count</SelectItem>
                  <SelectItem value="CYCLE_COUNT">Cycle Count</SelectItem>
                  <SelectItem value="SPOT_CHECK">Spot Check</SelectItem>
                  <SelectItem value="RECONCILIATION">Reconciliation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input placeholder="Enter audit description" />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowCreateDialog(false)}>
                Create Audit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Details</DialogTitle>
            <DialogDescription>
              Detailed information about this audit
            </DialogDescription>
          </DialogHeader>
          {selectedAudit && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Audit Information</Label>
                  <div className="p-3 border rounded bg-muted/50">
                    <div className="font-medium">ID: {selectedAudit.auditId}</div>
                    <div className="text-sm text-muted-foreground">Type: {selectedAudit.type}</div>
                    <div className="text-sm text-muted-foreground">Date: {formatDate(selectedAudit.date)}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="p-3 border rounded">
                    <Badge variant={getAuditStatusStyle(selectedAudit.status).variant}>
                      {getAuditStatusStyle(selectedAudit.status).text}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Items Counted</Label>
                  <div className="text-2xl font-bold">{selectedAudit.itemsCounted || 0}</div>
                </div>
                <div className="space-y-2">
                  <Label>Discrepancies</Label>
                  <div className="text-2xl font-bold text-red-600">
                    {selectedAudit.discrepancies || 0}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accuracy</Label>
                  <div className="text-2xl font-bold text-green-600">
                    {selectedAudit.itemsCounted > 0 
                      ? (((selectedAudit.itemsCounted - (selectedAudit.discrepancies || 0)) / selectedAudit.itemsCounted) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
              </div>

              {selectedAudit.description && (
                <div className="space-y-2">
                  <Label>Description</Label>
                  <div className="p-3 border rounded bg-muted/50">
                    {selectedAudit.description}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Performed By</Label>
                <div className="flex items-center gap-2 p-3 border rounded">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{selectedAudit.performedBy?.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedAudit.performedBy?.role}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}