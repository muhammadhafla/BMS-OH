'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Database,
  Upload
} from 'lucide-react';
import { CsvImportRow, ImportError, ImportResult } from '@/lib/validations/csv-import';
import { createBatches, calculateProgress } from '@/lib/utils/csv';

import { csvImportAPI } from '@/lib/services/csv-import';

interface CsvImportProgressProps {
  data: CsvImportRow[];
  onComplete: (result: ImportResult) => void;
  onError: () => void;
  batchSize?: number;
  onProgressUpdate?: (progress: number, current: number, total: number) => void;
}

export function CsvImportProgress({
  data,
  onComplete,
  onError,
  batchSize = 50,
  onProgressUpdate
}: CsvImportProgressProps) {
  const [importStatus, setImportStatus] = useState<any>({
    id: Date.now().toString(),
    total: data.length,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    status: 'processing' as const,
    currentBatch: 0,
    totalBatches: Math.ceil(data.length / batchSize),
    errors: [],
    startedAt: new Date().toISOString(),
  });

  const [currentBatch, setCurrentBatch] = useState<CsvImportRow[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    startImport();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const startImport = async () => {
    try {
      abortControllerRef.current = new AbortController();
      const batches = createBatches(data, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        setCurrentBatch(batch);
        await processBatch(batch, i, batches.length);
        
        // Update progress
        const progress = calculateProgress((i + 1) * batchSize, data.length);
        onProgressUpdate?.(progress, (i + 1) * batchSize, data.length);
        
        setImportStatus(prev => ({
          ...prev,
          currentBatch: i + 1,
          totalBatches: batches.length
        }));
      }

      // Import completed
      const finalResult: ImportResult = {
        id: importStatus.id,
        totalProcessed: importStatus.total,
        successful: importStatus.successful,
        failed: importStatus.failed,
        skipped: importStatus.skipped,
        errors: importStatus.errors,
        duration: Date.now() - new Date(importStatus.startedAt).getTime(),
        startedAt: importStatus.startedAt,
        completedAt: new Date().toISOString(),
        duplicateSkus: []
      };

      onComplete(finalResult);
      
    } catch (error) {
      console.error('Import failed:', error);
      onError();
    }
  };

  const processBatch = async (batch: CsvImportRow[], batchIndex: number, totalBatches: number) => {
    try {
      setBatchProgress(0);
      
      // Process batch with progress updates
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        try {
          await processSingleItem(item);
          setImportStatus(prev => ({
            ...prev,
            processed: prev.processed + 1,
            successful: prev.successful + 1
          }));
        } catch (error) {
          const importError: ImportError = {
            rowIndex: (batchIndex * batchSize) + i,
            field: 'row',
            message: error instanceof Error ? error.message : 'Unknown error',
            sku: item.sku,
            value: ''
          };
          
          setImportStatus(prev => ({
            ...prev,
            processed: prev.processed + 1,
            failed: prev.failed + 1,
            errors: [...prev.errors, importError]
          }));
        }
        
        // Update batch progress
        setBatchProgress(((i + 1) / batch.length) * 100);
      }
      
    } catch (error) {
      console.error('Batch processing failed:', error);
      throw error;
    }
  };

  const processSingleItem = async (item: CsvImportRow): Promise<void> => {
    // Simulate API call for now - replace with actual API
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate some failures for demo
        if (Math.random() < 0.1) {
          reject(new Error('Network error or server error'));
        } else {
          resolve();
        }
      }, Math.random() * 200 + 50); // 50-250ms delay
    });
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onError();
  };

  const getStatusIcon = () => {
    switch (importStatus.status) {
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = () => {
    switch (importStatus.status) {
      case 'processing':
        return 'default';
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const overallProgress = calculateProgress(importStatus.processed, importStatus.total);

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Importing Products
          </CardTitle>
          <CardDescription>
            {importStatus.status === 'processing' && (
              <>Processing batch {importStatus.currentBatch} of {importStatus.totalBatches}</>
            )}
            {importStatus.status === 'completed' && 'Import completed successfully'}
            {importStatus.status === 'failed' && 'Import failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{importStatus.processed} of {importStatus.total} ({overallProgress}%)</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          {/* Current Batch Progress */}
          {importStatus.status === 'processing' && currentBatch.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Batch ({importStatus.currentBatch}/{importStatus.totalBatches})</span>
                <span>{Math.round(batchProgress)}%</span>
              </div>
              <Progress value={batchProgress} className="h-2" />
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{importStatus.successful}</div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{importStatus.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{importStatus.skipped}</div>
              <div className="text-sm text-muted-foreground">Skipped</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {importStatus.total - importStatus.processed}
              </div>
              <div className="text-sm text-muted-foreground">Remaining</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Processing Item */}
      {importStatus.status === 'processing' && currentBatch.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Current Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentBatch.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {index === 0 ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    <span className="font-medium">{item.sku}</span>
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <Badge variant={index === 0 ? 'default' : 'secondary'}>
                    {index === 0 ? 'Processing' : 'Completed'}
                  </Badge>
                </div>
              ))}
              {currentBatch.length > 5 && (
                <div className="text-sm text-muted-foreground text-center">
                  ... and {currentBatch.length - 5} more items in this batch
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Errors */}
      {importStatus.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              Recent Errors ({importStatus.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {importStatus.errors.slice(-5).reverse().map((error, index) => (
                <div key={index} className="text-sm p-2 bg-red-50 rounded border border-red-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Row {error.rowIndex + 1}: {error.sku}</span>
                    <span className="text-red-600 text-xs">{error.field}</span>
                  </div>
                  <div className="text-red-700">{error.message}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Button */}
      {importStatus.status === 'processing' && (
        <div className="flex justify-center">
          <Button onClick={handleCancel} variant="outline">
            Cancel Import
          </Button>
        </div>
      )}
    </div>
  );
}