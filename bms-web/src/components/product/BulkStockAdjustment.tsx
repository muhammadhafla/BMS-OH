'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { apiService } from '@/services/api';
import {
  bulkStockAdjustmentSchema,
  type BulkStockAdjustmentFormData,
  ADJUSTMENT_REASONS,
  csvStockAdjustmentSchema,
} from '@/lib/validations/stock-adjustment';
import { downloadCsvTemplate } from '@/lib/utils/csv';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Upload,
  AlertCircle,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react';

interface BulkStockAdjustmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedAdjustment {
  sku: string;
  adjustmentType: 'INCREMENT' | 'DECREMENT' | 'SET_TO';
  quantity: number;
  reason: string;
  notes?: string;
  reference?: string;
  error?: string;
}

export function BulkStockAdjustment({ open, onOpenChange, onSuccess }: BulkStockAdjustmentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedAdjustments, setParsedAdjustments] = useState<ParsedAdjustment[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Initialize form
  const form = useForm<BulkStockAdjustmentFormData>({
    resolver: zodResolver(bulkStockAdjustmentSchema),
    defaultValues: {
      adjustments: [],
      globalReason: '',
      globalReference: '',
    },
    mode: 'onChange',
  });

  const { handleSubmit } = form;

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      form.reset({
        adjustments: [],
        globalReason: '',
        globalReference: '',
      });
      setCsvFile(null);
      setParsedAdjustments([]);
      setUploadProgress(0);
      setSubmitError(null);
    }
  }, [open, form]);

  // Handle CSV file selection
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Invalid file type', {
        description: 'Please upload a CSV file',
      });
      return;
    }

    setCsvFile(file);
    setSubmitError(null);

    try {
      const text = await file.text();
      const rows = text.split('\n').slice(1); // Skip header
      const adjustments: ParsedAdjustment[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]?.trim();
        if (!row) continue;

        const [sku, adjustmentType, quantity, reason, notes, reference] = row.split(',').map(s => s?.trim() || '');

        const adjustment: ParsedAdjustment = {
          sku: sku || '',
          adjustmentType: adjustmentType as any,
          quantity: parseInt(quantity) || 0,
          reason: reason || '',
          notes: notes || '',
          reference: reference || '',
        };

        // Validate each row
        const validation = csvStockAdjustmentSchema.safeParse(adjustment);
        if (!validation.success) {
          adjustment.error = validation.error?.errors?.[0]?.message || 'Validation error';
        }

        adjustments.push(adjustment);
      }

      setParsedAdjustments(adjustments);
      toast.success('CSV file parsed', {
        description: `Found ${adjustments.length} adjustments`,
      });
    } catch (error) {
      toast.error('Failed to parse CSV', {
        description: 'Please check the file format',
      });
    }
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const headers = ['sku', 'adjustmentType', 'quantity', 'reason', 'notes', 'reference'];
    const sampleData = [
      ['PROD-001', 'INCREMENT', '10', ADJUSTMENT_REASONS.PURCHASE, 'Received from supplier', 'PO-12345'],
      ['PROD-002', 'DECREMENT', '5', ADJUSTMENT_REASONS.DAMAGED, 'Damaged during handling', 'DMG-001'],
      ['PROD-003', 'SET_TO', '100', ADJUSTMENT_REASONS.RECOUNT, 'Physical inventory count', 'INV-2024'],
    ];

    // Convert headers and sample data to CSV string format
    const csvContent = [headers, ...sampleData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    downloadCsvTemplate('bulk-stock-adjustment-template.csv', csvContent);
    toast.success('Template downloaded', {
      description: 'Fill in the template and upload it',
    });
  };

  // Remove adjustment from list
  const handleRemoveAdjustment = (index: number) => {
    const updated = parsedAdjustments.filter((_, i) => i !== index);
    setParsedAdjustments(updated);
  };

  // Handle form submission
  const onSubmit = async (data: BulkStockAdjustmentFormData) => {
    if (parsedAdjustments.length === 0) {
      toast.error('No adjustments to process', {
        description: 'Please upload a CSV file with adjustments',
      });
      return;
    }

    const validAdjustments = parsedAdjustments.filter(adj => !adj.error);
    if (validAdjustments.length === 0) {
      toast.error('No valid adjustments', {
        description: 'All adjustments have errors. Please fix them first.',
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setUploadProgress(0);

    try {
      // Prepare adjustments data
      const adjustmentsData = validAdjustments.map(adj => ({
        sku: adj.sku,
        adjustmentType: adj.adjustmentType,
        quantity: adj.quantity,
        reason: adj.reason,
        notes: adj.notes || data.globalReason,
        reference: adj.reference || data.globalReference,
      }));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await apiService.bulkCreateStockAdjustments({
        adjustments: adjustmentsData,
        globalReason: data.globalReason,
        globalReference: data.globalReference,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        const { successCount, failureCount } = response.data.bulkAdjustment;
        
        toast.success('Bulk adjustment completed!', {
          description: `${successCount} adjustments successful, ${failureCount} failed`,
        });
        
        // Close modal
        setTimeout(() => {
          onOpenChange(false);
          onSuccess();
        }, 1000);
      } else {
        throw new Error('Failed to process bulk adjustments');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to process bulk adjustments';
      setSubmitError(errorMessage);
      toast.error('Bulk adjustment failed', {
        description: errorMessage,
      });
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedAdjustments.filter(adj => !adj.error).length;
  const errorCount = parsedAdjustments.filter(adj => adj.error).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Stock Adjustment
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to adjust stock for multiple products at once
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Alert */}
            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* CSV Upload Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Upload CSV File</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV file with stock adjustments
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div className="border-2 border-dashed rounded-lg p-6">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Upload className="w-12 h-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {csvFile ? csvFile.name : 'Choose a CSV file or drag and drop'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      CSV file with columns: sku, adjustmentType, quantity, reason, notes, reference
                    </p>
                  </div>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="max-w-xs"
                  />
                </div>
              </div>
            </div>

            {/* Parsed Adjustments Preview */}
            {parsedAdjustments.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Adjustments Preview</h3>
                  <div className="flex gap-2">
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {validCount} Valid
                    </Badge>
                    {errorCount > 0 && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {errorCount} Errors
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedAdjustments.map((adj, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{adj.sku}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{adj.adjustmentType}</Badge>
                          </TableCell>
                          <TableCell>{adj.quantity}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{adj.reason}</TableCell>
                          <TableCell>
                            {adj.error ? (
                              <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                <XCircle className="w-3 h-3" />
                                Error
                              </Badge>
                            ) : (
                              <Badge variant="default" className="flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" />
                                Valid
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAdjustment(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {errorCount > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {errorCount} adjustment(s) have errors and will be skipped. Please review and fix them.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Global Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Global Settings (Optional)</h3>
              
              <FormField
                control={form.control}
                name="globalReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Global Reason</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Applied to adjustments without specific reason"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This reason will be used for adjustments that don't have a specific reason
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="globalReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Global Reference</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Batch-2024-001"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional reference number for this bulk adjustment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Upload Progress */}
            {isSubmitting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing adjustments...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || parsedAdjustments.length === 0 || validCount === 0}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Process {validCount} Adjustments
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}