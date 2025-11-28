import { Router } from 'express';
import { PrismaClient, TransferStatus } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const createTransferSchema = z.object({
  fromBranchId: z.string(),
  toBranchId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    unitCost: z.number().min(0),
    notes: z.string().optional()
  })),
  notes: z.string().optional()
});

const updateTransferStatusSchema = z.object({
  status: z.nativeEnum(TransferStatus),
  notes: z.string().optional()
});

const updateReceivedQuantitySchema = z.object({
  items: z.array(z.object({
    itemId: z.string(),
    receivedQuantity: z.number().min(0)
  }))
});

// Get all inter-branch transfers with pagination and filtering
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status,
      fromBranchId,
      toBranchId,
      startDate,
      endDate
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    // Branch filter - staff can only see transfers involving their branch
    if (req.user!.role === 'STAFF') {
      where.OR = [
        { fromBranchId: req.user!.branchId },
        { toBranchId: req.user!.branchId }
      ];
    } else {
      if (fromBranchId) where.fromBranchId = String(fromBranchId);
      if (toBranchId) where.toBranchId = String(toBranchId);
    }

    // Status filter
    if (status) {
      where.status = String(status);
    }

    // Date range filter
    if (startDate && endDate) {
      where.requestedAt = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
    }

    const [transfers, total] = await Promise.all([
      prisma.interBranchTransfer.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          fromBranch: { select: { id: true, name: true } },
          toBranch: { select: { id: true, name: true } },
          requester: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
          shipper: { select: { id: true, name: true, email: true } },
          receiver: { select: { id: true, name: true, email: true } },
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
        orderBy: { requestedAt: 'desc' }
      }),
      prisma.interBranchTransfer.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        transfers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching inter-branch transfers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inter-branch transfers' });
  }
});

// Get inter-branch transfer by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    const transfer = await prisma.interBranchTransfer.findUnique({
      where: { id },
      include: {
        fromBranch: { select: { id: true, name: true } },
        toBranch: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
        shipper: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                cost: true,
                stock: true
              }
            }
          }
        }
      }
    });

    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Inter-branch transfer not found' });
    }

    // Check permission - staff can only access transfers involving their branch
    if (req.user!.role === 'STAFF') {
      const hasAccess = transfer.fromBranchId === req.user!.branchId || 
                       transfer.toBranchId === req.user!.branchId;
      if (!hasAccess) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    res.json({ success: true, data: { transfer } });
    return;
  } catch (error) {
    console.error('Error fetching inter-branch transfer:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inter-branch transfer' });
    return;
  }
});

// Create new inter-branch transfer
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const data = createTransferSchema.parse(req.body);

    // Check permission - staff can only create transfers from their branch
    if (req.user!.role === 'STAFF' && data.fromBranchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Staff can only create transfers from their branch' 
      });
    }

    // Generate transfer code
    const transferCount = await prisma.interBranchTransfer.count({
      where: {
        requestedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    });
    const transferCode = `TRF-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(transferCount + 1).padStart(4, '0')}`;

    // Validate all products exist and have sufficient stock
    const productIds = data.items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { 
        id: { in: productIds },
        branchId: data.fromBranchId
      }
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'One or more products not found in source branch' 
      });
    }

    // Check stock availability
    for (const item of data.items) {
      const product = products.find(p => p.id === item.productId);
      if (product && product.stock < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
        });
      }
    }

    // Calculate total amount
    const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

    // Use transaction for data consistency
    const transfer = await prisma.$transaction(async (tx) => {
      const newTransfer = await tx.interBranchTransfer.create({
        data: {
          transferCode,
          fromBranchId: data.fromBranchId,
          toBranchId: data.toBranchId,
          status: 'PENDING',
          totalAmount,
          notes: data.notes,
          requestedBy: req.user!.id
        }
      });

      // Create transfer items
      const transferItems = await Promise.all(
        data.items.map(item => 
          tx.interBranchTransferItem.create({
            data: {
              transferId: newTransfer.id,
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.quantity * item.unitCost,
              status: 'PENDING'
            }
          })
        )
      );

      return { transfer: newTransfer, items: transferItems };
    });

    res.status(201).json({
      success: true,
      data: transfer,
      message: 'Inter-branch transfer created successfully'
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
    console.error('Error creating inter-branch transfer:', error);
    res.status(500).json({ success: false, error: 'Failed to create inter-branch transfer' });
    return;
  }
});

// Update transfer status
router.patch('/:id/status', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateTransferStatusSchema.parse(req.body);

    const transfer = await prisma.interBranchTransfer.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Inter-branch transfer not found' });
    }

    // Check permission based on status change
    const canUpdateStatus = (() => {
      switch (data.status) {
        case 'APPROVED':
          return ['ADMIN', 'MANAGER'].includes(req.user!.role);
        case 'SHIPPED':
          return req.user!.role === 'ADMIN' || req.user!.role === 'MANAGER' || 
                 (req.user!.role === 'STAFF' && transfer.fromBranchId === req.user!.branchId);
        case 'RECEIVED':
          return req.user!.role === 'ADMIN' || req.user!.role === 'MANAGER' || 
                 (req.user!.role === 'STAFF' && transfer.toBranchId === req.user!.branchId);
        default:
          return false;
      }
    })();

    if (!canUpdateStatus) {
      return res.status(403).json({ success: false, error: 'Access denied for this status change' });
    }

    // Update transfer with status-specific fields
    const updateData: any = {
      status: data.status,
      notes: data.notes
    };

    const currentTime = new Date();
    switch (data.status) {
      case 'APPROVED':
        updateData.approvedAt = currentTime;
        updateData.approvedBy = req.user!.id;
        break;
      case 'SHIPPED':
        updateData.shippedAt = currentTime;
        updateData.shippedBy = req.user!.id;
        // Update item statuses
        await prisma.interBranchTransferItem.updateMany({
          where: { transferId: id },
          data: { status: 'SHIPPED' }
        });
        break;
      case 'RECEIVED':
        updateData.receivedAt = currentTime;
        updateData.receivedBy = req.user!.id;
        // Update item statuses
        await prisma.interBranchTransferItem.updateMany({
          where: { transferId: id },
          data: { status: 'RECEIVED' }
        });
        break;
    }

    const updatedTransfer = await prisma.interBranchTransfer.update({
      where: { id },
      data: updateData,
      include: {
        fromBranch: { select: { id: true, name: true } },
        toBranch: { select: { id: true, name: true } },
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
      data: { transfer: updatedTransfer },
      message: `Transfer status updated to ${data.status.toLowerCase()}`
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
    console.error('Error updating transfer status:', error);
    res.status(500).json({ success: false, error: 'Failed to update transfer status' });
    return;
  }
});

// Update received quantities (for RECEIVED status)
router.patch('/:id/receive', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateReceivedQuantitySchema.parse(req.body);

    const transfer = await prisma.interBranchTransfer.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Inter-branch transfer not found' });
    }

    // Check permission - only receiving branch can update received quantities
    if (req.user!.role === 'STAFF' && transfer.toBranchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only receiving branch can update received quantities' 
      });
    }

    if (transfer.status !== 'SHIPPED' && transfer.status !== 'RECEIVED') {
      return res.status(400).json({ 
        success: false, 
        error: 'Can only update received quantities for shipped or received transfers' 
      });
    }

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      const updatedItems = [];

      for (const item of data.items) {
        const transferItem = transfer.items.find(i => i.id === item.itemId);
        if (!transferItem) {
          throw new Error(`Transfer item ${item.itemId} not found`);
        }

        if (item.receivedQuantity > transferItem.quantity) {
          throw new Error(`Received quantity cannot exceed sent quantity for item ${transferItem.productId}`);
        }

        // Update received quantity
        const updatedItem = await tx.interBranchTransferItem.update({
          where: { id: item.itemId },
          data: { receivedQuantity: item.receivedQuantity }
        });

        updatedItems.push(updatedItem);
      }

      // Update overall transfer status if all items are fully received
      const allFullyReceived = data.items.every(item => {
        const transferItem = transfer.items.find(i => i.id === item.itemId);
        return transferItem && item.receivedQuantity === transferItem.quantity;
      });

      if (allFullyReceived && transfer.status === 'SHIPPED') {
        await tx.interBranchTransfer.update({
          where: { id },
          data: { 
            status: 'RECEIVED',
            receivedAt: new Date(),
            receivedBy: req.user!.id
          }
        });
      }

      return updatedItems;
    });

    res.json({
      success: true,
      data: { updatedItems: result },
      message: 'Received quantities updated successfully'
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
    console.error('Error updating received quantities:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update received quantities' 
    });
    return;
  }
});

// Get transfer statistics
router.get('/stats/overview', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { branchId, period = '30' } = req.query;

    const where: any = {};
    
    // Date range
    const days = Number(period);
    const end = new Date();
    const start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
    
    where.requestedAt = {
      gte: start,
      lte: end
    };

    // Branch filter
    if (branchId) {
      where.OR = [
        { fromBranchId: String(branchId) },
        { toBranchId: String(branchId) }
      ];
    } else if (req.user!.role === 'STAFF') {
      where.OR = [
        { fromBranchId: req.user!.branchId },
        { toBranchId: req.user!.branchId }
      ];
    }

    const [
      totalTransfers,
      pendingTransfers,
      completedTransfers,
      transfersByStatus,
      averageTransferValue
    ] = await Promise.all([
      prisma.interBranchTransfer.count({ where }),
      prisma.interBranchTransfer.count({ where: { ...where, status: 'PENDING' } }),
      prisma.interBranchTransfer.count({ where: { ...where, status: 'RECEIVED' } }),
      prisma.interBranchTransfer.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
        _sum: { totalAmount: true }
      }),
      prisma.interBranchTransfer.aggregate({
        where,
        _avg: { totalAmount: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        period: { start, end, days },
        overview: {
          totalTransfers,
          pendingTransfers,
          completedTransfers,
          averageTransferValue: averageTransferValue._avg.totalAmount || 0
        },
        transfersByStatus: transfersByStatus.reduce((acc, item) => {
          acc[item.status] = {
            count: item._count.status,
            totalValue: Number(item._sum.totalAmount || 0)
          };
          return acc;
        }, {} as Record<string, { count: number; totalValue: number }>)
      }
    });
  } catch (error) {
    console.error('Error fetching transfer statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transfer statistics' });
  }
});

export { router as interBranchTransfersRouter };