'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Filter,
  History,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  Eye
} from 'lucide-react';
import { CsvImportResults } from './CsvImportResults';

// Mock data for demonstration
const mockImportHistory = [
  {
    id: '1',
    totalProcessed: 150,
    successful: 145,
    failed: 3,
    skipped: 2,
    errors: [
      { rowIndex: 45, field: 'sku', message: 'Duplicate SKU found', sku: 'ELEC001' },
      { rowIndex: 78, field: 'price', message: 'Invalid price format', sku: 'ELEC002', value: 'abc' }
    ],
    duration: 45000,
    startedAt: '2024-11-10T10:30:00.000Z',
    completedAt: '2024-11-10T10:30:45.000Z',
    duplicateSkus: ['ELEC001']
  },
  {
    id: '2',
    totalProcessed: 85,
    successful: 85,
    failed: 0,
    skipped: 0,
    errors: [],
    duration: 32000,
    startedAt: '2024-11-09T15:20:00.000Z',
    completedAt: '2024-11-09T15:20:32.000Z',
    duplicateSkus: []
  }
];

interface CsvImportHistoryProps {
  onRetryImport?: (importId: string) => void;
}

export function CsvImportHistory({ onRetryImport }: CsvImportHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedImport, setSelectedImport] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getStatusBadge = (importItem: any) => {
    if (importItem.successful === importItem.totalProcessed) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
    } else if (importItem.successful === 0) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    } else {
      return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Partial</Badge>;
    }
  };

  const getSuccessRate = (importItem: any): number => {
    return importItem.totalProcessed > 0 ? (importItem.successful / importItem.totalProcessed) * 100 : 0;
  };

  const handleViewDetails = (importItem: any) => {
    setSelectedImport(importItem);
    setIsDetailsOpen(true);
  };

  const handleRetry = (importId: string) => {
    if (onRetryImport) {
      onRetryImport(importId);
    }
  };

  // Filter imports
  const filteredImports = mockImportHistory.filter((importItem: any) => {
    const matchesSearch = searchTerm === '' || 
      importItem.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'success' && importItem.failed === 0) ||
      (statusFilter === 'partial' && importItem.failed > 0 && importItem.successful > 0) ||
      (statusFilter === 'failed' && importItem.successful === 0);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Import History</h2>
          <p className="text-muted-foreground">
            View and manage your previous CSV imports
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Imports</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockImportHistory.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mockImportHistory.filter(i => i.successful === i.totalProcessed).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partial</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {mockImportHistory.filter(i => i.successful > 0 && i.successful < i.totalProcessed).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {mockImportHistory.filter(i => i.successful === 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by import ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Import ID</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredImports.map((importItem: any) => (
                  <TableRow key={importItem.id}>
                    <TableCell className="font-mono">
                      {importItem.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {formatDate(importItem.startedAt)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(importItem)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{importItem.successful}/{importItem.totalProcessed}</div>
                        <div className="text-muted-foreground">
                          {importItem.failed} failed, {importItem.skipped} skipped
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-green-600 rounded-full" 
                            style={{ width: `${getSuccessRate(importItem)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {getSuccessRate(importItem).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDuration(importItem.duration)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(importItem)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {importItem.failed > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRetry(importItem.id)}
                            title="Retry failed imports"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Import Details Modal */}
      {selectedImport && isDetailsOpen && (
        <CsvImportResults
          result={selectedImport}
          onRetry={() => handleRetry(selectedImport.id)}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedImport(null);
          }}
          showRetryButton={true}
        />
      )}
    </div>
  );
}