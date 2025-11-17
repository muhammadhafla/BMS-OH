import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const clockInSchema = z.object({
  date: z.string().datetime().optional(),
  notes: z.string().optional()
});

const clockOutSchema = z.object({
  attendanceId: z.string(),
  notes: z.string().optional()
});

const updateAttendanceSchema = z.object({
  date: z.string().datetime().optional(),
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  status: z.string().optional(),
  notes: z.string().optional().nullable()
});

// Clock in
router.post('/clock-in', authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { date, notes } = clockInSchema.parse(req.body);
    
    // Use provided date or current date
    const attendanceDate = date ? new Date(date) : new Date();
    const dateString = attendanceDate.toISOString().split('T')[0];

    // Check if user already has an attendance record for this date
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId: req.user!.id,
        date: {
          gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
          lt: new Date(attendanceDate.setHours(23, 59, 59, 999))
        }
      }
    });

    if (existingAttendance) {
      res.status(400).json({
        success: false,
        error: 'Already clocked in for this date'
      });
      return;
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId: req.user!.id,
        branchId: req.user!.branchId!,
        date: new Date(dateString),
        checkIn: new Date(),
        status: 'PRESENT',
        notes: notes ?? null
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ 
      success: true, 
      data: { attendance },
      message: 'Clocked in successfully' 
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
    console.error('Error clocking in:', error);
    res.status(500).json({ success: false, error: 'Failed to clock in' });
  }
});

// Clock out
router.post('/clock-out', authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { attendanceId, notes } = clockOutSchema.parse(req.body);

    const existingAttendance = await prisma.attendance.findUnique({
      where: { id: attendanceId }
    });

    if (!existingAttendance) {
      res.status(404).json({
        success: false,
        error: 'Attendance record not found'
      });
      return;
    }

    // Check if this is the current user's attendance or if user has permission
    if (existingAttendance.userId !== req.user!.id && req.user!.role === 'STAFF') {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    if (existingAttendance.checkOut) {
      res.status(400).json({
        success: false,
        error: 'Already clocked out'
      });
      return;
    }

    const attendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        checkOut: new Date(),
        notes: notes || existingAttendance.notes
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } }
      }
    });

    res.json({ 
      success: true, 
      data: { attendance },
      message: 'Clocked out successfully' 
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
    console.error('Error clocking out:', error);
    res.status(500).json({ success: false, error: 'Failed to clock out' });
  }
});

// Get attendance records
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      startDate, 
      endDate, 
      userId, 
      branchId,
      status 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    // Date range filter
    if (startDate && endDate) {
      where.date = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
    }

    // User filter
    if (userId) {
      where.userId = String(userId);
    } else if (req.user!.role === 'STAFF') {
      // Staff can only see their own attendance
      where.userId = req.user!.id;
    }

    // Branch filter
    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    // Status filter
    if (status) {
      where.status = String(status);
    }

    const [attendanceRecords, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          user: { 
            select: { 
              id: true, 
              name: true, 
              email: true,
              role: true
            } 
          },
          branch: { select: { id: true, name: true } }
        },
        orderBy: { date: 'desc' }
      }),
      prisma.attendance.count({ where })
    ]);

    // Calculate work hours for each record
    const recordsWithHours = attendanceRecords.map(record => {
      let workHours = 0;
      if (record.checkIn && record.checkOut) {
        workHours = (record.checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60);
      }
      return {
        ...record,
        workHours: Math.round(workHours * 100) / 100
      };
    });

    res.json({
      success: true,
      data: {
        attendance: recordsWithHours,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch attendance records' });
  }
});

// Get attendance by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { id } = req.params;
    
    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            role: true
          } 
        },
        branch: { select: { id: true, name: true, address: true } }
      }
    });

    if (!attendance) {
      res.status(404).json({ success: false, error: 'Attendance record not found' });
      return;
    }

    // Check permission
    if (req.user!.role === 'STAFF' && attendance.userId !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Calculate work hours
    let workHours = 0;
    if (attendance.checkIn && attendance.checkOut) {
      workHours = (attendance.checkOut.getTime() - attendance.checkIn.getTime()) / (1000 * 60 * 60);
    }

    res.json({ 
      success: true, 
      data: { 
        attendance: {
          ...attendance,
          workHours: Math.round(workHours * 100) / 100
        }
      }
    });
  } catch (error) {
    console.error('Error fetching attendance record:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch attendance record' });
  }
});

// Update attendance record
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { id } = req.params;
    const data = updateAttendanceSchema.parse(req.body);

    const existingAttendance = await prisma.attendance.findUnique({
      where: { id }
    });

    if (!existingAttendance) {
      res.status(404).json({
        success: false,
        error: 'Attendance record not found'
      });
      return;
    }

    // Check permission
    const canEdit = req.user!.role === 'ADMIN' ||
                    (req.user!.role === 'MANAGER' && existingAttendance.branchId === req.user!.branchId) ||
                    (req.user!.role === 'STAFF' && existingAttendance.userId === req.user!.id);

    if (!canEdit) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.date) updateData.date = new Date(data.date);
    if (data.checkIn) updateData.checkIn = new Date(data.checkIn);
    if (data.checkOut) updateData.checkOut = new Date(data.checkOut);

    const attendance = await prisma.attendance.update({
      where: { id },
      data: updateData,
      include: {
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            role: true
          } 
        },
        branch: { select: { id: true, name: true } }
      }
    });

    res.json({ 
      success: true, 
      data: { attendance },
      message: 'Attendance record updated successfully' 
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
    console.error('Error updating attendance record:', error);
    res.status(500).json({ success: false, error: 'Failed to update attendance record' });
  }
});

// Get attendance history for a specific user
router.get('/user/:userId', authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { userId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      startDate, 
      endDate 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { userId };

    // Date range filter
    if (startDate && endDate) {
      where.date = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
    }

    // Check permission - users can view their own history, or managers can view their branch
    if (req.user!.role === 'STAFF' && userId !== req.user!.id) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    if (req.user!.role === 'MANAGER') {
      // Manager can only view users from their branch
      const targetUser = await prisma.user.findUnique({
        where: { id: userId }
      });
      if (!targetUser || targetUser.branchId !== req.user!.branchId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }
    }

    const [attendanceHistory, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          branch: { select: { id: true, name: true } }
        },
        orderBy: { date: 'desc' }
      }),
      prisma.attendance.count({ where })
    ]);

    // Calculate work hours
    const historyWithHours = attendanceHistory.map(record => {
      let workHours = 0;
      if (record.checkIn && record.checkOut) {
        workHours = (record.checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60);
      }
      return {
        ...record,
        workHours: Math.round(workHours * 100) / 100
      };
    });

    res.json({
      success: true,
      data: {
        attendance: historyWithHours,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user attendance history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user attendance history' });
  }
});

// Get attendance statistics
router.get('/stats/summary', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      branchId,
      startDate,
      endDate,
      userId 
    } = req.query;
    
    const where: any = {};
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
    }

    if (userId) {
      where.userId = String(userId);
    } else if (req.user!.role === 'STAFF') {
      where.userId = req.user!.id;
    }

    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    const [
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      totalWorkHours,
      usersByStatus
    ] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.count({ where: { ...where, status: 'PRESENT' } }),
      prisma.attendance.count({ where: { ...where, status: 'ABSENT' } }),
      prisma.attendance.count({ where: { ...where, status: 'LATE' } }),
      prisma.attendance.findMany({
        where: { ...where, checkIn: { not: null }, checkOut: { not: null } },
        select: { checkIn: true, checkOut: true }
      }),
      prisma.attendance.groupBy({
        by: ['status'],
        where,
        _count: { status: true }
      })
    ]);

    // Calculate total work hours
    const totalHours = totalWorkHours.reduce((sum, record) => {
      const hours = (record.checkOut!.getTime() - record.checkIn!.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    res.json({
      success: true,
      data: {
        overview: {
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          attendanceRate: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
          totalWorkHours: Math.round(totalHours * 100) / 100,
          averageWorkHours: totalDays > 0 ? Math.round((totalHours / totalDays) * 100) / 100 : 0
        },
        statusBreakdown: usersByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>)
      }
    });
  } catch (error) {
    console.error('Error fetching attendance statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch attendance statistics' });
  }
});

// Get current status (is user currently clocked in)
router.get('/current-status', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const currentAttendance = await prisma.attendance.findFirst({
      where: {
        userId: req.user!.id,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        branch: { select: { name: true } }
      }
    });

    const isClockedIn = currentAttendance && !currentAttendance.checkOut;
    let workHours = 0;
    
    if (isClockedIn && currentAttendance.checkIn) {
      workHours = (new Date().getTime() - currentAttendance.checkIn.getTime()) / (1000 * 60 * 60);
    }

    res.json({
      success: true,
      data: {
        isClockedIn,
        currentAttendance: currentAttendance ? {
          ...currentAttendance,
          currentWorkHours: Math.round(workHours * 100) / 100
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching current status:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch current status' });
  }
});

export { router as attendanceRouter };