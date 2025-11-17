import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']),
  branchId: z.string().optional()
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional(),
  branchId: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6)
});

// Get all users with pagination and filtering
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      role, 
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
        { email: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    // Role filter
    if (role) {
      where.role = String(role);
    }

    // Branch filter
    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      // Staff can only see users from their branch
      where.branchId = req.user!.branchId;
    }

    // Admin and Manager can see all users, but staff restriction applies
    if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          branchId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          branch: {
            select: {
              id: true,
              name: true,
              address: true
            }
          },
          _count: {
            select: {
              transactions: true,
              attendance: true,
              messagesSent: true,
              messagesReceived: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true
          }
        },
        _count: {
          select: {
            transactions: true,
            attendance: true,
            messagesSent: true,
            messagesReceived: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check permission - users can view their own profile, or admins/managers can view all
    if (req.user!.role === 'STAFF' && user.id !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// Create new user (Admin and Manager only)
router.post('/', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    // Only Admin and Manager can create users
    if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators and managers can create users' 
      });
    }

    const data = createUserSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email already exists' 
      });
    }

    // Validate branch if provided
    if (data.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: data.branchId }
      });
      
      if (!branch) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid branch ID' 
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role,
        branchId: data.branchId || req.user!.branchId,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({ 
      success: true, 
      data: { user },
      message: 'User created successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Check permission
    const canEdit = req.user!.role === 'ADMIN' || 
                   (req.user!.role === 'MANAGER' && existingUser.role !== 'ADMIN') ||
                   existingUser.id === req.user!.id;

    if (!canEdit) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Check email uniqueness if being updated
    if (data.email && data.email !== existingUser.email) {
      const duplicateEmail = await prisma.user.findUnique({
        where: { email: data.email }
      });
      
      if (duplicateEmail) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email already exists' 
        });
      }
    }

    // Validate branch if being updated
    if (data.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: data.branchId }
      });
      
      if (!branch) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid branch ID' 
        });
      }
    }

    // Staff cannot change branch
    if (req.user!.role === 'STAFF' && data.branchId && data.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Staff cannot change branch' 
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    res.json({ 
      success: true, 
      data: { user },
      message: 'User updated successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// Change password
router.patch('/:id/password', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Check permission - user can change their own password, or admin can change any
    if (req.user!.role !== 'ADMIN' && user.id !== req.user!.id) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedNewPassword }
    });

    res.json({ 
      success: true,
      message: 'Password changed successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// Deactivate/Activate user (Admin only)
router.patch('/:id/status', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    // Only Admin can change user status
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators can change user status' 
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

    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Prevent deactivating yourself
    if (id === req.user!.id && !isActive) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot deactivate your own account' 
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({ 
      success: true, 
      data: { user },
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully` 
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ success: false, error: 'Failed to update user status' });
  }
});

// Get user statistics
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
      totalUsers,
      activeUsers,
      usersByRole,
      recentUsers
    ] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.count({ where: { ...where, isActive: true } }),
      prisma.user.groupBy({
        by: ['role'],
        where,
        _count: { role: true }
      }),
      prisma.user.findMany({
        where,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          branch: {
            select: {
              name: true
            }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item.role] = item._count.role;
          return acc;
        }, {} as Record<string, number>),
        recentUsers
      }
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user statistics' });
  }
});

export { router as usersRouter };