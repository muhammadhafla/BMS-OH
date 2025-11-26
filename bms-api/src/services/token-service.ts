import { PrismaClient } from '@prisma/client';
import { generatePasswordResetToken } from '../utils/token-generator';

export interface CreateTokenOptions {
  userId: string;
  expiresInHours?: number; // Default: 1 hour
}

export interface TokenStatus {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface CleanupResult {
  deletedCount: number;
  message: string;
}

export interface TokenCreationResult {
  token: string;
  expiresAt: Date;
  userId: string;
  createdAt: Date;
  emailSent: boolean;
  resetUrl: string;
}

const prisma = new PrismaClient();

/**
 * Token management service for password reset functionality
 * Handles creation, validation, and cleanup of password reset tokens
 */
export class TokenService {
  /**
   * Create a new password reset token for a user
   */
  static async createToken(options: CreateTokenOptions): Promise<TokenCreationResult> {
    try {
      const { userId, expiresInHours = 1 } = options;

      // Validate user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, isActive: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('User account is deactivated');
      }

      // Generate secure token
      const tokenData = generatePasswordResetToken(userId, expiresInHours);

      // Clean up any existing unused tokens for this user
      await this.cleanupUserTokens(userId, { onlyExpired: true });

      // Create token record in database
      const tokenRecord = await prisma.passwordResetToken.create({
        data: {
          token: tokenData.token,
          userId: userId,
          expiresAt: tokenData.expiresAt
        },
        include: {
          user: {
            select: { email: true, name: true }
          }
        }
      });

      // Generate reset URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${tokenData.token}`;

      return {
        token: tokenRecord.token,
        expiresAt: tokenRecord.expiresAt,
        userId: tokenRecord.userId,
        createdAt: tokenRecord.createdAt,
        emailSent: false, // This will be handled by the calling service
        resetUrl
      };

    } catch (error) {
      console.error('Token creation error:', error);
      throw error;
    }
  }

  /**
   * Validate a password reset token
   */
  static async validateToken(token: string): Promise<{ isValid: boolean; error?: string; data?: TokenStatus }> {
    try {
      if (!token) {
        return { isValid: false, error: 'Token is required' };
      }

      // Find token record with user information
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

      // Check if user is still active
      if (!tokenRecord.user.isActive) {
        return { isValid: false, error: 'User account is deactivated' };
      }

      // Check if token is expired
      if (tokenRecord.expiresAt < new Date()) {
        // Clean up expired token
        await this.deleteTokenById(tokenRecord.id);
        return { isValid: false, error: 'Reset token has expired' };
      }

      // Check if token was already used
      if (tokenRecord.used) {
        return { isValid: false, error: 'Reset token has already been used' };
      }

      return {
        isValid: true,
        data: {
          id: tokenRecord.id,
          token: tokenRecord.token,
          userId: tokenRecord.userId,
          expiresAt: tokenRecord.expiresAt,
          used: tokenRecord.used,
          createdAt: tokenRecord.createdAt,
          user: tokenRecord.user
        }
      };

    } catch (error) {
      console.error('Token validation error:', error);
      return { isValid: false, error: 'Token validation failed' };
    }
  }

  /**
   * Mark a token as used
   */
  static async markTokenAsUsed(token: string): Promise<boolean> {
    try {
      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { token }
      });

      if (!tokenRecord) {
        return false;
      }

      await prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { used: true }
      });

      return true;
    } catch (error) {
      console.error('Mark token as used error:', error);
      return false;
    }
  }

  /**
   * Delete a token by ID
   */
  static async deleteTokenById(tokenId: string): Promise<boolean> {
    try {
      await prisma.passwordResetToken.delete({
        where: { id: tokenId }
      });
      return true;
    } catch (error) {
      console.error('Delete token by ID error:', error);
      return false;
    }
  }

  /**
   * Delete all tokens for a specific user
   */
  static async deleteUserTokens(userId: string): Promise<number> {
    try {
      const result = await prisma.passwordResetToken.deleteMany({
        where: { userId }
      });
      return result.count;
    } catch (error) {
      console.error('Delete user tokens error:', error);
      return 0;
    }
  }

  /**
   * Clean up expired tokens for a specific user
   */
  static async cleanupUserTokens(userId: string, options: { onlyExpired?: boolean } = {}): Promise<number> {
    try {
      const { onlyExpired = false } = options;
      
      let deleteCondition: any = { userId };
      
      if (onlyExpired) {
        deleteCondition = {
          ...deleteCondition,
          OR: [
            { expiresAt: { lt: new Date() } },
            { used: true }
          ]
        };
      }

      const result = await prisma.passwordResetToken.deleteMany({
        where: deleteCondition
      });

      return result.count;
    } catch (error) {
      console.error('Cleanup user tokens error:', error);
      return 0;
    }
  }

  /**
   * Clean up all expired and used tokens
   */
  static async cleanupExpiredTokens(): Promise<CleanupResult> {
    try {
      const now = new Date();
      
      // Delete all expired or used tokens
      const result = await prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { used: true }
          ]
        }
      });

      console.log(`🧹 Token cleanup completed: ${result.count} tokens deleted`);
      
      return {
        deletedCount: result.count,
        message: `Cleaned up ${result.count} expired/used tokens`
      };
    } catch (error) {
      console.error('Cleanup expired tokens error:', error);
      return {
        deletedCount: 0,
        message: 'Token cleanup failed'
      };
    }
  }

  /**
   * Get token statistics
   */
  static async getTokenStats(): Promise<{
    total: number;
    expired: number;
    used: number;
    active: number;
  }> {
    try {
      const now = new Date();
      
      const [
        total,
        expired,
        used,
        active
      ] = await Promise.all([
        prisma.passwordResetToken.count(),
        prisma.passwordResetToken.count({
          where: { expiresAt: { lt: now } }
        }),
        prisma.passwordResetToken.count({
          where: { used: true }
        }),
        prisma.passwordResetToken.count({
          where: {
            expiresAt: { gte: now },
            used: false
          }
        })
      ]);

      return { total, expired, used, active };
    } catch (error) {
      console.error('Get token stats error:', error);
      return { total: 0, expired: 0, used: 0, active: 0 };
    }
  }

  /**
   * Schedule automatic cleanup of expired tokens
   * Call this when the server starts up
   */
  static async scheduleCleanup(): Promise<void> {
    try {
      // Run cleanup on server startup
      const result = await this.cleanupExpiredTokens();
      if (result.deletedCount > 0) {
        console.log(`🚀 Server startup cleanup: ${result.message}`);
      }

      // Schedule periodic cleanup every hour
      setInterval(async () => {
        const result = await this.cleanupExpiredTokens();
        if (result.deletedCount > 0) {
          console.log(`⏰ Scheduled cleanup: ${result.message}`);
        }
      }, 60 * 60 * 1000); // 1 hour

      console.log('⏰ Token cleanup scheduled to run every hour');
    } catch (error) {
      console.error('Schedule cleanup error:', error);
    }
  }
}

export default TokenService;