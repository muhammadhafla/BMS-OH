'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  RotateCcw,
  Clock,
  TrendingUp,
  FileText,
  Filter
} from 'lucide-react';
import { ImportResult } from '@/lib/validations/csv-import';
import { calculateImportStats } from '@/lib/utils/csv';

interface CsvImportResultsProps {
  result: ImportResult;
  onRetry: () => void;
  onClose: () => void;
  showRetryButton?: boolean;
}

export function CsvImportResults({
  result,
  onRetry,
  onClose,
  showRetryButton = true
}: CsvImportResultsProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const [errorFilter, setErrorFilter] = useState<string>('all');

  const stats = calculateImportStats(result);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const filteredErrors = result.errors.filter(error => {
    if (errorFilter === 'all') return true;
    return error.field === errorFilter;
  });

  const exportErrors = () => {
    const errorData = result.errors.map(error => ({
      'Row': error.rowIndex + 1,
      'SKU': error.sku || '',
      'Field': error.field,
      'Error Message': error.message,
      'Value': error.value || ''
    }));

    if (errorData.length === 0) {
      return;
    }

    const csvContent = [
      Object.keys(errorData[0] || {}).join(','),
      ...errorData.map(row =>
        Object.values(row).map(val => `"${val}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${result.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import Results
          </DialogTitle>
          <DialogDescription>
            Import completed on {formatDate(result.completedAt)} - Duration: {formatDuration(result.duration)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="errors">Errors ({result.errors.length})</TabsTrigger>
              <TabsTrigger value="success">Success ({result.successful})</TabsTrigger>
              <TabsTrigger value="logs">Activity Log</TabsTrigger>
            </TabsList>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-6">
              {/* Overall Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Processed</p>
                        <p className="text-2xl font-bold">{result.totalProcessed}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Successful</p>
                        <p className="text-2xl font-bold text-green-600">{result.successful}</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Failed</p>
                        <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                      </div>
                      <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Skipped</p>
                        <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                      </div>
                      <AlertCircle className="w-8 h-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Success Rate</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-green-600 rounded-full" 
                            style={{ width: `${stats.successRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.successRate.toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Error Rate</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-red-600 rounded-full" 
                            style={{ width: `${stats.errorRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.errorRate.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span>Skipped Rate</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-yellow-600 rounded-full" 
                            style={{ width: `${stats.skippedRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.skippedRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Processing Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Processing Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Import ID:</span>
                      <p className="text-muted-foreground font-mono">{result.id}</p>
                    </div>
                    <div>
                      <span className="font-medium">Started:</span>
                      <p className="text-muted-foreground">{formatDate(result.startedAt)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Completed:</span>
                      <p className="text-muted-foreground">{formatDate(result.completedAt)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span>
                      <p className="text-muted-foreground">{formatDuration(result.duration)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Errors Tab */}
            <TabsContent value="errors" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Import Errors</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={exportErrors}
                    variant="outline"
                    size="sm"
                    disabled={result.errors.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Errors
                  </Button>
                </div>
              </div>

              {result.errors.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-green-800">No Errors!</h3>
                      <p className="text-green-600">All products were imported successfully.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-medium">Filter by field:</span>
                        <select
                          value={errorFilter}
                          onChange={(e) => setErrorFilter(e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          <option value="all">All Fields</option>
                          <option value="sku">SKU</option>
                          <option value="name">Name</option>
                          <option value="price">Price</option>
                          <option value="cost">Cost</option>
                          <option value="stock">Stock</option>
                          <option value="row">General</option>
                        </select>
                      </div>

                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Row</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead>Field</TableHead>
                              <TableHead>Error Message</TableHead>
                              <TableHead>Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredErrors.slice(0, 100).map((error, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-mono">{error.rowIndex + 1}</TableCell>
                                <TableCell className="font-mono">{error.sku || 'N/A'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{error.field}</Badge>
                                </TableCell>
                                <TableCell className="text-red-600">{error.message}</TableCell>
                                <TableCell className="font-mono text-muted-foreground">
                                  {error.value || 'N/A'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {filteredErrors.length > 100 && (
                          <div className="p-4 text-center text-muted-foreground">
                            Showing 100 of {filteredErrors.length} errors
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Success Tab */}
            <TabsContent value="success" className="space-y-4">
              <h3 className="text-lg font-semibold">Successfully Imported Products</h3>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-green-800">
                      {result.successful} Products Imported Successfully!
                    </h3>
                    <p className="text-green-600">
                      All valid products have been added to your inventory.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Log Tab */}
            <TabsContent value="logs" className="space-y-4">
              <h3 className="text-lg font-semibold">Activity Log</h3>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Import started at {formatDate(result.startedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Processed {result.totalProcessed} total items</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Successfully imported {result.successful} products</span>
                    </div>
                    {result.failed > 0 && (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>Failed to import {result.failed} products</span>
                      </div>
                    )}
                    {result.skipped > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        <span>Skipped {result.skipped} products</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Import completed at {formatDate(result.completedAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-between">
          <div>
            {showRetryButton && result.failed > 0 && (
              <Button onClick={onRetry} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry Failed Imports
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}