// WebSocket authentication and middleware
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { EventEmitter, BMSWebSocketEvent } from './events';

const prisma = new PrismaClient();

// WebSocket user interface
export interface WebSocketUser {
  id: string;
  email: string;
  name: string;
  role: string;
  branchId?: string;
}

// WebSocket connection interface
export interface AuthenticatedSocket extends Socket {
  user?: WebSocketUser;
  branchId?: string;
  connectedAt: Date;
}

// WebSocket event emitter instance
export const websocketEventEmitter = new EventEmitter();

// Authentication middleware for WebSocket connections
export const authenticateSocket = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): Promise<void> => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return next(new Error('Server configuration error'));
    }

    const decoded = jwt.verify(token, jwtSecret) as any;

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true
      },
    });

    if (!user || !user.isActive) {
      return next(new Error('Authentication error: Invalid token or user is inactive'));
    }

    // Attach user info to socket
    socket.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branchId || undefined
    };

    socket.branchId = user.branchId || undefined;
    socket.connectedAt = new Date();

    console.log(`✅ WebSocket authenticated: ${user.name} (${user.role}) from branch ${user.branchId || 'N/A'}`);

    next();
  } catch (error) {
    console.error('WebSocket authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new Error('Authentication error: Invalid token'));
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return next(new Error('Authentication error: Token expired'));
    }

    next(new Error('Authentication error'));
  }
};

// Authorization middleware for specific events
export const authorizeEvent = (eventTypes: string[]) => {
  return (socket: AuthenticatedSocket, event: BMSWebSocketEvent, next: (err?: Error) => void): void => {
    try {
      if (!socket.user) {
        return next(new Error('Authorization error: User not authenticated'));
      }

      // Check if user has access to the event branch
      if (event.branchId !== socket.branchId && socket.user.role !== 'ADMIN') {
        console.warn(`🔒 Authorization denied: User ${socket.user.id} attempted to access branch ${event.branchId} from branch ${socket.branchId}`);
        return next(new Error('Authorization error: Access denied to this branch'));
      }

      // Additional role-based permissions can be added here
      // For example, only managers and admins can receive sync status updates
      if (event.type === 'sync:status' && !['ADMIN', 'MANAGER'].includes(socket.user.role)) {
        return next(new Error('Authorization error: Insufficient permissions for sync status'));
      }

      next();
    } catch (error) {
      console.error('WebSocket authorization error:', error);
      next(new Error('Authorization error'));
    }
  };
};

// Rate limiting for WebSocket connections
export class WebSocketRateLimiter {
  private connections = new Map<string, { count: number; resetTime: number }>();
  private readonly maxConnections = 5; // Max connections per user
  private readonly windowMs = 60000; // 1 minute window

  isAllowed(userId: string): boolean {
    const now = Date.now();
    const userConnections = this.connections.get(userId);

    if (!userConnections || now > userConnections.resetTime) {
      this.connections.set(userId, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (userConnections.count >= this.maxConnections) {
      return false;
    }

    userConnections.count++;
    return true;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [userId, data] of this.connections.entries()) {
      if (now > data.resetTime) {
        this.connections.delete(userId);
      }
    }
  }
}

export const rateLimiter = new WebSocketRateLimiter();

// Connection management
export class ConnectionManager {
  private connections = new Map<string, AuthenticatedSocket>();
  private branchConnections = new Map<string, Set<string>>();

  addConnection(socket: AuthenticatedSocket): void {
    this.connections.set(socket.id, socket);
    
    if (socket.branchId) {
      if (!this.branchConnections.has(socket.branchId)) {
        this.branchConnections.set(socket.branchId, new Set());
      }
      this.branchConnections.get(socket.branchId)!.add(socket.id);
    }
  }

  removeConnection(socketId: string): void {
    const socket = this.connections.get(socketId);
    if (socket && socket.branchId) {
      const branchConnections = this.branchConnections.get(socket.branchId);
      if (branchConnections) {
        branchConnections.delete(socketId);
        if (branchConnections.size === 0) {
          this.branchConnections.delete(socket.branchId);
        }
      }
    }
    this.connections.delete(socketId);
  }

  getConnectionsByBranch(branchId: string): AuthenticatedSocket[] {
    const socketIds = this.branchConnections.get(branchId);
    if (!socketIds) return [];
    
    return Array.from(socketIds)
      .map(id => this.connections.get(id))
      .filter((socket): socket is AuthenticatedSocket => socket !== undefined);
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getConnectionCountByBranch(branchId: string): number {
    return this.branchConnections.get(branchId)?.size || 0;
  }

  broadcastToBranch(branchId: string, event: BMSWebSocketEvent): void {
    const connections = this.getConnectionsByBranch(branchId);
    connections.forEach(socket => {
      socket.emit(event.type, event);
    });
    console.log(`📡 Broadcasted ${event.type} to ${connections.length} connections in branch ${branchId}`);
  }

  broadcastToAll(event: BMSWebSocketEvent): void {
    this.connections.forEach(socket => {
      socket.emit(event.type, event);
    });
    console.log(`📡 Broadcasted ${event.type} to ${this.connections.size} total connections`);
  }

  getUserConnections(userId: string): AuthenticatedSocket[] {
    return Array.from(this.connections.values()).filter(socket => socket.user?.id === userId);
  }

  disconnectUser(userId: string): void {
    const userConnections = this.getUserConnections(userId);
    userConnections.forEach(socket => {
      socket.disconnect(true);
      this.removeConnection(socket.id);
    });
    console.log(`👋 Disconnected ${userConnections.length} connections for user ${userId}`);
  }
}

export const connectionManager = new ConnectionManager();

// Event logging and monitoring
export class WebSocketLogger {
  static logConnection(socket: AuthenticatedSocket): void {
    console.log(`🔗 WebSocket connected: ${socket.user?.name} (${socket.user?.role}) - ${socket.id}`);
  }

  static logDisconnection(socket: AuthenticatedSocket): void {
    console.log(`🔌 WebSocket disconnected: ${socket.user?.name} (${socket.user?.role}) - ${socket.id}`);
  }

  static logEvent(socket: AuthenticatedSocket, event: BMSWebSocketEvent): void {
    console.log(`📨 WebSocket event: ${event.type} from ${socket.user?.name} (${socket.user?.role}) in branch ${event.branchId}`);
  }

  static logError(socket: AuthenticatedSocket, error: Error): void {
    console.error(`❌ WebSocket error for ${socket.user?.name} (${socket.user?.role}):`, error.message);
  }

  static logUnauthorizedAttempt(socket: AuthenticatedSocket, eventType: string): void {
    console.warn(`🚫 Unauthorized WebSocket event attempt: ${eventType} by ${socket.user?.name} (${socket.user?.role})`);
  }
}

// Health check for WebSocket connections
export const checkConnectionHealth = (): { healthy: number; total: number; issues: string[] } => {
  const total = connectionManager.getConnectionCount();
  let healthy = 0;
  const issues: string[] = [];

  connectionManager.connections.forEach((socket, socketId) => {
    if (socket.connected) {
      healthy++;
    } else {
      issues.push(`Socket ${socketId} (${socket.user?.name}) is disconnected`);
      connectionManager.removeConnection(socketId);
    }
  });

  return { healthy, total, issues };
};

// Periodic cleanup
export const startPeriodicCleanup = (io: SocketIOServer): void => {
  setInterval(() => {
    rateLimiter.cleanup();
    
    const health = checkConnectionHealth();
    if (health.issues.length > 0) {
      console.log('🔧 WebSocket cleanup performed:', health);
    }
  }, 30000); // Every 30 seconds
};

// Export utility function to get socket info for debugging
export const getSocketInfo = (socket: AuthenticatedSocket) => ({
  id: socket.id,
  user: socket.user,
  branchId: socket.branchId,
  connectedAt: socket.connectedAt,
  connected: socket.connected,
  transport: socket.conn.transport.name
});