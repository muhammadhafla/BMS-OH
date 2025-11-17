// Transaction History Component
// Displays transaction history with advanced filtering, search, and management capabilities

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Transaction, TransactionFilters, PaginatedTransactions } from '@/lib/types/transaction';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  FileText, 
  Receipt, 
  RefreshCw,
  AlertTriangle,
  Calendar,
  DollarSign,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TransactionHistoryProps {
  transactions: Transaction[];
  loading: boolean;
  pagination: PaginatedTransactions['pagination'];
  filters: TransactionFilters;
  onFilterChange: (filters: Partial<TransactionFilters>) => void;
  onSearch: (query: string, type: 'code' | 'customer' | 'product' | 'all') => void;
  onViewDetails: (transactionId: string) => void;
  onUpdateStatus: (transactionId: string, status: string, notes?: string) => Promise<void>;
}

export function TransactionHistory({
  transactions,
  loading,
  pagination,
  filters,
  onFilterChange,
  onSearch,
  onViewDetails,
  onUpdateStatus,
}: TransactionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'code' | 'customer' | 'product' | 'all'>('all');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusAction, setStatusAction] = useState<{ transactionId: string; status: string } | null>(null);
  const [statusNotes, setStatusNotes] = useState('');

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'PENDING':
        return <Badge variant="outline" className="border-yellow-300 text-yellow-700">Pending</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'REFUNDED':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim(), searchType);
    }
  };

  // Handle key press in search input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle selection
  const handleSelectTransaction = (transactionId: string, checked: boolean) => {
    setSelectedTransactions(prev => 
      checked 
        ? [...prev, transactionId]
        : prev.filter(id => id !== transactionId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTransactions(checked ? transactions.map(t => t.id) : []);
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!statusAction) return;
    
    try {
      await onUpdateStatus(statusAction.transactionId, statusAction.status, statusNotes);
      setShowStatusDialog(false);
      setStatusAction(null);
      setStatusNotes('');
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // Show status dialog
  const showStatusChangeDialog = (transactionId: string, status: string) => {
    setStatusAction({ transactionId, status });
    setShowStatusDialog(true);
  };

  // Clear filters
  const clearFilters = () => {
    onFilterChange({
      startDate: undefined,
      endDate: undefined,
      status: undefined,
      branchId: undefined,
      search: undefined,
      minAmount: undefined,
      maxAmount: undefined,
    });
    setSearchQuery('');
  };

  // Pagination helpers
  const canGoPrevious = pagination.page > 1;
  const canGoNext = pagination.page < pagination.pages;

  const goToPrevious = () => {
    if (canGoPrevious) {
      onFilterChange({ page: pagination.page - 1 });
    }
  };

  const goToNext = () => {
    if (canGoNext) {
      onFilterChange({ page: pagination.page + 1 });
    }
  };

  // Memoized filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions;
  }, [transactions]);

  return (
    <div className="space-y-4">
      {/* Search and Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
          <CardDescription>
            Find transactions using search and apply filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full"
              />
            </div>
            <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                <SelectItem value="code">Transaction Code</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="product">Product</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            <Input
              type="date"
              placeholder="Start Date"
              value={filters.startDate || ''}
              onChange={(e) => onFilterChange({ startDate: e.target.value })}
            />
            <Input
              type="date"
              placeholder="End Date"
              value={filters.endDate || ''}
              onChange={(e) => onFilterChange({ endDate: e.target.value })}
            />
            <Select 
              value={filters.status || 'all'} 
              onValueChange={(value) => onFilterChange({ status: value === 'all' ? undefined : value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Min Amount"
              value={filters.minAmount || ''}
              onChange={(e) => onFilterChange({ minAmount: e.target.value ? Number(e.target.value) : undefined })}
            />
            <Input
              type="number"
              placeholder="Max Amount"
              value={filters.maxAmount || ''}
              onChange={(e) => onFilterChange({ maxAmount: e.target.value ? Number(e.target.value) : undefined })}
            />
            <Button variant="outline" onClick={clearFilters} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedTransactions.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedTransactions.length} transaction(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Export Selected
                </Button>
                <Button variant="outline" size="sm">
                  <Receipt className="w-4 h-4 mr-2" />
                  Print Receipts
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Transaction Code</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Loading transactions...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {filters.search || filters.status || filters.startDate ? (
                        <>
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                          <p>No transactions found matching your criteria</p>
                          <Button 
                            variant="link" 
                            onClick={clearFilters}
                            className="mt-2"
                          >
                            Clear filters
                          </Button>
                        </>
                      ) : (
                        'No transactions found'
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTransactions.includes(transaction.id)}
                        onCheckedChange={(checked) => 
                          handleSelectTransaction(transaction.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {transaction.transactionCode}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(transaction.createdAt)}</div>
                        <div className="text-muted-foreground text-xs">
                          {transaction.branch.name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{transaction.user.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {transaction.user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{transaction.items.length} item(s)</div>
                        <div className="text-muted-foreground text-xs">
                          Qty: {transaction.items.reduce((sum, item) => sum + item.quantity, 0)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {formatCurrency(transaction.finalAmount)}
                      </div>
                      {transaction.discount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Disc: {formatCurrency(transaction.discount)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{transaction.paymentMethod.replace('_', ' ')}</div>
                        <div className="text-xs text-muted-foreground">
                          Paid: {formatCurrency(transaction.amountPaid)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(transaction.status)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onViewDetails(transaction.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Receipt className="w-4 h-4 mr-2" />
                            Generate Receipt
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {transaction.status === 'PENDING' && (
                            <DropdownMenuItem 
                              onClick={() => showStatusChangeDialog(transaction.id, 'COMPLETED')}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Mark as Complete
                            </DropdownMenuItem>
                          )}
                          {['PENDING', 'COMPLETED'].includes(transaction.status) && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => showStatusChangeDialog(transaction.id, 'CANCELLED')}
                                className="text-destructive"
                              >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Cancel Transaction
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => showStatusChangeDialog(transaction.id, 'REFUNDED')}
                                className="text-orange-600"
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Process Refund
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && filteredTransactions.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevious}
                  disabled={!canGoPrevious}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNext}
                  disabled={!canGoNext}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusAction?.status === 'COMPLETED' && 'Mark as Complete'}
              {statusAction?.status === 'CANCELLED' && 'Cancel Transaction'}
              {statusAction?.status === 'REFUNDED' && 'Process Refund'}
            </DialogTitle>
            <DialogDescription>
              {statusAction?.status === 'COMPLETED' && 'Mark this transaction as completed.'}
              {statusAction?.status === 'CANCELLED' && 'Cancel this transaction. This will restore inventory.'}
              {statusAction?.status === 'REFUNDED' && 'Process a refund for this transaction.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this status change..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant={statusAction?.status === 'CANCELLED' ? 'destructive' : 'default'}
              onClick={handleStatusUpdate}
            >
              {statusAction?.status === 'COMPLETED' && 'Mark as Complete'}
              {statusAction?.status === 'CANCELLED' && 'Cancel Transaction'}
              {statusAction?.status === 'REFUNDED' && 'Process Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}