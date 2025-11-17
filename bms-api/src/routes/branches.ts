import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const createBranchSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional()
});

const updateBranchSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

// Get all branches with pagination and filtering
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      isActive = 'true' 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {
      isActive: isActive === 'true'
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { address: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    // Staff can only see their own branch
    if (req.user!.role === 'STAFF') {
      where.id = req.user!.branchId;
    }

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
              products: true,
              transactions: true,
              suppliers: true,
              purchaseOrders: true,
              attendance: true
            }
          }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.branch.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        branches,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branches' });
  }
});

// Get branch by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Staff can only access their own branch
    if (req.user!.role === 'STAFF' && id !== req.user!.branchId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const branch = await prisma.branch.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true
          }
        },
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            stock: true,
            isActive: true
          },
          take: 10
        },
        _count: {
          select: {
            users: true,
            products: true,
            transactions: true,
            suppliers: true,
            purchaseOrders: true,
            attendance: true
          }
        }
      }
    });

    if (!branch) {
      res.status(404).json({ success: false, error: 'Branch not found' });
      return;
    }

    res.json({ success: true, data: { branch } });
  } catch (error) {
    console.error('Error fetching branch:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branch' });
  }
});

// Create new branch (Admin and Manager only)
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Only Admin and Manager can create branches
    if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
      res.status(403).json({
        success: false,
        error: 'Only administrators and managers can create branches'
      });
      return;
    }

    const data = createBranchSchema.parse(req.body);

    const branch = await prisma.branch.create({
      data: {
        name: data.name,
        address: data.address,
        phone: data.phone,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            products: true,
            transactions: true,
            suppliers: true,
            purchaseOrders: true,
            attendance: true
          }
        }
      }
    });

    res.status(201).json({ 
      success: true, 
      data: { branch },
      message: 'Branch created successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: error.errors
      });
      return;
    }
    console.error('Error creating branch:', error);
    res.status(500).json({ success: false, error: 'Failed to create branch' });
  }
});

// Update branch
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateBranchSchema.parse(req.body);

    const existingBranch = await prisma.branch.findUnique({
      where: { id }
    });

    if (!existingBranch) {
      res.status(404).json({
        success: false,
        error: 'Branch not found'
      });
      return;
    }

    // Check permission
    const canEdit = req.user!.role === 'ADMIN' || 
                   (req.user!.role === 'MANAGER' && req.user!.branchId === id);

    if (!canEdit) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    // Staff can only update their own branch info (except name)
    if (req.user!.role === 'STAFF') {
      if (id !== req.user!.branchId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }
      // Staff cannot change branch name
      if (data.name && data.name !== existingBranch.name) {
        res.status(403).json({
          success: false,
          error: 'Staff cannot change branch name'
        });
        return;
      }
    }

    const branch = await prisma.branch.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            products: true,
            transactions: true,
            suppliers: true,
            purchaseOrders: true,
            attendance: true
          }
        }
      }
    });

    res.json({ 
      success: true, 
      data: { branch },
      message: 'Branch updated successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: error.errors
      });
      return;
    }
    console.error('Error updating branch:', error);
    res.status(500).json({ success: false, error: 'Failed to update branch' });
  }
});

// Deactivate/Activate branch (Admin only)
router.patch('/:id/status', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Only Admin can change branch status
    if (req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Only administrators can change branch status'
      });
      return;
    }

    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'isActive must be a boolean'
      });
      return;
    }

    const existingBranch = await prisma.branch.findUnique({
      where: { id }
    });

    if (!existingBranch) {
      res.status(404).json({
        success: false,
        error: 'Branch not found'
      });
      return;
    }

    // Check if there are active users in this branch
    if (!isActive) {
      const activeUsersCount = await prisma.user.count({
        where: { branchId: id, isActive: true }
      });

      if (activeUsersCount > 0) {
        res.status(400).json({
          success: false,
          error: `Cannot deactivate branch. There are ${activeUsersCount} active users in this branch.`
        });
        return;
      }
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        isActive: true,
        _count: {
          select: {
            users: true,
            products: true,
            transactions: true,
            suppliers: true,
            purchaseOrders: true,
            attendance: true
          }
        }
      }
    });

    res.json({ 
      success: true, 
      data: { branch },
      message: `Branch ${isActive ? 'activated' : 'deactivated'} successfully` 
    });
  } catch (error) {
    console.error('Error updating branch status:', error);
    res.status(500).json({ success: false, error: 'Failed to update branch status' });
  }
});

// Get branch statistics
router.get('/:id/stats', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Staff can only access their own branch statistics
    if (req.user!.role === 'STAFF' && id !== req.user!.branchId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const branch = await prisma.branch.findUnique({
      where: { id }
    });

    if (!branch) {
      res.status(404).json({ success: false, error: 'Branch not found' });
      return;
    }

    // Get current month and year for date filtering
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      totalUsers,
      activeUsers,
      totalProducts,
      activeProducts,
      totalTransactions,
      monthTransactions,
      totalRevenue,
      monthRevenue,
      lowStockProducts,
      recentTransactions
    ] = await Promise.all([
      prisma.user.count({ where: { branchId: id } }),
      prisma.user.count({ where: { branchId: id, isActive: true } }),
      prisma.product.count({ where: { branchId: id } }),
      prisma.product.count({ where: { branchId: id, isActive: true } }),
      prisma.transaction.count({ where: { branchId: id, status: 'COMPLETED' } }),
      prisma.transaction.count({
        where: { 
          branchId: id, 
          status: 'COMPLETED',
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      }),
      prisma.transaction.aggregate({
        where: { branchId: id, status: 'COMPLETED' },
        _sum: { finalAmount: true }
      }),
      prisma.transaction.aggregate({
        where: { 
          branchId: id, 
          status: 'COMPLETED',
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: { finalAmount: true }
      }),
      prisma.product.count({
        where: { 
          branchId: id, 
          isActive: true,
          stock: { lte: prisma.product.fields.minStock }
        }
      }),
      prisma.transaction.findMany({
        where: { 
          branchId: id,
          status: 'COMPLETED'
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          transactionCode: true,
          finalAmount: true,
          createdAt: true,
          user: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              items: true
            }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        branch: {
          id: branch.id,
          name: branch.name,
          address: branch.address,
          phone: branch.phone
        },
        overview: {
          totalUsers,
          activeUsers,
          totalProducts,
          activeProducts,
          totalTransactions,
          monthTransactions,
          totalRevenue: totalRevenue._sum.finalAmount || 0,
          monthRevenue: monthRevenue._sum.finalAmount || 0,
          lowStockProducts
        },
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Error fetching branch statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branch statistics' });
  }
});

// Get branch comparison data (Admin only)
router.get('/compare', authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    // Only Admin can compare branches
    if (req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Only administrators can compare branches'
      });
      return;
    }

    const { startDate, endDate } = req.query;
    
    const dateFilter = startDate && endDate ? {
      gte: new Date(String(startDate)),
      lte: new Date(String(endDate))
    } : undefined;

    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            users: true,
            products: true,
            transactions: dateFilter ? undefined : true
          }
        }
      }
    });

    // Get performance data for each branch
    const branchData = await Promise.all(
      branches.map(async (branch) => {
        const transactionWhere: any = {
          branchId: branch.id,
          status: 'COMPLETED' as const
        };

        if (dateFilter) {
          transactionWhere.createdAt = dateFilter;
        }

        const [transactionCount, revenue, avgTransaction] = await Promise.all([
          prisma.transaction.count({ where: transactionWhere }),
          prisma.transaction.aggregate({
            where: transactionWhere,
            _sum: { finalAmount: true }
          }),
          prisma.transaction.aggregate({
            where: transactionWhere,
            _avg: { finalAmount: true }
          })
        ]);

        return {
          ...branch,
          metrics: {
            transactionCount,
            revenue: revenue._sum.finalAmount || 0,
            avgTransactionValue: avgTransaction._avg.finalAmount || 0,
            userCount: branch._count.users,
            productCount: branch._count.products
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        branches: branchData,
        period: dateFilter ? {
          startDate: String(startDate),
          endDate: String(endDate)
        } : 'all-time'
      }
    });
  } catch (error) {
    console.error('Error fetching branch comparison:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branch comparison' });
  }
});

export { router as branchesRouter };