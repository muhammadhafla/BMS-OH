import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Request correlation ID generator
const generateCorrelationId = (): string => {
  return randomUUID();
};

// Enhanced logging utility
class AuthLogger {
  private static log(level: 'info' | 'warn' | 'error', message: string, context?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [AUTH] ${message}`;
    
    switch (level) {
      case 'info':
        console.log(`🔍 ${logMessage}`, context ? JSON.stringify(context, null, 2) : '');
        break;
      case 'warn':
        console.warn(`⚠️ ${logMessage}`, context ? JSON.stringify(context, null, 2) : '');
        break;
      case 'error':
        console.error(`❌ ${logMessage}`, context ? JSON.stringify(context, null, 2) : '');
        break;
    }
  }

  static info(message: string, context?: any) {
    this.log('info', message, context);
  }

  static warn(message: string, context?: any) {
    this.log('warn', message, context);
  }

  static error(message: string, context?: any) {
    this.log('error', message, context);
  }

  static requestStart(correlationId: string, method: string, path: string, ip: string) {
    this.info(`🔐 Auth request started`, {
      correlationId,
      method,
      path,
      clientIP: ip,
      timestamp: new Date().toISOString()
    });
  }

  static requestSuccess(correlationId: string, userId: string, role: string, duration: number) {
    this.info(`✅ Authentication successful`, {
      correlationId,
      userId,
      userRole: role,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  }

  static requestFailure(correlationId: string, errorType: string, reason: string, details?: any) {
    this.warn(`🚫 Authentication failed`, {
      correlationId,
      errorType,
      reason,
      details,
      timestamp: new Date().toISOString()
    });
  }

  static securityEvent(event: string, context: any) {
    this.warn(`🛡️ Security event: ${event}`, {
      ...context,
      timestamp: new Date().toISOString(),
      severity: 'high'
    });
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    branchId: string | undefined;
  };
  correlationId?: string;
}

export interface AuthError extends Error {
  type: 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'USER_NOT_FOUND' | 'USER_INACTIVE' | 'SERVER_ERROR';
  correlationId: string;
  details?: any;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  const correlationId = generateCorrelationId();
  req.correlationId = correlationId;

  try {
    // Log request start
    AuthLogger.requestStart(
      correlationId,
      req.method,
      req.path,
      req.ip || req.connection.remoteAddress || 'unknown'
    );

    const authHeader = req.headers.authorization;

    // Check for authorization header
    if (!authHeader) {
      const error: AuthError = new Error('No authorization header provided') as AuthError;
      error.type = 'TOKEN_MISSING';
      error.correlationId = correlationId;
      
      AuthLogger.requestFailure(correlationId, 'TOKEN_MISSING', 'No authorization header', {
        headers: Object.keys(req.headers),
        hasAuthHeader: !!authHeader
      });

      res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
        correlationId
      });
      return;
    }

    // Validate authorization header format
    if (!authHeader.startsWith('Bearer ')) {
      const error: AuthError = new Error('Invalid authorization header format') as AuthError;
      error.type = 'TOKEN_INVALID';
      error.correlationId = correlationId;
      
      AuthLogger.requestFailure(correlationId, 'TOKEN_INVALID', 'Invalid authorization header format', {
        headerFormat: authHeader.substring(0, 20) + '...',
        expectedFormat: 'Bearer <token>'
      });

      res.status(401).json({
        success: false,
        error: 'Invalid token format. Expected Bearer token.',
        correlationId
      });
      return;
    }

    const token = authHeader.substring(7);

    // Validate token is not empty
    if (!token || token.trim().length === 0) {
      const error: AuthError = new Error('Empty token provided') as AuthError;
      error.type = 'TOKEN_INVALID';
      error.correlationId = correlationId;
      
      AuthLogger.requestFailure(correlationId, 'TOKEN_INVALID', 'Empty token after Bearer prefix');

      res.status(401).json({
        success: false,
        error: 'Invalid token. Token cannot be empty.',
        correlationId
      });
      return;
    }

    // Check JWT secret configuration
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      const error: AuthError = new Error('JWT_SECRET not configured') as AuthError;
      error.type = 'SERVER_ERROR';
      error.correlationId = correlationId;
      error.details = { missingEnvVar: 'JWT_SECRET' };
      
      AuthLogger.error('Server configuration error - JWT_SECRET missing', { correlationId });
      
      res.status(500).json({
        success: false,
        error: 'Server configuration error.',
        correlationId
      });
      return;
    }

    // Verify and decode JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (jwtError: any) {
      const error: AuthError = new Error('Token verification failed') as AuthError;
      error.correlationId = correlationId;
      
      if (jwtError.name === 'JsonWebTokenError') {
        error.type = 'TOKEN_INVALID';
        AuthLogger.requestFailure(correlationId, 'TOKEN_INVALID', 'Invalid JWT token', {
          jwtError: jwtError.message,
          tokenPreview: token.substring(0, 20) + '...'
        });
        
        res.status(401).json({
          success: false,
          error: 'Invalid token.',
          correlationId
        });
        return;
      }
      
      if (jwtError.name === 'TokenExpiredError') {
        error.type = 'TOKEN_EXPIRED';
        AuthLogger.requestFailure(correlationId, 'TOKEN_EXPIRED', 'JWT token expired', {
          expiredAt: jwtError.expiredAt,
          tokenPreview: token.substring(0, 20) + '...'
        });
        
        res.status(401).json({
          success: false,
          error: 'Token expired.',
          correlationId
        });
        return;
      }

      // Unknown JWT error
      error.type = 'TOKEN_INVALID';
      AuthLogger.requestFailure(correlationId, 'TOKEN_INVALID', 'Unknown JWT error', {
        jwtErrorName: jwtError.name,
        jwtErrorMessage: jwtError.message
      });

      res.status(401).json({
        success: false,
        error: 'Invalid token.',
        correlationId
      });
      return;
    }

    // Validate decoded token structure
    if (!decoded || !decoded.userId) {
      const error: AuthError = new Error('Invalid token payload') as AuthError;
      error.type = 'TOKEN_INVALID';
      error.correlationId = correlationId;
      
      AuthLogger.requestFailure(correlationId, 'TOKEN_INVALID', 'Missing userId in token payload', {
        decodedKeys: decoded ? Object.keys(decoded) : null
      });

      res.status(401).json({
        success: false,
        error: 'Invalid token payload.',
        correlationId
      });
      return;
    }

    // Query user from database with error handling
    let user: any;
    try {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          branchId: true,
          isActive: true,
          createdAt: true
        },
      });
    } catch (dbError: any) {
      const error: AuthError = new Error('Database query failed') as AuthError;
      error.type = 'SERVER_ERROR';
      error.correlationId = correlationId;
      error.details = { dbError: dbError.message };
      
      AuthLogger.error('Database error during user lookup', {
        correlationId,
        userId: decoded.userId,
        dbError: dbError.message
      });

      res.status(500).json({
        success: false,
        error: 'Database error.',
        correlationId
      });
      return;
    }

    // Validate user exists
    if (!user) {
      const error: AuthError = new Error('User not found') as AuthError;
      error.type = 'USER_NOT_FOUND';
      error.correlationId = correlationId;
      
      AuthLogger.securityEvent('USER_NOT_FOUND', {
        correlationId,
        userId: decoded.userId,
        tokenUserId: decoded.userId,
        reason: 'User does not exist in database'
      });

      res.status(401).json({
        success: false,
        error: 'Invalid token or user not found.',
        correlationId
      });
      return;
    }

    // Validate user is active
    if (!user.isActive) {
      const error: AuthError = new Error('User account is inactive') as AuthError;
      error.type = 'USER_INACTIVE';
      error.correlationId = correlationId;
      
      AuthLogger.securityEvent('USER_INACTIVE_ACCESS_ATTEMPT', {
        correlationId,
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        createdAt: user.createdAt
      });

      res.status(401).json({
        success: false,
        error: 'Account is inactive. Please contact administrator.',
        correlationId
      });
      return;
    }

    // Set user context
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId ?? undefined,
    };

    const duration = Date.now() - startTime;
    AuthLogger.requestSuccess(correlationId, user.id, user.role, duration);

    next();
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Log unexpected errors
    const authError: AuthError = error as AuthError;
    if (!authError.correlationId) {
      authError.correlationId = correlationId;
    }

    AuthLogger.error('Unexpected authentication error', {
      correlationId,
      errorType: error.constructor.name,
      errorMessage: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      path: req.path,
      method: req.method
    });

    res.status(500).json({
      success: false,
      error: 'Authentication error.',
      correlationId
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const correlationId = req.correlationId || generateCorrelationId();

    try {
      if (!req.user) {
        AuthLogger.requestFailure(correlationId, 'UNAUTHORIZED', 'User not authenticated in authorize middleware', {
          path: req.path,
          method: req.method,
          requiredRoles: roles
        });

        res.status(401).json({
          success: false,
          error: 'Access denied. User not authenticated.',
          correlationId
        });
        return;
      }

      if (!roles.includes(req.user.role)) {
        AuthLogger.requestFailure(correlationId, 'FORBIDDEN', 'Insufficient permissions', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: roles,
          path: req.path,
          method: req.method
        });

        res.status(403).json({
          success: false,
          error: 'Access denied. Insufficient permissions.',
          correlationId
        });
        return;
      }

      AuthLogger.info(`✅ Authorization successful`, {
        correlationId,
        userId: req.user.id,
        userRole: req.user.role,
        path: req.path,
        method: req.method
      });

      next();
    } catch (error: any) {
      AuthLogger.error('Unexpected error in authorize middleware', {
        correlationId,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Authorization error.',
        correlationId
      });
    }
  };
};

export const requireBranchAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const correlationId = req.correlationId || generateCorrelationId();

  try {
    const branchId = req.params.branchId || req.body.branchId;

    if (!branchId) {
      AuthLogger.requestFailure(correlationId, 'BAD_REQUEST', 'Branch ID required but not provided', {
        path: req.path,
        method: req.method,
        params: req.params,
        body: Object.keys(req.body || {})
      });

      res.status(400).json({
        success: false,
        error: 'Branch ID is required.',
        correlationId
      });
      return;
    }

    // Admin can access all branches
    if (req.user?.role === 'ADMIN') {
      AuthLogger.info(`✅ Branch access granted (Admin)`, {
        correlationId,
        userId: req.user.id,
        branchId,
        path: req.path
      });

      next();
      return;
    }

    // Users can only access their own branch
    if (req.user?.branchId !== branchId) {
      AuthLogger.requestFailure(correlationId, 'FORBIDDEN', 'Cross-branch access denied', {
        correlationId,
        userId: req.user?.id,
        userBranchId: req.user?.branchId,
        requestedBranchId: branchId,
        path: req.path,
        method: req.method
      });

      res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own branch.',
        correlationId
      });
      return;
    }

    AuthLogger.info(`✅ Branch access granted`, {
      correlationId,
      userId: req.user?.id,
      branchId,
      path: req.path
    });

    next();
  } catch (error: any) {
    AuthLogger.error('Unexpected error in branch access validation', {
      correlationId,
      error: error.message,
      stack: error.stack,
      path: req.path
    });

    res.status(500).json({
      success: false,
      error: 'Branch access validation error.',
      correlationId
    });
  }
};

// Utility function to get auth statistics (useful for monitoring)
export const getAuthStats = () => {
  return {
    timestamp: new Date().toISOString(),
    middleware: 'auth',
    version: '2.0.0',
    features: [
      'Enhanced logging',
      'Correlation ID tracking',
      'Detailed error categorization',
      'Security event logging',
      'Performance monitoring'
    ]
  };
};