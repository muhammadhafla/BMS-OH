import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { loginSchema } from '../validations/schemas';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const generateToken = (userId: string, email: string, role: string, branchId?: string) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign({ userId, email, role, branchId }, jwtSecret, { expiresIn: '7d' });
};

router.post('/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, password: true, name: true, role: true, branchId: true, isActive: true,
        branch: { select: { id: true, name: true } }
      }
    });
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }
    const token = generateToken(user.id, user.email, user.role, user.branchId || undefined);
    res.json({ success: true, message: 'Login successful', data: { user: { id: user.id, email: user.email, name: user.name, role: user.role, branchId: user.branchId, branch: user.branch }, token } });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Invalid input data' });
  }
});

router.get('/me', authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true, branchId: true, isActive: true, createdAt: true, updatedAt: true, branch: { select: { id: true, name: true, address: true } } }
    });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
});

export { router as authRouter };
