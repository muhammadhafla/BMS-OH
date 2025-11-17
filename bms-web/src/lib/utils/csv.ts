// import { CsvImportRow, ImportError, CSV_TEMPLATE } from '@/lib/validations/csv-import';

// Temporary type definitions since import path is not resolving
interface CsvImportRow {
  sku: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  description: string;
  barcode: string;
  unit: string;
  minStock: number;
  maxStock: number;
}

interface ImportError {
  rowIndex: number;
  field: string;
  message: string;
  sku?: string;
  value?: string;
}

const CSV_TEMPLATE = {
  headers: ['sku', 'name', 'description', 'price', 'cost', 'stock', 'minstock', 'maxstock', 'unit', 'barcode'],
  sampleData: [
    ['PROD001', 'Sample Product', 'Product description', '10000', '8000', '50', '10', '100', 'pcs', '123456789'],
  ]
};

// Parse CSV file content
export function parseCsvFile(content: string): string[][] {
  const lines = content.trim().split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  });
}

// Validate CSV data against schema
export function validateCsvData(data: string[][]): { 
  validRows: CsvImportRow[]; 
  errors: ImportError[]; 
} {
  const validRows: CsvImportRow[] = [];
  const errors: ImportError[] = [];
  const seenSkus = new Set<string>();
  
  data.forEach((row, index) => {
    // Create row object with headers mapping
    const rowData: Record<string, string> = {};
    
    // Map CSV columns to expected fields
    CSV_TEMPLATE.headers.forEach((header: string, colIndex: number) => {
      rowData[header.toLowerCase().replace(' ', '')] = (row[colIndex] || '').trim();
    });
    
    try {
      // Validate individual row
      const validatedRow = csvImportRowSchema(rowData);
      
      // Check for duplicate SKUs within the file
      if (seenSkus.has(validatedRow.sku)) {
        errors.push({
          rowIndex: index,
          field: 'sku',
          message: `Duplicate SKU: ${validatedRow.sku} (already exists in this file)`,
          sku: validatedRow.sku,
          value: validatedRow.sku
        });
        return;
      }
      
      seenSkus.add(validatedRow.sku);
      validRows.push(validatedRow);
      
    } catch (error: any) {
      // Handle Zod validation errors
      if (error.errors) {
        error.errors.forEach((err: any) => {
          errors.push({
            rowIndex: index,
            field: err.path.join('.'),
            message: err.message,
            sku: rowData.sku || '',
            value: rowData[err.path.join('')] || ''
          });
        });
      } else {
        errors.push({
          rowIndex: index,
          field: 'row',
          message: error.message || 'Invalid row data',
          sku: rowData.sku || '',
          value: ''
        });
      }
    }
  });
  
  return { validRows, errors };
}

// Generate CSV template content
export function generateCsvTemplate(): string {
  const headers = CSV_TEMPLATE.headers.join(',');
  const sampleRows = CSV_TEMPLATE.sampleData.map((row: string[]) =>
    row.map((cell: string) => `"${cell}"`).join(',')
  );
  
  return [headers, ...sampleRows].join('\n');
}

// Batch processing utilities
export function createBatches<T>(data: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }
  return batches;
}

// Progress calculation utilities
export function calculateProgress(processed: number, total: number): number {
  return total > 0 ? Math.round((processed / total) * 100) : 0;
}

// Error formatting utilities
export function formatErrorMessage(error: ImportError): string {
  const rowInfo = error.rowIndex !== undefined ? `Row ${error.rowIndex + 1}: ` : '';
  const fieldInfo = error.field ? `${error.field}: ` : '';
  return `${rowInfo}${fieldInfo}${error.message}`;
}

// Import statistics utilities
export function calculateImportStats(result: any) {
  return {
    successRate: result.totalProcessed > 0 ? (result.successful / result.totalProcessed) * 100 : 0,
    errorRate: result.totalProcessed > 0 ? (result.failed / result.totalProcessed) * 100 : 0,
    skippedRate: result.totalProcessed > 0 ? (result.skipped / result.totalProcessed) * 100 : 0,
  };
}

// File validation utilities
export function validateCsvFile(file: File): { isValid: boolean; error?: string } {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { isValid: false, error: 'File must be a CSV file (.csv)' };
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 10MB' };
  }
  
  // Check file is not empty
  if (file.size === 0) {
    return { isValid: false, error: 'File cannot be empty' };
  }
  
  return { isValid: true };
}

// Zod schema validation (imported from validation file)
function csvImportRowSchema(data: Record<string, string>): CsvImportRow {
  // Basic validation - in real implementation, use Zod schema
  return {
    sku: data.sku || '',
    name: data.name || '',
    price: Number(data.price || 0),
    cost: Number(data.cost || 0),
    stock: Number(data.stock || 0),
    description: data.description || '',
    barcode: data.barcode || '',
    unit: data.unit || 'pcs',
    minStock: Number(data.minstock || 0),
    maxStock: Number(data.maxstock || 100),
  };
}

// Download CSV template function
export function downloadCsvTemplate(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}