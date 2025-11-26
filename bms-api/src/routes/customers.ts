import { Router } from 'express';
import { PrismaClient, CustomerGender, CustomerType, ContactType, LoyaltyPointType } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { websocketEventEmitter, createCustomerUpdatedEvent } from '../websocket/events';

const router = Router();
const prisma = new PrismaClient();

const createCustomerSchema = z.object({
  customerCode: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().default('Indonesia'),
  dateOfBirth: z.string().datetime().optional().nullable(),
  gender: z.nativeEnum(CustomerGender).optional(),
  customerType: z.nativeEnum(CustomerType).default('REGULAR'),
  creditLimit: z.number().min(0).default(0),
  currentBalance: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  branchId: z.string()
});

const updateCustomerSchema = createCustomerSchema.partial().omit({ branchId: true });

const addContactSchema = z.object({
  type: z.nativeEnum(ContactType),
  value: z.string().min(1),
  isPrimary: z.boolean().default(false)
});

const loyaltyPointSchema = z.object({
  points: z.number().int(),
  type: z.nativeEnum(LoyaltyPointType),
  description: z.string().optional(),
  expiresAt: z.string().datetime().optional()
});

// Get all customers with pagination and filtering
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      customerType,
      isActive = 'true',
      branchId
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {
      isActive: isActive === 'true'
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { customerCode: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    // Customer type filter
    if (customerType) {
      where.customerType = String(customerType);
    }

    // Branch filter
    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          branch: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, email: true } },
          customerContacts: {
            where: { isPrimary: true },
            take: 1
          },
          transactions: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              amount: true,
              createdAt: true,
              transaction: {
                select: {
                  id: true,
                  transactionCode: true,
                  finalAmount: true,
                  createdAt: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customer.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
});

// Get customer by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        customerContacts: true,
        transactions: {
          include: {
            transaction: {
              select: {
                id: true,
                transactionCode: true,
                finalAmount: true,
                createdAt: true,
                paymentMethod: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        loyaltyPointsLog: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    // Check permission - staff can only access customers from their branch
    if (req.user!.role === 'STAFF' && customer.branchId !== req.user!.branchId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: { customer } });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customer' });
  }
});

// Create new customer
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const data = createCustomerSchema.parse(req.body);
    
    // Check if customer code already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { customerCode: data.customerCode }
    });

    if (existingCustomer) {
      return res.status(400).json({ 
        success: false, 
        error: 'Customer code already exists' 
      });
    }

    // Check permission - staff can only create customers for their branch
    if (req.user!.role === 'STAFF' && data.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    const customer = await prisma.customer.create({
      data: {
        customerCode: data.customerCode,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender,
        customerType: data.customerType,
        creditLimit: data.creditLimit,
        currentBalance: data.currentBalance,
        notes: data.notes,
        branchId: data.branchId,
        createdBy: req.user!.id
      },
      include: {
        branch: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } }
      }
    });

    // Create inventory log for loyalty points if customer type is VIP or higher
    if (['VIP', 'CORPORATE', 'WHOLESALE'].includes(data.customerType as string)) {
      await prisma.loyaltyPoint.create({
        data: {
          customerId: customer.id,
          points: 100, // Welcome bonus
          type: 'EARNED',
          description: 'Welcome bonus for new customer'
        }
      });

      // Update customer's loyalty points
      await prisma.customer.update({
        where: { id: customer.id },
        data: { loyaltyPoints: 100 }
      });
    }

    // Emit real-time customer created event
    try {
      const event = createCustomerUpdatedEvent(customer, 'created', customer.branchId, req.user!.id);
      websocketEventEmitter.emit(event);
      console.log(`📡 Emitted customer:created event for customer ${customer.customerCode}`);
    } catch (error) {
      console.error('Failed to emit customer created event:', error);
    }

    res.status(201).json({
      success: true,
      data: { customer },
      message: 'Customer created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error creating customer:', error);
    res.status(500).json({ success: false, error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateCustomerSchema.parse(req.body);

    const existingCustomer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!existingCustomer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'STAFF' && existingCustomer.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Check customer code uniqueness if being updated
    if (data.customerCode && data.customerCode !== existingCustomer.customerCode) {
      const duplicateCode = await prisma.customer.findUnique({
        where: { customerCode: data.customerCode }
      });
      
      if (duplicateCode) {
        return res.status(400).json({ 
          success: false, 
          error: 'Customer code already exists' 
        });
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null
      },
      include: {
        branch: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } }
      }
    });

    // Emit real-time customer updated event
    try {
      const event = createCustomerUpdatedEvent(customer, 'updated', customer.branchId, req.user!.id);
      websocketEventEmitter.emit(event);
      console.log(`📡 Emitted customer:updated event for customer ${customer.customerCode}`);
    } catch (error) {
      console.error('Failed to emit customer updated event:', error);
    }

    res.json({
      success: true,
      data: { customer },
      message: 'Customer updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error updating customer:', error);
    res.status(500).json({ success: false, error: 'Failed to update customer' });
  }
});

// Delete customer (soft delete)
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const existingCustomer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!existingCustomer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'STAFF' && existingCustomer.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Check if customer has transactions
    const transactionCount = await prisma.customerTransaction.count({
      where: { customerId: id }
    });

    if (transactionCount > 0) {
      // Soft delete by setting isActive to false
      const customer = await prisma.customer.update({
        where: { id },
        data: { isActive: false },
        include: {
          branch: { select: { id: true, name: true } }
        }
      });

      // Emit real-time customer deactivated event
      try {
        const event = createCustomerUpdatedEvent(customer, 'deactivated', customer.branchId, req.user!.id);
        websocketEventEmitter.emit(event);
        console.log(`📡 Emitted customer:deactivated event for customer ${customer.customerCode}`);
      } catch (error) {
        console.error('Failed to emit customer deactivated event:', error);
      }

      res.json({
        success: true,
        data: { customer },
        message: 'Customer deactivated (has transaction history)'
      });
    } else {
      // Hard delete if no transactions
      await prisma.customer.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
    }
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ success: false, error: 'Failed to delete customer' });
  }
});

// Add customer contact
router.post('/:id/contacts', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const data = addContactSchema.parse(req.body);

    const customer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'STAFF' && customer.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // If this is a primary contact, unset other primary contacts of the same type
    if (data.isPrimary) {
      await prisma.customerContact.updateMany({
        where: {
          customerId: id,
          type: data.type,
          isPrimary: true
        },
        data: { isPrimary: false }
      });
    }

    const contact = await prisma.customerContact.create({
      data: {
        type: data.type,
        value: data.value,
        isPrimary: data.isPrimary,
        customerId: id
      }
    });

    res.status(201).json({
      success: true,
      data: { contact },
      message: 'Contact added successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error adding customer contact:', error);
    res.status(500).json({ success: false, error: 'Failed to add customer contact' });
  }
});

// Get customer loyalty points
router.get('/:id/loyalty-points', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        customerCode: true,
        name: true,
        loyaltyPoints: true,
        branchId: true
      }
    });

    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'STAFF' && customer.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    const loyaltyPoints = await prisma.loyaltyPoint.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const availablePoints = await prisma.loyaltyPoint.aggregate({
      where: {
        customerId: id,
        isRedeemed: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      _sum: { points: true }
    });

    res.json({
      success: true,
      data: {
        customer,
        availablePoints: availablePoints._sum.points || 0,
        totalEarned: loyaltyPoints.filter(p => p.type === 'EARNED').reduce((sum, p) => sum + p.points, 0),
        totalRedeemed: loyaltyPoints.filter(p => p.type === 'REDEEMED').reduce((sum, p) => sum + p.points, 0),
        pointsHistory: loyaltyPoints
      }
    });
  } catch (error) {
    console.error('Error fetching customer loyalty points:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customer loyalty points' });
  }
});

// Add loyalty points
router.post('/:id/loyalty-points', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const data = loyaltyPointSchema.parse(req.body);

    const customer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'STAFF' && customer.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    const loyaltyPoint = await prisma.loyaltyPoint.create({
      data: {
        ...data,
        customerId: id,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
      }
    });

    // Update customer's total loyalty points
    if (data.type === 'EARNED') {
      await prisma.customer.update({
        where: { id },
        data: {
          loyaltyPoints: { increment: data.points }
        }
      });
    } else if (data.type === 'REDEEMED') {
      await prisma.customer.update({
        where: { id },
        data: {
          loyaltyPoints: { decrement: data.points }
        }
      });
    }

    res.status(201).json({
      success: true,
      data: { loyaltyPoint },
      message: 'Loyalty points updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error adding loyalty points:', error);
    res.status(500).json({ success: false, error: 'Failed to add loyalty points' });
  }
});

// Get customer analytics
router.get('/:id/analytics', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        customerCode: true,
        name: true,
        branchId: true,
        createdAt: true
      }
    });

    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'STAFF' && customer.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    const [
      totalTransactions,
      totalSpent,
      avgOrderValue,
      lastPurchaseDate,
      loyaltyPointsEarned,
      loyaltyPointsRedeemed
    ] = await Promise.all([
      prisma.customerTransaction.count({
        where: { customerId: id }
      }),
      prisma.customerTransaction.aggregate({
        where: { customerId: id },
        _sum: { amount: true }
      }),
      prisma.customerTransaction.aggregate({
        where: { customerId: id },
        _avg: { amount: true }
      }),
      prisma.customerTransaction.findFirst({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      }),
      prisma.loyaltyPoint.aggregate({
        where: { 
          customerId: id,
          type: 'EARNED'
        },
        _sum: { points: true }
      }),
      prisma.loyaltyPoint.aggregate({
        where: { 
          customerId: id,
          type: 'REDEEMED'
        },
        _sum: { points: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        customer,
        analytics: {
          totalTransactions,
          totalSpent: totalSpent._sum.amount || 0,
          avgOrderValue: avgOrderValue._avg.amount || 0,
          lastPurchaseDate: lastPurchaseDate?.createdAt,
          loyaltyPointsEarned: loyaltyPointsEarned._sum.points || 0,
          loyaltyPointsRedeemed: loyaltyPointsRedeemed._sum.points || 0,
          customerSince: customer.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Error fetching customer analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customer analytics' });
  }
});

export { router as customersRouter };