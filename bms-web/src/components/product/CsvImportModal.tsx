'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import {
  Upload,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { CsvImportRow, CSV_TEMPLATE } from '@/lib/validations/csv-import';
import { CsvImportProgress } from './CsvImportProgress';
import { CsvImportResults } from './CsvImportResults';
import { CsvImportHistory } from './CsvImportHistory';
import { parseCsvFile, validateCsvData, generateCsvTemplate } from '@/lib/utils/csv';
import { csvImportAPI } from '@/lib/services/csv-import';

interface CsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface ImportFormData {
  file: FileList;
}

export function CsvImportModal({ open, onOpenChange, onImportComplete }: CsvImportModalProps) {
  const [step, setStep] = useState<'upload' | 'progress' | 'results' | 'history'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CsvImportRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { setValue } = useForm<ImportFormData>({
    resolver: zodResolver(
      z.object({
        file: z.any().refine((files) => files && files.length > 0, 'Please select a CSV file')
      })
    ),
  });

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setValue('file', files);

    // Parse and validate the CSV file
    parseAndValidateFile(file);
  };

  // Parse and validate CSV file
  const parseAndValidateFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const parsedData = parseCsvFile(text);
      
      if (!parsedData || parsedData.length === 0) {
        setValidationErrors([{ message: 'CSV file is empty or has invalid format' }]);
        return;
      }

      // Validate CSV structure
      if (parsedData[0] !== CSV_TEMPLATE.headers) {
        setValidationErrors([{ 
          message: 'CSV headers do not match the expected format. Please download the template and try again.' 
        }]);
        return;
      }

      // Validate data rows
      const dataRows = parsedData.slice(1);
      const { validRows, errors } = validateCsvData(dataRows);
      
      setCsvData(validRows);
      setValidationErrors(errors);
      
      if (validRows.length > 0) {
        setStep('upload'); // Ready for import
      }
    } catch (error) {
      setValidationErrors([{ message: 'Failed to parse CSV file. Please check the format.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, []);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  // Start import process
  const handleStartImport = async () => {
    if (csvData.length === 0) return;
    
    setStep('progress');
    setIsProcessing(true);
    
    try {
      // This will be replaced with actual API call
      const result = await simulateImport(csvData);
      setImportResult(result);
      setStep('results');
      
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Import failed:', error);
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download CSV template
  const handleDownloadTemplate = async () => {
    try {
      // Try to download from API first
      const blob = await csvImportAPI.downloadSampleCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product-import-template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Fallback to local template generation
      console.warn('Failed to download template from API, using local template');
      const csvContent = generateCsvTemplate();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product-import-template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  // Reset modal
  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setCsvData([]);
    setValidationErrors([]);
    setIsProcessing(false);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Simulate import process (replace with actual API call)
  const simulateImport = async (data: CsvImportRow[]): Promise<any> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Simulate results
          const successful = Math.floor(data.length * 0.8);
          const failed = Math.floor(data.length * 0.15);
          const skipped = data.length - successful - failed;
          
          resolve({
            id: Date.now().toString(),
            totalProcessed: data.length,
            successful,
            failed,
            skipped,
            errors: validationErrors,
            duration: Math.random() * 3000 + 1000,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            duplicateSkus: []
          });
        }
      }, 100);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            CSV Import - Bulk Product Import
          </DialogTitle>
          <DialogDescription>
            Import multiple products at once using a CSV file. Download the template to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Template Download */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-2">Need a template?</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Download our CSV template to ensure your data is formatted correctly.
                      </p>
                      <Button onClick={handleDownloadTemplate} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download Template
                      </Button>
                    </div>
                    <FileText className="w-12 h-12 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              {/* File Upload Area */}
              <Card>
                <CardContent className="pt-6">
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {isProcessing ? (
                      <div className="space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground">Processing file...</p>
                      </div>
                    ) : selectedFile ? (
                      <div className="space-y-4">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                        <div>
                          <p className="font-semibold">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                          size="sm"
                        >
                          Choose Different File
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                        <div>
                          <p className="font-semibold mb-2">Drag and drop your CSV file here</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            or click to select a file
                          </p>
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Select File
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </CardContent>
              </Card>

              {/* Validation Results */}
              {csvData.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">File Validation Results</h3>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{csvData.length}</div>
                          <div className="text-sm text-muted-foreground">Valid Rows</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{validationErrors.length}</div>
                          <div className="text-sm text-muted-foreground">Errors</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {csvData.length + validationErrors.length}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Rows</div>
                        </div>
                      </div>

                      {validationErrors.length > 0 && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Please fix the validation errors before proceeding with the import.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Validation Errors Detail */}
              {validationErrors.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4">Validation Errors</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {validationErrors.slice(0, 10).map((error, index) => (
                        <div key={index} className="text-sm p-2 bg-red-50 rounded border border-red-200">
                          <span className="font-medium">Row {error.rowIndex + 1}:</span> {error.message}
                        </div>
                      ))}
                      {validationErrors.length > 10 && (
                        <p className="text-sm text-muted-foreground text-center">
                          ... and {validationErrors.length - 10} more errors
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {step === 'progress' && (
            <CsvImportProgress
              data={csvData}
              onComplete={(result) => {
                setImportResult(result);
                setStep('results');
              }}
              onError={() => setStep('upload')}
            />
          )}

          {step === 'results' && importResult && (
            <CsvImportResults
              result={importResult}
              onRetry={() => setStep('upload')}
              onClose={() => {
                handleReset();
                onOpenChange(false);
              }}
            />
          )}

          {step === 'history' && (
            <CsvImportHistory />
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {step === 'upload' && csvData.length > 0 && (
              <Button
                onClick={() => setStep('history')}
                variant="outline"
              >
                View History
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step === 'upload' && (
              <>
                <Button onClick={() => onOpenChange(false)} variant="outline">
                  Cancel
                </Button>
                {csvData.length > 0 && validationErrors.length === 0 && (
                  <Button onClick={handleStartImport}>
                    Start Import ({csvData.length} products)
                  </Button>
                )}
              </>
            )}
            {step === 'results' && (
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            )}
            {step === 'history' && (
              <Button onClick={() => setStep('upload')} variant="outline">
                Back to Upload
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}