'use client';

import React, { useState } from 'react';
import { mutate } from 'swr';
import { toast } from 'sonner';
import { CategoryImportResult } from '@/lib/validations/category';
import { apiService } from '@/services/api';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';

interface CategoryImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CategoryImportModal({ open, onOpenChange, onSuccess }: CategoryImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<CategoryImportResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Download sample CSV
  const handleDownloadSample = async () => {
    try {
      const response = await apiService.downloadCategorySampleCSV();
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'category-import-template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Sample CSV downloaded');
    } catch (error) {
      toast.error('Failed to download sample CSV');
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file to import');
      return;
    }

    setImporting(true);
    setUploadProgress(0);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('csvData', await file.text());
      formData.append('branchId', 'default'); // TODO: Get from user context

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await apiService.importCategoriesFromCSV(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        setImportResult(response.data);
        toast.success('Import completed', {
          description: response.message,
        });
        
        // Refresh data
        mutate('/api/categories');
        mutate('/api/categories/tree');
        
        // Call onSuccess callback
        onSuccess?.();
      } else {
      throw new Error(response.message || 'Import failed');
    }
  } catch (error: any) {
    toast.error('Import failed', {
      description: error.response?.data?.message || error.message,
    });
  } finally {
      setImporting(false);
    }
  };

  // Reset modal
  const handleClose = () => {
    if (!importing) {
      setFile(null);
      setImportResult(null);
      setUploadProgress(0);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Categories from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import categories. Download the sample file to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sample Download */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step 1: Download Sample CSV</CardTitle>
              <CardDescription>
                Download the sample file to see the required CSV format and column headers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDownloadSample} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Sample CSV
              </Button>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step 2: Select CSV File</CardTitle>
              <CardDescription>
                Choose your CSV file with category data. Supported format: CSV files only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  disabled={importing}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                
                {file && (
                  <div className="flex items-center gap-2 p-3 border rounded-md">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Import Progress */}
          {importing && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Importing categories...</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-xs text-muted-foreground">
                    {uploadProgress}% complete
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Import Results</CardTitle>
                <CardDescription>
                  Summary of the import process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{importResult.total}</div>
                      <p className="text-xs text-muted-foreground">Total Rows</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{importResult.created}</div>
                      <p className="text-xs text-muted-foreground">Created</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
                      <p className="text-xs text-muted-foreground">Skipped</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </div>
                  </div>

                  {/* Success List */}
                  {importResult.success.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Successfully Imported
                      </h4>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {importResult.success.map((item, index) => (
                          <div key={index} className="text-xs p-2 bg-green-50 rounded border border-green-200">
                            Row {item.row}: {item.name} ({item.code || 'No code'})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors List */}
                  {importResult.errors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        Errors
                      </h4>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {importResult.errors.map((item, index) => (
                          <div key={index} className="text-xs p-2 bg-red-50 rounded border border-red-200">
                            Row {item.row}: {item.error}
                            {item.name && <span className="block text-muted-foreground">Name: {item.name}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Import Guidelines:</strong>
              <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                <li>CSV file must have a header row with column names</li>
                <li>Required columns: name</li>
                <li>Optional columns: code, description, isactive</li>
                <li>Category codes must be unique</li>
                <li>Names must be unique within the same parent category</li>
                <li>Maximum 3 levels of category hierarchy</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={importing}
            >
              {importResult ? 'Close' : 'Cancel'}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importing || !!importResult}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Categories
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}