import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const transactionItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  discount: z.number().min(0).default(0),
  total: z.number().positive(),
  branchId: z.string().optional()
});

const createTransactionSchema = z.object({
  items: z.array(transactionItemSchema).min(1),
  totalAmount: z.number().positive(),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  finalAmount: z.number().positive(),
  paymentMethod: z.enum(['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'QRIS']),
  amountPaid: z.number().positive(),
  change: z.number().min(0),
  notes: z.string().optional()
});

// Get all transactions with pagination and filtering
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      startDate, 
      endDate, 
      status, 
      branchId,
      search 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    // Date range filter
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
    }

    // Status filter
    if (status) {
      where.status = String(status);
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
        { transactionCode: { contains: String(search), mode: 'insensitive' } },
        { notes: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          user: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

// Get transaction by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
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
                cost: true 
              } 
            }
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // Check permission - staff can only access transactions from their branch
    if (req.user!.role === 'STAFF' && transaction.branchId !== req.user!.branchId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: { transaction } });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transaction' });
  }
});

// Create new transaction
router.post('/', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const data = createTransactionSchema.parse(req.body);
    
    // Generate transaction code
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const count = await prisma.transaction.count({
      where: {
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999))
        }
      }
    });
    const transactionCode = `TXN-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

    // Verify branch access
    let branchId: string;
    if (req.user!.role === 'STAFF') {
      branchId = req.user!.branchId!;
    } else {
      branchId = data.items[0]?.branchId || req.user!.branchId!;
    }

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          transactionCode,
          totalAmount: data.totalAmount,
          discount: data.discount,
          tax: data.tax,
          finalAmount: data.finalAmount,
          paymentMethod: data.paymentMethod,
          amountPaid: data.amountPaid,
          change: data.change,
          notes: data.notes,
          userId: req.user!.id,
          branchId,
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              total: item.total
            }))
          }
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } }
            }
          },
          user: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true } }
        }
      });

      // Update product stock for each item
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        // Check if sufficient stock
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
        }

        // Update stock
        await tx.product.update({
          where: { id: item.productId },
          data: { 
            stock: product.stock - item.quantity,
            updatedAt: new Date()
          }
        });

        // Create inventory log
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            reference: transactionCode,
            notes: `Sale transaction ${transactionCode}`
          }
        });
      }

      // Create journal entry for accounting
      await tx.journalEntry.create({
        data: {
          entryCode: `JE-${dateStr}-${(count + 1).toString().padStart(4, '0')}`,
          date: new Date(),
          description: `Sales transaction ${transactionCode}`,
          reference: transaction.id,
          total: data.finalAmount,
          branchId,
          journalEntries: {
            create: [
              // Debit Cash/Bank
              {
                description: `Cash from sale ${transactionCode}`,
                debit: data.finalAmount,
                account: {
                  connect: {
                    // This would need to be configured - using first cash account
                    id: (await tx.chartOfAccount.findFirst({
                      where: { 
                        branchId,
                        name: { contains: 'Cash', mode: 'insensitive' }
                      }
                    }))?.id || ''
                  }
                }
              },
              // Credit Sales Revenue
              {
                description: `Sales revenue ${transactionCode}`,
                credit: data.finalAmount,
                account: {
                  connect: {
                    id: (await tx.chartOfAccount.findFirst({
                      where: { 
                        branchId,
                        name: { contains: 'Sales', mode: 'insensitive' }
                      }
                    }))?.id || ''
                  }
                }
              }
            ]
          }
        }
      });

      return transaction;
    });

    res.status(201).json({ 
      success: true, 
      data: { transaction: result },
      message: 'Transaction created successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error creating transaction:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create transaction' 
    });
  }
});

// Update transaction status
router.patch('/:id/status', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status value' 
      });
    }

    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingTransaction) {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'STAFF' && existingTransaction.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Handle stock reversal for cancelled/refunded transactions
    if (['CANCELLED', 'REFUNDED'].includes(status) && existingTransaction.status === 'COMPLETED') {
      await prisma.$transaction(async (tx) => {
        // Restore stock
        for (const item of existingTransaction.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { 
              stock: { increment: item.quantity }
            }
          });

          // Create inventory log
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              type: 'IN',
              quantity: item.quantity,
              reference: `Reversal of ${existingTransaction.transactionCode}`,
              notes: notes || `Transaction ${status.toLowerCase()}`
            }
          });
        }
      });
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: { 
        status,
        notes: notes || existingTransaction.notes,
        updatedAt: new Date()
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } }
          }
        },
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } }
      }
    });

    res.json({ 
      success: true, 
      data: { transaction },
      message: 'Transaction status updated successfully' 
    });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ success: false, error: 'Failed to update transaction status' });
  }
});

// Get transaction statistics
router.get('/stats/summary', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    
    const where: any = {};
    
    if (startDate && endDate) {
      where.createdAt = {
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
      totalTransactions,
      totalRevenue,
      totalQuantity,
      avgTransactionValue,
      topProducts
    ] = await Promise.all([
      prisma.transaction.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.transaction.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { finalAmount: true }
      }),
      prisma.transactionItem.aggregate({
        where: {
          transaction: { ...where, status: 'COMPLETED' }
        },
        _sum: { quantity: true }
      }),
      prisma.transaction.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _avg: { finalAmount: true }
      }),
      prisma.transactionItem.groupBy({
        by: ['productId'],
        where: {
          transaction: { ...where, status: 'COMPLETED' }
        },
        _sum: { quantity: true, total: true },
        _count: { productId: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10
      })
    ]);

    // Get product details for top products
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, sku: true }
        });
        return { ...item, product };
      })
    );

    res.json({
      success: true,
      data: {
        totalTransactions,
        totalRevenue: totalRevenue._sum.finalAmount || 0,
        totalQuantity: totalQuantity._sum.quantity || 0,
        avgTransactionValue: avgTransactionValue._avg.finalAmount || 0,
        topProducts: topProductsWithDetails
      }
    });
  } catch (error) {
    console.error('Error fetching transaction statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transaction statistics' });
  }
});

export { router as transactionsRouter };