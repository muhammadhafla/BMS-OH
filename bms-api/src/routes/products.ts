import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { websocketEventEmitter } from '../websocket/events';
import { createProductUpdatedEvent } from '../websocket/events';

const router = Router();
const prisma = new PrismaClient();

const productSchema = z.object({
  sku: z.string().min(1),
  barcode: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  cost: z.number().positive(),
  stock: z.number().int().min(0),
  minStock: z.number().int().min(0),
  maxStock: z.number().int().min(0),
  unit: z.string().default('pcs'),
  weight: z.number().optional(),
  dimensions: z.string().optional(),
  categoryId: z.string().optional(),
  branchId: z.string()
});

// Get all products with pagination and search
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      categoryId, 
      branchId,
      isActive = true 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {
      isActive: isActive === 'true'
    };

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { sku: { contains: String(search), mode: 'insensitive' } },
        { barcode: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    if (categoryId) {
      where.categoryId = String(categoryId);
    }

    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          category: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);
      // Get branch filtering info
      let isFilteredByBranch = false;
       let appliedBranchId: string | null | undefined = null;

      if (branchId) {
        appliedBranchId = String(branchId);
        isFilteredByBranch = true;
      } else if (req.user!.role === 'STAFF') {
        appliedBranchId = req.user!.branchId;
        isFilteredByBranch = true;
      }

      // Get total products in database for context
      const totalInDatabase = await prisma.product.count({ 
        where: { isActive: isActive === 'true' } 
      });

      res.json({
        success: true,
        data: {
          products,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          },
          meta: {
            filters: {
              branchId: appliedBranchId,
              isFilteredByBranch,
              userRole: req.user!.role,
              userBranchId: req.user!.branchId
            },
            summary: {
              totalInDatabase,
              returned: total,
              filtered: isFilteredByBranch,
              branchFilteredOut: isFilteredByBranch ? totalInDatabase - total : 0
            }
          }
        }
      });

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// Get product by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        transactionItems: {
          include: {
            transaction: { 
              select: { 
                id: true, 
                transactionCode: true, 
                createdAt: true,
                finalAmount: true 
              } 
            }
          },
          take: 10,
          orderBy: { transaction: { createdAt: 'desc' } }
        },
        inventoryLogs: {
          take: 20,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Check permission - staff can only access products from their branch
    if (req.user!.role === 'STAFF' && product.branchId !== req.user!.branchId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: { product } });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

// Create new product
router.post('/', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const data = productSchema.parse(req.body);
    
    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku: data.sku }
    });

    if (existingProduct) {
      return res.status(400).json({ 
        success: false, 
        error: 'SKU already exists' 
      });
    }

    // Check permission - staff can only create products for their branch
    if (req.user!.role === 'STAFF' && data.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        createdBy: req.user!.id
      },
      include: {
        category: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } }
      }
    });

    // Create inventory log for initial stock
    if (data.stock > 0) {
      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          type: 'IN',
          quantity: data.stock,
          reference: `Initial stock for ${product.sku}`,
          notes: 'Initial product creation'
        }
      });
    }

    // Emit real-time product created event
    try {
      const event = createProductUpdatedEvent(product, 'created', product.branchId, req.user!.id);
      websocketEventEmitter.emit(event);
      console.log(`📡 Emitted product:created event for product ${product.sku}`);
    } catch (error) {
      console.error('Failed to emit product created event:', error);
    }

    res.status(201).json({
      success: true,
      data: { product },
      message: 'Product created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const data = productSchema.partial().parse(req.body);

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'STAFF' && existingProduct.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Check SKU uniqueness if being updated
    if (data.sku && data.sku !== existingProduct.sku) {
      const duplicateSku = await prisma.product.findUnique({
        where: { sku: data.sku }
      });
      
      if (duplicateSku) {
        return res.status(400).json({ 
          success: false, 
          error: 'SKU already exists' 
        });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } }
      }
    });

    // Log inventory changes
    if (data.stock !== undefined && data.stock !== existingProduct.stock) {
      const difference = data.stock - existingProduct.stock;
      await prisma.inventoryLog.create({
        data: {
          productId: id,
          type: difference > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(difference),
          reference: `Stock adjustment for ${product.sku}`,
          notes: `Stock updated from ${existingProduct.stock} to ${data.stock}`
        }
      });
    }

    // Emit real-time product updated event
    try {
      const changes: any = {};
      if (data.name !== undefined) changes.name = data.name;
      if (data.price !== undefined) changes.price = data.price;
      if (data.cost !== undefined) changes.cost = data.cost;
      if (data.stock !== undefined) changes.stock = data.stock;
      if (data.categoryId !== undefined) changes.categoryId = data.categoryId;
      // Note: isActive changes are handled separately

      const event = createProductUpdatedEvent(product, 'updated', product.branchId, req.user!.id, Object.keys(changes).length > 0 ? changes : undefined);
      websocketEventEmitter.emit(event);
      console.log(`📡 Emitted product:updated event for product ${product.sku}`);
    } catch (error) {
      console.error('Failed to emit product updated event:', error);
    }

    res.json({
      success: true,
      data: { product },
      message: 'Product updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// Delete product (soft delete)
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'STAFF' && existingProduct.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Check if product has transactions
    const transactionCount = await prisma.transactionItem.count({
      where: { productId: id }
    });

    if (transactionCount > 0) {
      // Soft delete by setting isActive to false
      const product = await prisma.product.update({
        where: { id },
        data: { isActive: false },
        include: {
          category: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } }
        }
      });

      // Emit real-time product deleted event
      try {
        const event = createProductUpdatedEvent(product, 'deleted', product.branchId, req.user!.id);
        websocketEventEmitter.emit(event);
        console.log(`📡 Emitted product:deleted event for product ${product.sku}`);
      } catch (error) {
        console.error('Failed to emit product deleted event:', error);
      }

      res.json({
        success: true,
        data: { product },
        message: 'Product deactivated (has transaction history)'
      });
    } else {
      // Hard delete if no transactions
      const productToDelete = await prisma.product.findUnique({
        where: { id },
        include: {
          category: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } }
        }
      });

      await prisma.product.delete({
        where: { id }
      });

      // Emit real-time product deleted event
      if (productToDelete) {
        try {
          const event = createProductUpdatedEvent(productToDelete, 'deleted', productToDelete.branchId, req.user!.id);
          websocketEventEmitter.emit(event);
          console.log(`📡 Emitted product:deleted event for product ${productToDelete.sku}`);
        } catch (error) {
          console.error('Failed to emit product deleted event:', error);
        }
      }

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

// Update stock
router.patch('/:id/stock', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const { stock, notes } = req.body;

    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid stock value' 
      });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'STAFF' && existingProduct.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    const difference = stock - existingProduct.stock;

    const product = await prisma.product.update({
      where: { id },
      data: { stock },
      include: {
        category: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } }
      }
    });

    // Create inventory log
    await prisma.inventoryLog.create({
      data: {
        productId: id,
        type: difference > 0 ? 'IN' : difference < 0 ? 'OUT' : 'ADJUSTMENT',
        quantity: Math.abs(difference),
        reference: `Stock update for ${product.sku}`,
        notes: notes || `Stock updated from ${existingProduct.stock} to ${stock}`
      }
    });

    // Emit real-time inventory updated event
    try {
      const { createInventoryUpdatedEvent } = require('../websocket/events');
      const event = createInventoryUpdatedEvent(
        product,
        existingProduct.stock,
        difference,
        difference > 0 ? 'IN' : difference < 0 ? 'OUT' : 'ADJUSTMENT',
        notes || 'Stock update',
        product.branchId,
        req.user!.id,
        req.user!.email || 'Unknown User'
      );
      websocketEventEmitter.emit(event);
      console.log(`📡 Emitted inventory:updated event for product ${product.sku}`);
    } catch (error) {
      console.error('Failed to emit inventory updated event:', error);
    }

    res.json({
      success: true,
      data: { product },
      message: 'Stock updated successfully'
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ success: false, error: 'Failed to update stock' });
  }
});

// CSV Import functionality
router.post('/import-csv', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    // Only Admin and Manager can import products
    if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
      res.status(403).json({
        success: false,
        error: 'Only administrators and managers can import products'
      });
      return;
    }

    const { csvData, branchId } = req.body;

    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'CSV data is required' 
      });
    }

    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Branch ID is required' 
      });
    }

    // Verify branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    });

    if (!branch) {
      return res.status(404).json({ 
        success: false, 
        error: 'Branch not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'MANAGER' && branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Parse CSV data
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'CSV must contain at least a header row and one data row' 
      });
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    // Expected headers
    const requiredHeaders = ['sku', 'name', 'price', 'cost', 'stock'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Missing required columns: ${missingHeaders.join(', ')}` 
      });
    }

    // Process data rows
    const results: {
      success: Array<{ row: number; sku: string; name: string; id: string }>;
      errors: Array<{ row: number; error: string; sku?: string }>;
      total: number;
      created: number;
      skipped: number;
      failed: number;
    } = {
      success: [],
      errors: [],
      total: 0,
      created: 0,
      skipped: 0,
      failed: 0
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      results.total++;
      
      try {
        // Parse CSV line (handle quoted fields)
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        
        // Create object from header and values
        const productData: any = {};
        headers.forEach((header, index) => {
          let value = values[index] || '';
          // Remove quotes if present
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          productData[header] = value;
        });

        // Validate required fields
        if (!productData.sku || !productData.name || !productData.price || !productData.cost || productData.stock === undefined) {
          results.errors.push({
            row: i + 1,
            error: 'Missing required fields: sku, name, price, cost, stock'
          });
          results.failed++;
          continue;
        }

        // Check if SKU already exists
        const existingProduct = await prisma.product.findUnique({
          where: { sku: productData.sku }
        });

        if (existingProduct) {
          results.errors.push({
            row: i + 1,
            error: 'SKU already exists',
            sku: productData.sku
          });
          results.skipped++;
          continue;
        }

        // Parse and validate numbers
        const price = parseFloat(productData.price);
        const cost = parseFloat(productData.cost);
        const stock = parseInt(productData.stock);
        const minStock = productData.minstock ? parseInt(productData.minstock) : 0;
        const maxStock = productData.maxstock ? parseInt(productData.maxstock) : 0;

        if (isNaN(price) || price <= 0) {
          results.errors.push({
            row: i + 1,
            error: 'Invalid price value',
            sku: productData.sku
          });
          results.failed++;
          continue;
        }

        if (isNaN(cost) || cost <= 0) {
          results.errors.push({
            row: i + 1,
            error: 'Invalid cost value',
            sku: productData.sku
          });
          results.failed++;
          continue;
        }

        if (isNaN(stock) || stock < 0) {
          results.errors.push({
            row: i + 1,
            error: 'Invalid stock value',
            sku: productData.sku
          });
          results.failed++;
          continue;
        }

        // Create product data object
        const newProduct = {
          sku: productData.sku,
          name: productData.name,
          price,
          cost,
          stock,
          minStock,
          maxStock,
          unit: productData.unit || 'pcs',
          barcode: productData.barcode || null,
          description: productData.description || null,
          weight: productData.weight ? parseFloat(productData.weight) : null,
          dimensions: productData.dimensions || null,
          branchId,
          createdBy: req.user!.id
        };

        // Create product
        const product = await prisma.product.create({
          data: newProduct
        });

        // Create inventory log for initial stock
        if (stock > 0) {
          await prisma.inventoryLog.create({
            data: {
              productId: product.id,
              type: 'IN',
              quantity: stock,
              reference: `Initial stock for ${product.sku}`,
              notes: 'Initial product creation via CSV import'
            }
          });
        }

        results.success.push({
          row: i + 1,
          sku: product.sku,
          name: product.name,
          id: product.id
        });
        results.created++;

      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        results.failed++;
      }
    }

    res.json({
      success: results.failed === 0,
      data: results,
      message: `Import completed. ${results.created} products created, ${results.skipped} skipped, ${results.failed} failed.`
    });

  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ success: false, error: 'Failed to import products from CSV' });
  }
});

// Download sample CSV template
router.get('/sample-csv', authenticate, async (_req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const sampleData = [
      [
        'sku',
        'name',
        'description',
        'price',
        'cost',
        'stock',
        'minstock',
        'maxstock',
        'unit',
        'barcode',
        'weight',
        'dimensions'
      ],
      [
        'PROD001',
        'Sample Product 1',
        'This is a sample product for testing CSV import',
        '100.00',
        '75.00',
        '10',
        '2',
        '50',
        'pcs',
        '1234567890123',
        '1.5',
        '10x10x10'
      ],
      [
        'PROD002',
        'Sample Product 2',
        'Another sample product',
        '250.00',
        '180.00',
        '5',
        '1',
        '20',
        'kg',
        '1234567890124',
        '2.3',
        '15x15x15'
      ]
    ];

    const csvContent = sampleData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="product-import-template.csv"');
    res.send(csvContent);

  } catch (error) {
    console.error('Error generating sample CSV:', error);
    res.status(500).json({ success: false, error: 'Failed to generate sample CSV' });
  }
});

export { router as productsRouter };