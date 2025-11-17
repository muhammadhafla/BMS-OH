import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
// import { generateCsvTemplate, createBatches } from '../../../bms-web/src/lib/utils/csv';
// import { csvImportRowSchema, CsvImportRow, ImportError } from '../../../bms-web/src/lib/validations/csv-import';

// Temporary definitions since imports are from outside rootDir
function generateCsvTemplate(): string {
  const headers = ['sku', 'name', 'description', 'price', 'cost', 'stock', 'minstock', 'maxstock', 'unit', 'barcode'];
  const sampleRows = [
    ['PROD001', 'Sample Product', 'Product description', '10000', '8000', '50', '10', '100', 'pcs', '123456789'],
  ];
  return [headers.join(','), ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
}

function createBatches<T>(data: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }
  return batches;
}

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

// Mock Zod schema for validation
const csvImportRowSchema = {
  parse: (data: any): CsvImportRow => {
    if (!data.sku || !data.name) {
      throw new Error('SKU and name are required');
    }
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
} as any; // Cast to any to satisfy Zod type requirements

const router = Router();
const prisma = new PrismaClient();

const csvImportSchema = z.object({
  data: z.array(csvImportRowSchema),
  batchSize: z.number().min(1).max(1000).default(50),
  skipDuplicates: z.boolean().default(true),
  updateExisting: z.boolean().default(false)
});

// const importStatusSchema = z.object({
//   importId: z.string(),
//   batchIndex: z.number().optional(),
//   status: z.enum(['processing', 'completed', 'failed']),
//   processed: z.number().default(0),
//   successful: z.number().default(0),
//   failed: z.number().default(0),
//   errors: z.array(z.object({
//     rowIndex: z.number(),
//     field: z.string(),
//     message: z.string(),
//     sku: z.string().optional(),
//     value: z.string().optional()
//   })).default([]),
//   startedAt: z.string(),
//   completedAt: z.string().optional()
// });

// In-memory storage for import status (in production, use Redis or database)
const importStatuses = new Map<string, any>();

// GET /api/products/sample-csv - Download CSV template
router.get('/sample-csv', authenticate, async (_req: AuthenticatedRequest, res) => {
  try {
    const csvContent = generateCsvTemplate();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="product-import-template.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error generating sample CSV:', error);
    res.status(500).json({ success: false, error: 'Failed to generate sample CSV' });
  }
});

// POST /api/products/import-csv - Import products from CSV
router.post('/import-csv', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const data = csvImportSchema.parse(req.body);
    const importId = Date.now().toString();
    
    // Initialize import status
    const importStatus = {
      id: importId,
      total: data.data.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      status: 'processing',
      currentBatch: 0,
      totalBatches: Math.ceil(data.data.length / data.batchSize),
      errors: [],
      startedAt: new Date().toISOString()
    };
    
    importStatuses.set(importId, importStatus);
    
    // Start async processing
    processImportAsync(importId, data.data, data.batchSize, data.skipDuplicates, data.updateExisting);
    
    res.json({
      success: true,
      data: {
        importId,
        totalItems: data.data.length,
        estimatedDuration: Math.ceil(data.data.length / 10), // Rough estimate in seconds
        message: 'Import started successfully'
      }
    });
    
    return;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: error.errors
      });
    }
    console.error('Error starting CSV import:', error);
    res.status(500).json({ success: false, error: 'Failed to start CSV import' });
  }
});

// GET /api/products/import-status/:importId - Get import progress
router.get('/import-status/:importId', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { importId } = req.params;
    const status = importStatuses.get(importId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Import not found'
      });
    }
    
    res.json({
      success: true,
      data: status
    });
    
    return;
  } catch (error) {
    console.error('Error fetching import status:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch import status' });
  }
});

// GET /api/products/imports/history - Get import history
router.get('/imports/history', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      status,
      startDate,
      endDate
    } = req.query;

    // In a real implementation, this would query a database table
    // For now, we'll return mock data
    const allImports = Array.from(importStatuses.values());
    
    // Apply filters
    let filteredImports = allImports;
    if (status) {
      filteredImports = filteredImports.filter(imp => imp.status === status);
    }
    
    if (startDate && endDate) {
      const start = new Date(String(startDate));
      const end = new Date(String(endDate));
      filteredImports = filteredImports.filter(imp => {
        const impDate = new Date(imp.startedAt);
        return impDate >= start && impDate <= end;
      });
    }
    
    // Sort by startedAt desc
    filteredImports.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const paginatedImports = filteredImports.slice(skip, skip + Number(limit));
    
    res.json({
      success: true,
      data: {
        imports: paginatedImports,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: filteredImports.length,
          pages: Math.ceil(filteredImports.length / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching import history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch import history' });
  }
});

// POST /api/products/import-csv/upload - Handle CSV file upload
router.post('/import-csv/upload', authenticate, async (_req: AuthenticatedRequest, res) => {
  try {
    // This endpoint would handle file uploads in a real implementation
    // For now, we'll return an error indicating this is a placeholder
    res.status(501).json({
      success: false,
      error: 'File upload endpoint not yet implemented. Please send data as JSON array.'
    });
    return;
  } catch (error) {
    console.error('Error handling file upload:', error);
    res.status(500).json({ success: false, error: 'Failed to handle file upload' });
  }
});

// POST /api/products/import/:importId/retry - Retry failed imports
router.post('/import/:importId/retry', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { importId } = req.params;
    const { data } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Failed import data array is required'
      });
    }
    
    const originalStatus = importStatuses.get(importId);
    if (!originalStatus) {
      return res.status(404).json({
        success: false,
        error: 'Original import not found'
      });
    }
    
    // Create new import for retry
    const retryImportId = `${importId}-retry-${Date.now()}`;
    const retryStatus = {
      id: retryImportId,
      total: data.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      status: 'processing',
      currentBatch: 0,
      totalBatches: Math.ceil(data.length / 50),
      errors: [],
      startedAt: new Date().toISOString(),
      isRetry: true,
      originalImportId: importId
    };
    
    importStatuses.set(retryImportId, retryStatus);
    
    // Start retry processing
    processImportAsync(retryImportId, data, 50, true, false);
    
    res.json({
      success: true,
      data: {
        retryImportId,
        totalItems: data.length,
        message: 'Retry import started successfully'
      }
    });
    
    return;
  } catch (error) {
    console.error('Error retrying import:', error);
    res.status(500).json({ success: false, error: 'Failed to start retry import' });
  }
});

// Async import processing function
async function processImportAsync(
  importId: string, 
  data: CsvImportRow[], 
  batchSize: number, 
  skipDuplicates: boolean, 
  updateExisting: boolean
) {
  const status = importStatuses.get(importId);
  if (!status) return;
  
  try {
    const batches = createBatches(data, batchSize);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      status.currentBatch = batchIndex + 1;
      status.totalBatches = batches.length;
      importStatuses.set(importId, status);
      
      // Process batch
      for (let itemIndex = 0; itemIndex < batch.length; itemIndex++) {
        const item = batch[itemIndex];
        const globalIndex = (batchIndex * batchSize) + itemIndex;
        
        try {
          await processSingleItem(importId, item, skipDuplicates, updateExisting);
        } catch (error) {
          const importError: ImportError = {
            rowIndex: globalIndex,
            field: 'row',
            message: error instanceof Error ? error.message : 'Unknown error',
            sku: item.sku,
            value: ''
          };
          
          status.errors.push(importError);
          status.failed++;
        } finally {
          status.processed++;
          importStatuses.set(importId, status);
        }
      }
    }
    
    // Mark as completed
    status.status = 'completed';
    status.completedAt = new Date().toISOString();
    importStatuses.set(importId, status);
    
  } catch (error) {
    console.error(`Error in import ${importId}:`, error);
    status.status = 'failed';
    status.completedAt = new Date().toISOString();
    importStatuses.set(importId, status);
  }
}

// Process single product item
async function processSingleItem(
  importId: string, 
  item: CsvImportRow, 
  // globalIndex: number, 
  skipDuplicates: boolean, 
  updateExisting: boolean
) {
  const status = importStatuses.get(importId);
  if (!status) return;
  
  try {
    // Check for existing product with same SKU
    const existingProduct = await prisma.product.findUnique({
      where: { sku: item.sku }
    });
    
    if (existingProduct) {
      if (updateExisting) {
        // Update existing product
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            name: item.name,
            description: item.description,
            price: item.price,
            cost: item.cost,
            stock: item.stock,
            minStock: item.minStock,
            maxStock: item.maxStock,
            unit: item.unit,
            barcode: item.barcode,
            updatedAt: new Date()
          }
        });
      } else if (skipDuplicates) {
        status.skipped++;
        return;
      } else {
        throw new Error(`Product with SKU ${item.sku} already exists`);
      }
    } else {
      // Create new product
      await prisma.product.create({
        data: {
          sku: item.sku,
          name: item.name,
          description: item.description,
          price: item.price,
          cost: item.cost,
          stock: item.stock,
          minStock: item.minStock,
          maxStock: item.maxStock,
          unit: item.unit,
          barcode: item.barcode,
          isActive: true,
          createdBy: 'import-system', // Required field
          // These would need to be set based on your business logic
          categoryId: 'default-category', // Replace with actual category ID
          branchId: 'default-branch', // Replace with actual branch ID
        }
      });
    }
    
    status.successful++;
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new Error(`Duplicate SKU: ${item.sku}`);
    }
    throw error;
  }
}

export { router as productImportRouter };