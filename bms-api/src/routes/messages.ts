import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const createMessageSchema = z.object({
  receiverId: z.string(),
  content: z.string().min(1)
});

// Get all messages for the current user
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type = 'all', // 'received', 'sent', 'all'
      isRead 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    let where: any = {};

    // Filter by message type
    switch (type) {
      case 'received':
        where.receiverId = req.user!.id;
        break;
      case 'sent':
        where.senderId = req.user!.id;
        break;
      case 'all':
      default:
        where.OR = [
          { senderId: req.user!.id },
          { receiverId: req.user!.id }
        ];
        break;
    }

    // Filter by read status for received messages
    if (isRead !== undefined && type !== 'sent') {
      where.isRead = isRead === 'true';
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          sender: { 
            select: { 
              id: true, 
              name: true, 
              email: true,
              role: true
            } 
          },
          receiver: { 
            select: { 
              id: true, 
              name: true, 
              email: true,
              role: true
            } 
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.message.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// Get message by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        sender: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            role: true
          } 
        },
        receiver: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            role: true
          } 
        }
      }
    });

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Check permission - user can only view messages they sent or received
    if (message.senderId !== req.user!.id && message.receiverId !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: { message } });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch message' });
  }
});

// Send a new message
router.post('/', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const data = createMessageSchema.parse(req.body);

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: data.receiverId }
    });

    if (!receiver) {
      return res.status(404).json({ 
        success: false, 
        error: 'Receiver not found' 
      });
    }

    // Check if receiver is active
    if (!receiver.isActive) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot send message to inactive user' 
      });
    }

    // Staff can only send messages within their branch
    if (req.user!.role === 'STAFF' && receiver.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Staff can only send messages within their branch' 
      });
    }

    const message = await prisma.message.create({
      data: {
        content: data.content,
        senderId: req.user!.id,
        receiverId: data.receiverId,
        isRead: false
      },
      include: {
        sender: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            role: true
          } 
        },
        receiver: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            role: true
          } 
        }
      }
    });

    res.status(201).json({ 
      success: true, 
      data: { message },
      message: 'Message sent successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// Mark message as read
router.patch('/:id/read', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;

    const message = await prisma.message.findUnique({
      where: { id }
    });

    if (!message) {
      return res.status(404).json({ 
        success: false, 
        error: 'Message not found' 
      });
    }

    // Only the receiver can mark the message as read
    if (message.receiverId !== req.user!.id) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // If already read, return the message
    if (message.isRead) {
      return res.json({ 
        success: true, 
        data: { message },
        message: 'Message already read' 
      });
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { isRead: true },
      include: {
        sender: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            role: true
          } 
        },
        receiver: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            role: true
          } 
        }
      }
    });

    res.json({ 
      success: true, 
      data: { message: updatedMessage },
      message: 'Message marked as read' 
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark message as read' });
  }
});

// Mark all messages as read
router.patch('/mark-all-read', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await prisma.message.updateMany({
      where: {
        receiverId: req.user!.id,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    res.json({ 
      success: true,
      message: `${result.count} messages marked as read` 
    });
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all messages as read' });
  }
});

// Get unread message count
router.get('/unread-count', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const count = await prisma.message.count({
      where: {
        receiverId: req.user!.id,
        isRead: false
      }
    });

    res.json({ 
      success: true, 
      data: { unreadCount: count }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch unread count' });
  }
});

// Get conversation between two users
router.get('/conversation/:userId', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Check if the other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!otherUser) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Staff can only have conversations within their branch
    if (req.user!.role === 'STAFF' && otherUser.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    const where = {
      OR: [
        { senderId: req.user!.id, receiverId: userId },
        { senderId: userId, receiverId: req.user!.id }
      ]
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          sender: { 
            select: { 
              id: true, 
              name: true, 
              email: true,
              role: true
            } 
          },
          receiver: { 
            select: { 
              id: true, 
              name: true, 
              email: true,
              role: true
            } 
          }
        },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.message.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        conversation: {
          user: {
            id: otherUser.id,
            name: otherUser.name,
            email: otherUser.email,
            role: otherUser.role
          },
          messages
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversation' });
  }
});

// Get list of users the current user has messaged with
router.get('/contacts', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { branchId } = req.query;
    
    let where = {
      OR: [
        { senderId: req.user!.id },
        { receiverId: req.user!.id }
      ]
    };

    // If branch filter is specified
    if (branchId) {
      where = {
        AND: [
          where,
          {
            OR: [
              { sender: { branchId: String(branchId) } },
              { receiver: { branchId: String(branchId) } }
            ]
          }
        ]
      } as any;
    } else if (req.user!.role === 'STAFF') {
      // Staff can only see contacts from their branch
      where = {
        AND: [
          where,
          {
            OR: [
              { sender: { branchId: req.user!.branchId } },
              { receiver: { branchId: req.user!.branchId } }
            ]
          }
        ]
      } as any;
    }

    // Get unique users from messages
    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            role: true,
            branchId: true,
            branch: { select: { name: true } }
          } 
        },
        receiver: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            role: true,
            branchId: true,
            branch: { select: { name: true } }
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Extract unique contacts
    const contactsMap = new Map();
    
    messages.forEach(message => {
      const otherUser = message.senderId === req.user!.id ? message.receiver : message.sender;
      
      if (!contactsMap.has(otherUser.id)) {
        contactsMap.set(otherUser.id, {
          ...otherUser,
          lastMessage: message,
          unreadCount: 0 // This would need a separate query to get actual unread count
        });
      }
    });

    const contacts = Array.from(contactsMap.values());

    res.json({
      success: true,
      data: { contacts }
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch contacts' });
  }
});

export { router as messagesRouter };