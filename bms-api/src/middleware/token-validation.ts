import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateTokenFormat } from '../utils/token-generator';

export interface TokenValidationResult {
  isValid: boolean;
  error?: string;
  tokenData?: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    used: boolean;
    createdAt: Date;
  };
}

const prisma = new PrismaClient();

/**
 * Middleware to validate password reset tokens
 */
export async function validatePasswordResetToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.body.token || req.query.token;

    if (!token) {
      res.status(400).json({ 
        success: false, 
        error: 'Token is required' 
      });
      return;
    }

    if (typeof token !== 'string') {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid token format' 
      });
      return;
    }

    // Validate token format
    if (!validateTokenFormat(token)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid token format' 
      });
      return;
    }

    // Check if token exists in database
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: { id: true, email: true, name: true, isActive: true }
        }
      }
    });

    if (!tokenRecord) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired reset token' 
      });
      return;
    }

    // Check if user is still active
    if (!tokenRecord.user.isActive) {
      res.status(400).json({ 
        success: false, 
        error: 'User account is deactivated' 
      });
      return;
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({
        where: { id: tokenRecord.id }
      });
      
      res.status(400).json({ 
        success: false, 
        error: 'Reset token has expired' 
      });
      return;
    }

    // Check if token was already used
    if (tokenRecord.used) {
      res.status(400).json({ 
        success: false, 
        error: 'Reset token has already been used' 
      });
      return;
    }

    // Token is valid, attach to request for use in the route handler
    (req as any).tokenValidation = {
      isValid: true,
      tokenData: tokenRecord
    };

    next();

  } catch (error) {
    console.error('Token validation middleware error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Token validation failed' 
    });
  }
}

/**
 * Helper function to validate token without middleware pattern
 */
export async function validateTokenDirectly(token: string): Promise<TokenValidationResult> {
  try {
    if (!token || typeof token !== 'string') {
      return { isValid: false, error: 'Token is required' };
    }

    if (!validateTokenFormat(token)) {
      return { isValid: false, error: 'Invalid token format' };
    }

    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: { id: true, email: true, name: true, isActive: true }
        }
      }
    });

    if (!tokenRecord) {
      return { isValid: false, error: 'Invalid or expired reset token' };
    }

    if (!tokenRecord.user.isActive) {
      return { isValid: false, error: 'User account is deactivated' };
    }

    if (tokenRecord.expiresAt < new Date()) {
      return { isValid: false, error: 'Reset token has expired' };
    }

    if (tokenRecord.used) {
      return { isValid: false, error: 'Reset token has already been used' };
    }

    return {
      isValid: true,
      tokenData: tokenRecord
    };

  } catch (error) {
    console.error('Direct token validation error:', error);
    return { isValid: false, error: 'Token validation failed' };
  }
}