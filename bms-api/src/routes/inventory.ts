import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { websocketEventEmitter, createInventoryUpdatedEvent, createLowStockAlertEvent } from '../websocket/events';

const router = Router();
const prisma = new PrismaClient();

const stockAdjustmentSchema = z.object({
  productId: z.string(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.number().positive(),
  notes: z.string().optional(),
  reference: z.string().optional()
});

const bulkStockAdjustmentSchema = z.object({
  adjustments: z.array(stockAdjustmentSchema),
  notes: z.string().optional()
});

// Get inventory overview with stock levels
router.get('/overview', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      branchId,
      categoryId,
      lowStock = 'false',
      page = 1, 
      limit = 10 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {
      isActive: true
    };

    // Branch filter
    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    // Category filter
    if (categoryId) {
      where.categoryId = String(categoryId);
    }

    // Low stock filter
    if (lowStock === 'true') {
      where.OR = [
        { stock: { lte: 0 } },
        { AND: [{ minStock: { gt: 0 } }, { stock: { lte: prisma.product.fields.minStock } }] }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          category: { select: { id: true, name: true, code: true } },
          branch: { select: { id: true, name: true } },
          inventoryLogs: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              type: true,
              quantity: true,
              notes: true,
              createdAt: true
            }
          }
        },
        orderBy: [
          { stock: 'asc' },
          { name: 'asc' }
        ]
      }),
      prisma.product.count({ where })
    ]);

    // Calculate stock status for each product
    const inventoryData = products.map(product => {
      let status = 'IN_STOCK';
      if (product.stock <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (product.minStock > 0 && product.stock <= product.minStock) {
        status = 'LOW_STOCK';
      } else if (product.maxStock > 0 && product.stock >= product.maxStock) {
        status = 'OVERSTOCK';
      }

      return {
        ...product,
        stockStatus: status,
        stockValue: Number(product.stock) * Number(product.cost),
        potentialLoss: product.stock <= product.minStock ? 
          (Number(product.minStock) - product.stock) * Number(product.cost) : 0
      };
    });

    res.json({
      success: true,
      data: {
        inventory: inventoryData,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        },
        summary: {
          totalProducts: total,
          outOfStock: inventoryData.filter(p => p.stockStatus === 'OUT_OF_STOCK').length,
          lowStock: inventoryData.filter(p => p.stockStatus === 'LOW_STOCK').length,
          overstock: inventoryData.filter(p => p.stockStatus === 'OVERSTOCK').length,
          totalInventoryValue: inventoryData.reduce((sum, p) => sum + p.stockValue, 0)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching inventory overview:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory overview' });
  }
});

// Get inventory logs with pagination
router.get('/logs', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      productId,
      type,
      startDate,
      endDate,
      page = 1, 
      limit = 20 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    // Product filter
    if (productId) {
      where.productId = String(productId);
    } else {
      // If no specific product, show logs for products in user's branch
      if (req.user!.role === 'STAFF') {
        where.product = {
          branchId: req.user!.branchId
        };
      }
    }

    // Type filter
    if (type) {
      where.type = String(type);
    }

    // Date range filter
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
    }

    const [logs, total] = await Promise.all([
      prisma.inventoryLog.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              branchId: true,
              branch: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.inventoryLog.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching inventory logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory logs' });
  }
});

// Adjust stock for a single product
router.post('/adjust', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const data = stockAdjustmentSchema.parse(req.body);

    // Check if product exists and user has permission
    const product = await prisma.product.findUnique({
      where: { id: data.productId }
    });

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found' 
      });
    }

    // Check permission - staff can only adjust stock in their branch
    if (req.user!.role === 'STAFF' && product.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Calculate new stock level
    let newStock = product.stock;
    switch (data.type) {
      case 'IN':
        newStock += data.quantity;
        break;
      case 'OUT':
        newStock -= data.quantity;
        if (newStock < 0) {
          return res.status(400).json({ 
            success: false, 
            error: 'Insufficient stock for this adjustment' 
          });
        }
        break;
      case 'ADJUSTMENT':
        newStock = data.quantity;
        break;
    }

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update product stock
      const updatedProduct = await tx.product.update({
        where: { id: data.productId },
        data: {
          stock: newStock,
          updatedAt: new Date()
        },
        include: {
          category: { select: { name: true } },
          branch: { select: { name: true } }
        }
      });

      // Create inventory log
      const log = await tx.inventoryLog.create({
        data: {
          productId: data.productId,
          type: data.type,
          quantity: data.quantity,
          reference: data.reference,
          notes: data.notes
        }
      });

      return { product: updatedProduct, log };
    });

    // Emit real-time inventory updated event
    try {
      const event = createInventoryUpdatedEvent(
        result.product,
        product.stock,
        data.type === 'IN' ? data.quantity : data.type === 'OUT' ? -data.quantity : newStock - product.stock,
        data.type,
        data.reference || 'Stock adjustment',
        result.product.branchId,
        req.user!.id,
        req.user!.email || 'Unknown User'
      );
      websocketEventEmitter.emit(event);
      console.log(`📡 Emitted inventory:updated event for product ${result.product.sku}`);

      // Check for low stock alert
      if (result.product.minStock > 0 && result.product.stock <= result.product.minStock) {
        const lowStockEvent = createLowStockAlertEvent(result.product, result.product.branchId);
        websocketEventEmitter.emit(lowStockEvent);
        console.log(`📡 Emitted low-stock:alert event for product ${result.product.sku}`);
      }
    } catch (error) {
      console.error('Failed to emit inventory events:', error);
    }

    res.json({
      success: true,
      data: result,
      message: `Stock ${data.type.toLowerCase()} adjustment completed`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error adjusting stock:', error);
    res.status(500).json({ success: false, error: 'Failed to adjust stock' });
  }
});

// Bulk stock adjustment
router.post('/adjust/bulk', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const data = bulkStockAdjustmentSchema.parse(req.body);

    // Check permission - only admin and manager can do bulk adjustments
    if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators and managers can perform bulk stock adjustments' 
      });
    }

    // Validate all products exist
    const productIds = data.adjustments.map(adj => adj.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'One or more products not found' 
      });
    }

    // Use transaction for bulk operation
    const result = await prisma.$transaction(async (tx) => {
      const adjustments = [];
      const logs = [];

      for (const adjustment of data.adjustments) {
        const product = products.find(p => p.id === adjustment.productId)!;
        
        // Calculate new stock
        let newStock = product.stock;
        switch (adjustment.type) {
          case 'IN':
            newStock += adjustment.quantity;
            break;
          case 'OUT':
            newStock -= adjustment.quantity;
            if (newStock < 0) {
              throw new Error(`Insufficient stock for product ${product.name}`);
            }
            break;
          case 'ADJUSTMENT':
            newStock = adjustment.quantity;
            break;
        }

        // Update product
        const updatedProduct = await tx.product.update({
          where: { id: adjustment.productId },
          data: { 
            stock: newStock,
            updatedAt: new Date()
          }
        });

        // Create log
        const log = await tx.inventoryLog.create({
          data: {
            productId: adjustment.productId,
            type: adjustment.type,
            quantity: adjustment.quantity,
            reference: adjustment.reference || 'Bulk Adjustment',
            notes: adjustment.notes || data.notes
          }
        });

        adjustments.push(updatedProduct);
        logs.push(log);
      }

      return { adjustments, logs };
    });

    res.json({ 
      success: true, 
      data: result,
      message: `Bulk stock adjustment completed for ${data.adjustments.length} products` 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error in bulk stock adjustment:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to perform bulk stock adjustment' 
    });
  }
});

// Get stock movement analytics
router.get('/analytics', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      branchId,
      startDate,
      endDate,
      period = '30' // days
    } = req.query;

    const where: any = {};
    
    // Date range
    const days = Number(period);
    const end = endDate ? new Date(String(endDate)) : new Date();
    const start = startDate ? new Date(String(startDate)) : new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
    
    where.createdAt = {
      gte: start,
      lte: end
    };

    // Branch filter
    if (branchId) {
      where.product = { branchId: String(branchId) };
    } else if (req.user!.role === 'STAFF') {
      where.product = { branchId: req.user!.branchId };
    }

    const [
      totalMovements,
      movementsByType,
      topMovingProducts,
      stockValue,
      lowStockCount
    ] = await Promise.all([
      prisma.inventoryLog.count({ where }),
      prisma.inventoryLog.groupBy({
        by: ['type'],
        where,
        _sum: { quantity: true },
        _count: { type: true }
      }),
      prisma.inventoryLog.groupBy({
        by: ['productId'],
        where,
        _sum: { quantity: true },
        _count: { productId: true },
        orderBy: { _count: { productId: 'desc' } },
        take: 10
      }),
      prisma.product.aggregate({
        where: branchId ? { branchId: String(branchId) } : req.user!.role === 'STAFF' ? { branchId: req.user!.branchId } : {},
        _sum: { 
          stock: true,
          cost: true 
        }
      }),
      prisma.product.count({
        where: {
          ...(branchId ? { branchId: String(branchId) } : req.user!.role === 'STAFF' ? { branchId: req.user!.branchId } : {}),
          isActive: true,
          OR: [
            { stock: { lte: 0 } },
            { AND: [{ minStock: { gt: 0 } }, { stock: { lte: prisma.product.fields.minStock } }] }
          ]
        }
      })
    ]);

    // Get product details for top moving products
    const topProductsWithDetails = await Promise.all(
      topMovingProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, sku: true, stock: true }
        });
        return { ...item, product };
      })
    );

    res.json({
      success: true,
      data: {
        period: { start, end, days },
        overview: {
          totalMovements,
          stockValue: Number(stockValue._sum.stock || 0) * Number(stockValue._sum.cost || 0),
          lowStockCount
        },
        movementsByType: movementsByType.reduce((acc, item) => {
          acc[item.type] = {
            count: item._count.type,
            totalQuantity: item._sum.quantity || 0
          };
          return acc;
        }, {} as Record<string, { count: number; totalQuantity: number }>),
        topMovingProducts: topProductsWithDetails
      }
    });
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory analytics' });
  }
});

// Get products with low stock
router.get('/low-stock', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { branchId } = req.query;
    
    const where: any = {
      isActive: true,
      OR: [
        { stock: { lte: 0 } },
        { AND: [{ minStock: { gt: 0 } }, { stock: { lte: prisma.product.fields.minStock } }] }
      ]
    };

    // Branch filter
    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    const lowStockProducts = await prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        branch: { select: { name: true } }
      },
      orderBy: { stock: 'asc' }
    });

    res.json({
      success: true,
      data: {
        lowStockProducts: lowStockProducts.map(product => ({
          ...product,
          stockValue: Number(product.stock) * Number(product.cost),
          urgency: product.stock <= 0 ? 'CRITICAL' : 'WARNING'
        })),
        summary: {
          total: lowStockProducts.length,
          critical: lowStockProducts.filter(p => p.stock <= 0).length,
          warning: lowStockProducts.filter(p => p.stock > 0 && p.stock <= p.minStock).length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch low stock products' });
  }
});

export { router as inventoryRouter };