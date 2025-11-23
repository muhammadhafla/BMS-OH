'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import type { StockAdjustment } from '@/types/stock-adjustment';
import { canApproveAdjustment } from '@/lib/validations/stock-adjustment';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Hash,
  User,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface StockApprovalQueueProps {
  branchId?: string;
  autoRefresh?: boolean;
}

export function StockApprovalQueue({ 
  branchId,
  autoRefresh = true 
}: StockApprovalQueueProps) {
  const { user } = useAuthStore();
  const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustment | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if user can approve
  const canApprove = user ? canApproveAdjustment(user.role) : false;

  // Fetch pending approvals
  const { data, error, isLoading, mutate } = useSWR(
    canApprove ? ['/api/inventory/adjustments/pending-approvals', branchId] : null,
    () => apiService.getPendingApprovals({ 
      branchId,
      status: 'PENDING',
    }),
    {
      refreshInterval: autoRefresh ? 30000 : 0, // 30 seconds
    }
  );

  const pendingAdjustments = (data as any)?.data?.adjustments || [];

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

  // Get adjustment type styling
  const getAdjustmentTypeStyle = (type: string) => {
    switch (type) {
      case 'INCREMENT':
        return { 
          variant: 'default' as const, 
          icon: TrendingUp, 
          color: 'text-green-600',
          text: 'Add Stock'
        };
      case 'DECREMENT':
        return { 
          variant: 'destructive' as const, 
          icon: TrendingDown, 
          color: 'text-red-600',
          text: 'Remove Stock'
        };
      case 'SET_TO':
        return { 
          variant: 'secondary' as const, 
          icon: Hash, 
          color: 'text-blue-600',
          text: 'Set to Exact'
        };
      default:
        return { 
          variant: 'outline' as const, 
          icon: FileText, 
          color: 'text-gray-600',
          text: type
        };
    }
  };

  // Handle approval action
  const handleApprovalAction = (adjustment: StockAdjustment, action: 'APPROVED' | 'REJECTED') => {
    setSelectedAdjustment(adjustment);
    setApprovalAction(action);
    setApprovalNotes('');
    setShowApprovalDialog(true);
  };

  // Submit approval
  const handleSubmitApproval = async () => {
    if (!selectedAdjustment || !approvalAction) return;

    setIsProcessing(true);
    try {

      const actionText = approvalAction === 'APPROVED' ? 'approved' : 'rejected';
      toast.success(`Adjustment ${actionText}`, {
        description: `Stock adjustment has been ${actionText} successfully`,
      });

      setShowApprovalDialog(false);
      setSelectedAdjustment(null);
      setApprovalAction(null);
      setApprovalNotes('');
      mutate();
    } catch (error: any) {
      toast.error('Failed to process approval', {
        description: error.message || 'An error occurred',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate priority
  const getPriority = (adjustment: StockAdjustment) => {
    if (adjustment.quantity > 100) {
      return { level: 'high', color: 'text-red-600', text: 'High Priority' };
    } else if (adjustment.quantity > 50) {
      return { level: 'medium', color: 'text-orange-600', text: 'Medium Priority' };
    } else {
      return { level: 'low', color: 'text-blue-600', text: 'Low Priority' };
    }
  };

  // No permission
  if (!canApprove) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Stock Approval Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to approve stock adjustments. Only managers and admins can approve adjustments.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Stock Approval Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Queue</h3>
              <p className="text-red-600">{error.message || 'Failed to load pending approvals'}</p>
              <Button 
                onClick={() => mutate()} 
                className="mt-4"
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
            <CardDescription>
              Stock adjustments awaiting your approval
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{pendingAdjustments.length}</div>
          <p className="text-sm text-muted-foreground mt-1">
            Adjustments requiring approval
          </p>
        </CardContent>
      </Card>

      {/* Approval Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Queue</CardTitle>
          <CardDescription>
            Review and approve or reject stock adjustments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                    </TableRow>
                  ))
                ) : pendingAdjustments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                        <h3 className="text-lg font-semibold text-green-900">All Caught Up!</h3>
                        <p className="text-sm text-muted-foreground">
                          No pending approvals at this time
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingAdjustments.map((adjustment: StockAdjustment) => {
                    const typeStyle = getAdjustmentTypeStyle(adjustment.adjustmentType);
                    const priority = getPriority(adjustment);
                    const TypeIcon = typeStyle.icon;
                    
                    return (
                      <TableRow key={adjustment.id}>
                        <TableCell>
                          <Badge variant="outline" className={priority.color}>
                            {priority.text}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(adjustment.createdAt)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{adjustment.product?.name}</div>
                            <div className="text-xs text-muted-foreground">{adjustment.product?.sku}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeStyle.variant} className="flex items-center gap-1 w-fit">
                            <TypeIcon className="w-3 h-3" />
                            {typeStyle.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${typeStyle.color}`}>
                            {adjustment.adjustmentType === 'INCREMENT' ? '+' : 
                             adjustment.adjustmentType === 'DECREMENT' ? '-' : ''}
                            {adjustment.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={adjustment.reason}>
                          {adjustment.reason}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">
                                {adjustment.performedBy?.name || 'Unknown'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {adjustment.performedBy?.role}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApprovalAction(adjustment, 'APPROVED')}
                              disabled={isProcessing}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleApprovalAction(adjustment, 'REJECTED')}
                              disabled={isProcessing}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
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

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'APPROVED' ? 'Approve' : 'Reject'} Stock Adjustment
            </DialogTitle>
            <DialogDescription>
              Review the adjustment details and provide your decision
            </DialogDescription>
          </DialogHeader>
          {selectedAdjustment && (
            <div className="space-y-4">
              {/* Adjustment Details */}
              <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Product:</span>
                  <div className="text-right">
                    <div className="font-medium">{selectedAdjustment.product?.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedAdjustment.product?.sku}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Adjustment Type:</span>
                  <Badge variant={getAdjustmentTypeStyle(selectedAdjustment.adjustmentType).variant}>
                    {getAdjustmentTypeStyle(selectedAdjustment.adjustmentType).text}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quantity:</span>
                  <span className="font-bold text-lg">
                    {selectedAdjustment.adjustmentType === 'INCREMENT' ? '+' : 
                     selectedAdjustment.adjustmentType === 'DECREMENT' ? '-' : ''}
                    {selectedAdjustment.quantity} {selectedAdjustment.product?.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Stock:</span>
                  <span className="font-medium">{selectedAdjustment.previousStock} {selectedAdjustment.product?.unit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">New Stock:</span>
                  <span className="font-bold">{selectedAdjustment.newStock} {selectedAdjustment.product?.unit}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="text-sm font-medium mb-1">Reason:</div>
                  <div className="text-sm">{selectedAdjustment.reason}</div>
                </div>
                {selectedAdjustment.notes && (
                  <div>
                    <div className="text-sm font-medium mb-1">Notes:</div>
                    <div className="text-sm text-muted-foreground">{selectedAdjustment.notes}</div>
                  </div>
                )}
                {selectedAdjustment.reference && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Reference:</span>
                    <span className="text-sm">{selectedAdjustment.reference}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm font-medium">Requested By:</span>
                  <div className="text-right">
                    <div className="text-sm font-medium">{selectedAdjustment.performedBy?.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedAdjustment.performedBy?.email}</div>
                  </div>
                </div>
              </div>

              {/* Approval Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Approval Notes {approvalAction === 'REJECTED' && '(Required for rejection)'}
                </label>
                <Textarea
                  placeholder={`Enter your ${approvalAction === 'APPROVED' ? 'approval' : 'rejection'} notes...`}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {/* Warning for rejection */}
              {approvalAction === 'REJECTED' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This adjustment will be rejected and the stock will not be changed. Please provide a clear reason for rejection.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApprovalDialog(false);
                setSelectedAdjustment(null);
                setApprovalAction(null);
                setApprovalNotes('');
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant={approvalAction === 'APPROVED' ? 'default' : 'destructive'}
              onClick={handleSubmitApproval}
              disabled={isProcessing || (approvalAction === 'REJECTED' && !approvalNotes.trim())}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : approvalAction === 'APPROVED' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve Adjustment
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Adjustment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}