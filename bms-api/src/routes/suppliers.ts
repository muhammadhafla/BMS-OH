import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const createSupplierSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  contact: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  branchId: z.string().optional()
});

const updateSupplierSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  contact: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  isActive: z.boolean().optional()
});

// Get all suppliers with pagination and filtering
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      branchId,
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
        { code: { contains: String(search), mode: 'insensitive' } },
        { contact: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    // Branch filter
    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          branch: { select: { id: true, name: true } },
          _count: {
            select: {
              purchaseOrders: true
            }
          }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.supplier.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        suppliers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch suppliers' });
  }
});

// Get supplier by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, address: true } },
        purchaseOrders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderCode: true,
            orderDate: true,
            finalAmount: true,
            status: true,
            _count: {
              select: { items: true }
            }
          }
        },
        _count: {
          select: {
            purchaseOrders: true
          }
        }
      }
    });

    if (!supplier) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    // Check permission - staff can only access suppliers from their branch
    if (req.user!.role === 'STAFF' && supplier.branchId !== req.user!.branchId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: { supplier } });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch supplier' });
  }
});

// Create new supplier
router.post('/', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    // Only Admin and Manager can create suppliers
    if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators and managers can create suppliers' 
      });
    }

    const data = createSupplierSchema.parse(req.body);

    // Check if supplier code already exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: { code: data.code }
    });

    if (existingSupplier) {
      return res.status(400).json({ 
        success: false, 
        error: 'Supplier code already exists' 
      });
    }

    // Validate branch
    const branchId = req.user!.role === 'STAFF' ? req.user!.branchId! :
                    data.branchId || req.user!.branchId!;

    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    });
    
    if (!branch) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid branch ID' 
      });
    }

    const supplier = await prisma.supplier.create({
      data: {
        code: data.code,
        name: data.name,
        contact: data.contact,
        address: data.address,
        phone: data.phone,
        email: data.email,
        branchId,
        isActive: true
      },
      include: {
        branch: { select: { id: true, name: true } },
        _count: {
          select: {
            purchaseOrders: true
          }
        }
      }
    });

    res.status(201).json({ 
      success: true, 
      data: { supplier },
      message: 'Supplier created successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error creating supplier:', error);
    res.status(500).json({ success: false, error: 'Failed to create supplier' });
  }
});

// Update supplier
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const data = updateSupplierSchema.parse(req.body);

    const existingSupplier = await prisma.supplier.findUnique({
      where: { id }
    });

    if (!existingSupplier) {
      return res.status(404).json({ 
        success: false, 
        error: 'Supplier not found' 
      });
    }

    // Check permission
    const canEdit = req.user!.role === 'ADMIN' || 
                   (req.user!.role === 'MANAGER' && existingSupplier.branchId === req.user!.branchId);

    if (!canEdit) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Check supplier code uniqueness if being updated
    if (data.code && data.code !== existingSupplier.code) {
      const duplicateCode = await prisma.supplier.findUnique({
        where: { code: data.code }
      });
      
      if (duplicateCode) {
        return res.status(400).json({ 
          success: false, 
          error: 'Supplier code already exists' 
        });
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data,
      include: {
        branch: { select: { id: true, name: true, address: true } },
        _count: {
          select: {
            purchaseOrders: true
          }
        }
      }
    });

    res.json({ 
      success: true, 
      data: { supplier },
      message: 'Supplier updated successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error updating supplier:', error);
    res.status(500).json({ success: false, error: 'Failed to update supplier' });
  }
});

// Deactivate/Activate supplier
router.patch('/:id/status', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    // Only Admin and Manager can change supplier status
    if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators and managers can change supplier status' 
      });
    }

    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        error: 'isActive must be a boolean' 
      });
    }

    const existingSupplier = await prisma.supplier.findUnique({
      where: { id }
    });

    if (!existingSupplier) {
      return res.status(404).json({ 
        success: false, 
        error: 'Supplier not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'MANAGER' && existingSupplier.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Check if there are active purchase orders
    if (!isActive) {
      const activePOs = await prisma.purchaseOrder.count({
        where: { 
          supplierId: id, 
          status: { in: ['PENDING', 'APPROVED'] }
        }
      });

      if (activePOs > 0) {
        return res.status(400).json({ 
          success: false, 
          error: `Cannot deactivate supplier. There are ${activePOs} active purchase orders.` 
        });
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { isActive },
      include: {
        branch: { select: { id: true, name: true } },
        _count: {
          select: {
            purchaseOrders: true
          }
        }
      }
    });

    res.json({ 
      success: true, 
      data: { supplier },
      message: `Supplier ${isActive ? 'activated' : 'deactivated'} successfully` 
    });
  } catch (error) {
    console.error('Error updating supplier status:', error);
    res.status(500).json({ success: false, error: 'Failed to update supplier status' });
  }
});

// Get supplier statistics
router.get('/stats/summary', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { branchId } = req.query;
    
    const where: any = {};
    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    const [
      totalSuppliers,
      activeSuppliers,
      suppliersByBranch,
      topSuppliers
    ] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.count({ where: { ...where, isActive: true } }),
      prisma.supplier.groupBy({
        by: ['branchId'],
        where,
        _count: { branchId: true }
      }),
      prisma.purchaseOrder.groupBy({
        by: ['supplierId'],
        where,
        _sum: { finalAmount: true },
        _count: { supplierId: true },
        orderBy: { _sum: { finalAmount: 'desc' } },
        take: 5
      })
    ]);

    // Get branch details for branch grouping
    const branchIds = suppliersByBranch.map(item => item.branchId);
    const branches = await prisma.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true, name: true }
    });

    const branchMap = branches.reduce((acc, branch) => {
      acc[branch.id] = branch.name;
      return acc;
    }, {} as Record<string, string>);

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
        totalSuppliers,
        activeSuppliers,
        inactiveSuppliers: totalSuppliers - activeSuppliers,
        suppliersByBranch: suppliersByBranch.reduce((acc, item) => {
          acc[branchMap[item.branchId] || 'Unknown'] = item._count.branchId;
          return acc;
        }, {} as Record<string, number>),
        topSuppliers: topSuppliersWithDetails
      }
    });
  } catch (error) {
    console.error('Error fetching supplier statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch supplier statistics' });
  }
});

// Search suppliers for autocomplete
router.get('/search', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || String(q).length < 2) {
      return res.json({
        success: true,
        data: { suppliers: [] }
      });
    }

    const where: any = {
      isActive: true,
      OR: [
        { name: { contains: String(q), mode: 'insensitive' } },
        { code: { contains: String(q), mode: 'insensitive' } },
        { contact: { contains: String(q), mode: 'insensitive' } }
      ]
    };

    // Branch filter
    if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      take: Number(limit),
      select: {
        id: true,
        name: true,
        code: true,
        contact: true,
        phone: true,
        email: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: { suppliers }
    });
  } catch (error) {
    console.error('Error searching suppliers:', error);
    res.status(500).json({ success: false, error: 'Failed to search suppliers' });
  }
});

export { router as suppliersRouter };