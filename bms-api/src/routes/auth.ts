import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from '../validations/schemas';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { emailService } from '../services/email';
import { TokenService } from '../services/token-service';

// Simple in-memory rate limiting for password reset requests
const passwordResetAttempts = new Map<string, { count: number; lastAttempt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 3;

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

router.post('/logout', async (_req, res): Promise<void> => {
  try {
    // For JWT-based logout, we just return success
    // Client should clear the token
    res.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to logout' });
  }
});

// Change password endpoint
router.post('/change-password', authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    
    // Get user with password for validation
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, password: true, email: true }
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      res.status(400).json({ success: false, error: 'Current password is incorrect' });
      return;
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword }
    });

    console.log(`Password changed successfully for user: ${user.email}`);
    res.json({ success: true, message: 'Password changed successfully' });

  } catch (error: any) {
    console.error('Change password error:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ success: false, error: 'Invalid input data', details: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// Forgot password endpoint
router.post('/forgot-password', async (req, res): Promise<void> => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    // Rate limiting check
    const now = Date.now();
    const userAttempts = passwordResetAttempts.get(email);
    
    if (userAttempts) {
      const { count, lastAttempt } = userAttempts;
      
      // Reset counter if outside window
      if (now - lastAttempt > RATE_LIMIT_WINDOW) {
        passwordResetAttempts.set(email, { count: 1, lastAttempt: now });
      } else if (count >= MAX_ATTEMPTS) {
        const waitTime = Math.ceil((RATE_LIMIT_WINDOW - (now - lastAttempt)) / 60000);
        res.status(429).json({ 
          success: false, 
          error: `Too many password reset attempts. Please try again in ${waitTime} minutes.` 
        });
        return;
      } else {
        // Increment counter
        passwordResetAttempts.set(email, { count: count + 1, lastAttempt: now });
      }
    } else {
      // First attempt for this email
      passwordResetAttempts.set(email, { count: 1, lastAttempt: now });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, isActive: true }
    });

    // Always return success for security (don't reveal if email exists)
    if (!user || !user.isActive) {
      console.log(`Password reset attempt for non-existent email: ${email}`);
      res.json({ 
        success: true, 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
      return;
    }

    // Generate and store token using TokenService
    const tokenData = await TokenService.createToken({ 
      userId: user.id,
      expiresInHours: 1 
    });
    
    // Send password reset email
    const emailData = {
      to: user.email,
      userName: user.name,
      resetToken: tokenData.token,
      resetUrl: tokenData.resetUrl
    };

    const emailSent = await emailService.sendPasswordResetEmail(emailData);

    // Log successful token generation
    console.log(`🔐 Password reset initiated for user: ${user.email}`);
    console.log(`🔑 Reset token: ${tokenData.token}`);
    console.log(`⏰ Expires at: ${tokenData.expiresAt.toISOString()}`);
    console.log(`🔗 Reset URL: ${tokenData.resetUrl}`);
    console.log(`📧 Email sent: ${emailSent ? 'Yes' : 'No (check logs)'}`);

    res.json({ 
      success: true, 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ success: false, error: 'Invalid email address' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to process password reset request' });
  }
});

// Reset password endpoint
router.post('/reset-password', async (req, res): Promise<void> => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    // Validate token format
    if (!token || token.length < 32) {
      res.status(400).json({ success: false, error: 'Invalid reset token format' });
      return;
    }

    // Validate token using TokenService
    const validationResult = await TokenService.validateToken(token);
    
    if (!validationResult.isValid || !validationResult.data) {
      res.status(400).json({ 
        success: false, 
        error: validationResult.error || 'Invalid reset token' 
      });
      return;
    }

    const tokenData = validationResult.data;

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    await prisma.user.update({
      where: { id: tokenData.userId },
      data: { password: hashedNewPassword }
    });

    // Mark token as used
    await TokenService.markTokenAsUsed(token);

    console.log(`✅ Password reset successful for user: ${tokenData.user?.email || 'unknown'}`);
    res.json({ 
      success: true, 
      message: 'Password has been reset successfully. You can now login with your new password.' 
    });

  } catch (error: any) {
    console.error('Reset password error:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ success: false, error: 'Invalid input data', details: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

// NextAuth callback endpoints for OAuth-style flow
router.get('/callback/credentials', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.query;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email) },
      select: {
        id: true, email: true, password: true, name: true, role: true, branchId: true, isActive: true,
        branch: { select: { id: true, name: true } }
      }
    });
    
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(String(password), user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user.id, user.email, user.role, user.branchId || undefined);
    
    // Set JWT token in cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Redirect to success page
    res.redirect('/?authenticated=true');
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

router.post('/callback/credentials', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, password: true, name: true, role: true, branchId: true, isActive: true,
        branch: { select: { id: true, name: true } }
      }
    });
    
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user.id, user.email, user.role, user.branchId || undefined);
    
    // For NextAuth credentials provider, we return the user data
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branchId: user.branchId,
        branch: user.branch
      },
      token
    });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

export { router as authRouter };
