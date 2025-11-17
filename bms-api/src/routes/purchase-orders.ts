import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const purchaseItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  discount: z.number().min(0).default(0),
  total: z.number().positive(),
  receivedQuantity: z.number().int().min(0).default(0),
  status: z.string().default('PENDING')
});

const createPurchaseOrderSchema = z.object({
  supplierId: z.string(),
  orderDate: z.string().datetime(),
  items: z.array(purchaseItemSchema).min(1),
  totalAmount: z.number().positive(),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  finalAmount: z.number().positive(),
  notes: z.string().optional()
});

const receiveItemsSchema = z.object({
  items: z.array(z.object({
    purchaseItemId: z.string(),
    receivedQuantity: z.number().int().positive()
  })).min(1)
});

// Get all purchase orders with pagination and filtering
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      startDate, 
      endDate, 
      status, 
      supplierId,
      branchId,
      search 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    // Date range filter
    if (startDate && endDate) {
      where.orderDate = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
    }

    // Status filter
    if (status) {
      where.status = String(status);
    }

    // Supplier filter
    if (supplierId) {
      where.supplierId = String(supplierId);
    }

    // Branch filter
    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    // Search filter
    if (search) {
      where.OR = [
        { orderCode: { contains: String(search), mode: 'insensitive' } },
        { notes: { contains: String(search), mode: 'insensitive' } },
        { supplier: { name: { contains: String(search), mode: 'insensitive' } } }
      ];
    }

    const [purchaseOrders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          supplier: { 
            select: { 
              id: true, 
              name: true, 
              code: true,
              contact: true,
              phone: true
            } 
          },
          branch: { select: { id: true, name: true } },
          items: {
            include: {
              product: { 
                select: { 
                  id: true, 
                  name: true, 
                  sku: true,
                  unit: true
                } 
              }
            }
          }
        },
        orderBy: { orderDate: 'desc' }
      }),
      prisma.purchaseOrder.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        purchaseOrders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch purchase orders' });
  }
});

// Get purchase order by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: { 
          select: { 
            id: true, 
            name: true, 
            code: true,
            contact: true,
            address: true,
            phone: true,
            email: true
          } 
        },
        branch: { select: { id: true, name: true, address: true } },
        items: {
          include: {
            product: { 
              select: { 
                id: true, 
                name: true, 
                sku: true,
                barcode: true,
                price: true,
                cost: true,
                unit: true
              } 
            }
          }
        }
      }
    });

    if (!purchaseOrder) {
      return res.status(404).json({ success: false, error: 'Purchase order not found' });
    }

    // Check permission - staff can only access purchase orders from their branch
    if (req.user!.role === 'STAFF' && purchaseOrder.branchId !== req.user!.branchId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: { purchaseOrder } });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch purchase order' });
  }
});

// Create new purchase order
router.post('/', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    // Only Admin and Manager can create purchase orders
    if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators and managers can create purchase orders' 
      });
    }

    const data = createPurchaseOrderSchema.parse(req.body);

    // Verify supplier exists and user has access
    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId }
    });

    if (!supplier) {
      return res.status(404).json({ 
        success: false, 
        error: 'Supplier not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'MANAGER' && supplier.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Generate order code
    const orderDate = new Date(data.orderDate);
    const dateStr = orderDate.toISOString().split('T')[0].replace(/-/g, '');
    const count = await prisma.purchaseOrder.count({
      where: {
        orderDate: {
          gte: new Date(orderDate.setHours(0, 0, 0, 0)),
          lt: new Date(orderDate.setHours(23, 59, 59, 999))
        }
      }
    });
    const orderCode = `PO-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create purchase order
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          orderCode,
          orderDate: new Date(data.orderDate),
          totalAmount: data.totalAmount,
          discount: data.discount,
          tax: data.tax,
          finalAmount: data.finalAmount,
          notes: data.notes,
          supplierId: data.supplierId,
          branchId: supplier.branchId,
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              total: item.total,
              receivedQuantity: 0,
              status: 'PENDING'
            }))
          }
        },
        include: {
          supplier: { 
            select: { 
              id: true, 
              name: true, 
              code: true,
              contact: true
            } 
          },
          branch: { select: { id: true, name: true } },
          items: {
            include: {
              product: { 
                select: { 
                  id: true, 
                  name: true, 
                  sku: true,
                  unit: true
                } 
              }
            }
          }
        }
      });

      return purchaseOrder;
    });

    res.status(201).json({ 
      success: true, 
      data: { purchaseOrder: result },
      message: 'Purchase order created successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error creating purchase order:', error);
    res.status(500).json({ success: false, error: 'Failed to create purchase order' });
  }
});

// Update purchase order status
router.patch('/:id/status', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status value' 
      });
    }

    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingOrder) {
      return res.status(404).json({ 
        success: false, 
        error: 'Purchase order not found' 
      });
    }

    // Check permission
    const canUpdate = req.user!.role === 'ADMIN' || 
                     (req.user!.role === 'MANAGER' && existingOrder.branchId === req.user!.branchId);

    if (!canUpdate) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: { 
        status,
        notes: notes || existingOrder.notes,
        updatedAt: new Date()
      },
      include: {
        supplier: { 
          select: { 
            id: true, 
            name: true, 
            code: true,
            contact: true
          } 
        },
        branch: { select: { id: true, name: true } },
        items: {
          include: {
            product: { 
              select: { 
                id: true, 
                name: true, 
                sku: true,
                unit: true
              } 
            }
          }
        }
      }
    });

    res.json({ 
      success: true, 
      data: { purchaseOrder },
      message: `Purchase order status updated to ${status.toLowerCase()}` 
    });
  } catch (error) {
    console.error('Error updating purchase order status:', error);
    res.status(500).json({ success: false, error: 'Failed to update purchase order status' });
  }
});

// Receive items (goods receipt)
router.post('/:id/receive', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const data = receiveItemsSchema.parse(req.body);

    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true, supplier: true, branch: true }
    });

    if (!existingOrder) {
      return res.status(404).json({ 
        success: false, 
        error: 'Purchase order not found' 
      });
    }

    // Check permission
    const canReceive = req.user!.role === 'ADMIN' || 
                      (req.user!.role === 'MANAGER' && existingOrder.branchId === req.user!.branchId) ||
                      (req.user!.role === 'STAFF' && existingOrder.branchId === req.user!.branchId);

    if (!canReceive) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    if (existingOrder.status === 'CANCELLED') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot receive items for cancelled purchase order' 
      });
    }

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      const updatedItems: any[] = [];
      const inventoryLogs = [];

      for (const itemData of data.items) {
        const purchaseItem = existingOrder.items.find(item => item.id === itemData.purchaseItemId);
        
        if (!purchaseItem) {
          throw new Error(`Purchase item ${itemData.purchaseItemId} not found`);
        }

        const newReceivedQuantity = purchaseItem.receivedQuantity + itemData.receivedQuantity;
        
        if (newReceivedQuantity > purchaseItem.quantity) {
          throw new Error(`Cannot receive more than ordered quantity for product ${purchaseItem.productId}`);
        }

        // Update purchase item
        const updatedItem = await tx.purchaseItem.update({
          where: { id: itemData.purchaseItemId },
          data: {
            receivedQuantity: newReceivedQuantity,
            status: newReceivedQuantity >= purchaseItem.quantity ? 'RECEIVED' : 'PARTIALLY_RECEIVED'
          },
          include: {
            product: { 
              select: { 
                id: true, 
                name: true, 
                sku: true,
                unit: true,
                stock: true
              } 
            }
          }
        });

        // Update product stock
        await tx.product.update({
          where: { id: purchaseItem.productId },
          data: { 
            stock: { increment: itemData.receivedQuantity },
            cost: purchaseItem.unitPrice // Update cost to latest purchase price
          }
        });

        // Create inventory log
        const log = await tx.inventoryLog.create({
          data: {
            productId: purchaseItem.productId,
            type: 'IN',
            quantity: itemData.receivedQuantity,
            reference: `PO ${existingOrder.orderCode}`,
            notes: `Goods receipt from purchase order`
          }
        });

        updatedItems.push(updatedItem);
        inventoryLogs.push(log);
      }

      // Check if all items are fully received
      const allItemsReceived = existingOrder.items.every(item => {
        const updatedItem = updatedItems.find(ui => ui.id === item.id);
        return updatedItem ? updatedItem.receivedQuantity >= item.quantity : item.receivedQuantity >= item.quantity;
      });

      // Update purchase order status if all items received
      if (allItemsReceived && existingOrder.status !== 'RECEIVED') {
        await tx.purchaseOrder.update({
          where: { id },
          data: { status: 'RECEIVED' }
        });
      }

      return { updatedItems, inventoryLogs, allItemsReceived };
    });

    res.json({ 
      success: true, 
      data: result,
      message: 'Items received successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error receiving items:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to receive items' 
    });
  }
});

// Get purchase order statistics
router.get('/stats/summary', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    
    const where: any = {};
    
    if (startDate && endDate) {
      where.orderDate = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
    }

    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    const [
      totalOrders,
      totalValue,
      ordersByStatus,
      topSuppliers,
      pendingOrders,
      receivedOrders
    ] = await Promise.all([
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.aggregate({
        where,
        _sum: { finalAmount: true }
      }),
      prisma.purchaseOrder.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
        _sum: { finalAmount: true }
      }),
      prisma.purchaseOrder.groupBy({
        by: ['supplierId'],
        where,
        _sum: { finalAmount: true },
        _count: { supplierId: true },
        orderBy: { _sum: { finalAmount: 'desc' } },
        take: 5
      }),
      prisma.purchaseOrder.count({ where: { ...where, status: { in: ['PENDING', 'APPROVED'] } } }),
      prisma.purchaseOrder.count({ where: { ...where, status: 'RECEIVED' } })
    ]);

    // Get supplier details for top suppliers
    const topSuppliersWithDetails = await Promise.all(
      topSuppliers.map(async (item) => {
        const supplier = await prisma.supplier.findUnique({
          where: { id: item.supplierId },
          select: { id: true, name: true, code: true }
        });
        return { 
          ...item, 
          supplier,
          totalSpent: item._sum.finalAmount || 0,
          orderCount: item._count.supplierId
        };
      })
    );

    res.json({
      success: true,
      data: {
        overview: {
          totalOrders,
          totalValue: totalValue._sum.finalAmount || 0,
          pendingOrders,
          receivedOrders,
          averageOrderValue: totalOrders > 0 ? Number(totalValue._sum.finalAmount || 0) / totalOrders : 0
        },
        ordersByStatus: ordersByStatus.reduce((acc, item) => {
          acc[item.status] = {
            count: item._count.status,
            value: Number(item._sum.finalAmount || 0)
          };
          return acc;
        }, {} as Record<string, { count: number; value: number }>),
        topSuppliers: topSuppliersWithDetails
      }
    });
  } catch (error) {
    console.error('Error fetching purchase order statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch purchase order statistics' });
  }
});

export { router as purchaseOrdersRouter };