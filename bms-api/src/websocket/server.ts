// WebSocket Server for BMS - Real-time communication hub
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { 
  authenticateSocket, 
  authorizeEvent, 
  connectionManager, 
  rateLimiter,
  WebSocketLogger,
  startPeriodicCleanup,
  AuthenticatedSocket
} from './middleware';
import { 
  roomManager, 
  RoomNames, 
  RoomUtils 
} from './rooms';
import { 
  BMSWebSocketEvent, 
  websocketEventEmitter,
  validateEvent,
  createSystemNotificationEvent
} from './events';

// WebSocket server configuration
export interface WebSocketConfig {
  port: number;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  namespaces: {
    main: string;
    admin: string;
    pos: string;
  };
}

export class WebSocketServer {
  private io: SocketIOServer;
  private config: WebSocketConfig;

  constructor(httpServer: HTTPServer, config: WebSocketConfig) {
    this.config = config;
    this.io = new SocketIOServer(httpServer, {
      cors: config.cors,
      transports: ['websocket', 'polling'],
      allowUpgrades: true,
      upgradeTimeout: 10000,
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupNamespaces();
    this.setupEventHandlers();
    this.setupPeriodicTasks();
  }

  // Setup Socket.IO namespaces
  private setupNamespaces(): void {
    // Main namespace for all users
    const mainNamespace = this.io.of(this.config.namespaces.main);
    
    // Admin namespace (restricted access)
    const adminNamespace = this.io.of(this.config.namespaces.admin);
    
    // POS namespace for POS terminals
    const posNamespace = this.io.of(this.config.namespaces.pos);

    // Apply middleware to all namespaces
    [mainNamespace, adminNamespace, posNamespace].forEach(namespace => {
      namespace.use(authenticateSocket);
    });

    // Setup connection handlers
    [mainNamespace, adminNamespace, posNamespace].forEach(namespace => {
      namespace.on('connection', (socket: AuthenticatedSocket) => {
        this.handleConnection(socket, namespace.name);
      });
    });

    console.log(`🚀 WebSocket namespaces configured:`);
    console.log(`   - Main: /${this.config.namespaces.main}`);
    console.log(`   - Admin: /${this.config.namespaces.admin}`);
    console.log(`   - POS: /${this.config.namespaces.pos}`);
  }

  // Setup global event handlers
  private setupEventHandlers(): void {
    // Subscribe to our event emitter
    websocketEventEmitter.on('inventory:updated', (event) => {
      this.broadcastEvent(event);
    });

    websocketEventEmitter.on('product:updated', (event) => {
      this.broadcastEvent(event);
    });

    websocketEventEmitter.on('transaction:created', (event) => {
      this.broadcastEvent(event);
    });

    websocketEventEmitter.on('system:notification', (event) => {
      this.broadcastEvent(event);
    });

    websocketEventEmitter.on('user:updated', (event) => {
      this.broadcastEvent(event);
    });

    websocketEventEmitter.on('low-stock:alert', (event) => {
      this.broadcastEvent(event);
    });

    websocketEventEmitter.on('sync:status', (event) => {
      this.broadcastEvent(event);
    });
  }

  // Handle new connections
  private handleConnection(socket: AuthenticatedSocket, namespace: string): void {
    // Rate limiting check
    if (!rateLimiter.isAllowed(socket.user!.id)) {
      WebSocketLogger.logError(socket, new Error('Rate limit exceeded'));
      socket.emit('error', { message: 'Too many connections. Please try again later.' });
      socket.disconnect(true);
      return;
    }

    // Add to connection manager
    connectionManager.addConnection(socket);

    // Join appropriate rooms
    RoomUtils.joinUserRooms(socket, roomManager);

    // Log connection
    WebSocketLogger.logConnection(socket);

    // Send welcome event
    socket.emit('connected', {
      message: 'WebSocket connection established',
      timestamp: new Date(),
      namespace,
      user: socket.user,
      rooms: Array.from(roomManager.socketToRoom.get(socket.id) || [])
    });

    // Setup event listeners
    this.setupSocketEventListeners(socket);

    // Setup disconnect handler
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Setup error handler
    socket.on('error', (error) => {
      WebSocketLogger.logError(socket, error);
    });
  }

  // Setup event listeners for a specific socket
  private setupSocketEventListeners(socket: AuthenticatedSocket): void {
    // Join room event
    socket.on('join-room', (data: { roomId: string }) => {
      try {
        if (!data.roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }

        // Check if room exists, create if needed
        if (!roomManager.roomExists(data.roomId)) {
          roomManager.createRoom(data.roomId, 'branch', data.roomId, {
            branchId: socket.branchId,
            userId: socket.user?.id,
            role: socket.user?.role
          });
        }

        roomManager.joinRoom(socket, data.roomId);
        socket.emit('room-joined', { roomId: data.roomId });
        
        WebSocketLogger.logEvent(socket, {
          id: `join-room-${Date.now()}`,
          type: 'user:updated',
          timestamp: new Date(),
          branchId: socket.branchId || '',
          userId: socket.user?.id,
          data: { action: 'joined-room', roomId: data.roomId }
        } as BMSWebSocketEvent);

      } catch (error) {
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave room event
    socket.on('leave-room', (data: { roomId: string }) => {
      try {
        if (data.roomId) {
          roomManager.leaveRoom(socket.id, data.roomId);
          socket.emit('room-left', { roomId: data.roomId });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });

    // Get current rooms
    socket.on('get-rooms', () => {
      const socketRooms = roomManager.socketToRoom.get(socket.id) || new Set();
      socket.emit('rooms-list', {
        rooms: Array.from(socketRooms),
        count: socketRooms.size
      });
    });

    // Subscribe to specific event types
    socket.on('subscribe-events', (data: { eventTypes: string[] }) => {
      // Implementation for selective event subscription
      socket.emit('subscribed', { eventTypes: data.eventTypes });
    });
  }

  // Handle disconnections
  private handleDisconnection(socket: AuthenticatedSocket, reason: string): void {
    WebSocketLogger.logDisconnection(socket);
    
    // Leave all rooms
    RoomUtils.leaveUserRooms(socket, roomManager);
    
    // Remove from connection manager
    connectionManager.removeConnection(socket.id);

    // Handle specific disconnection reasons
    if (reason === 'io server disconnect') {
      // Server initiated disconnect
    } else if (reason === 'io client disconnect') {
      // Client initiated disconnect
    } else if (reason === 'transport close') {
      // Transport closed
    } else if (reason === 'ping timeout') {
      // Ping timeout
    }

    console.log(`🔌 Disconnection reason: ${reason}`);
  }

  // Broadcast event to appropriate rooms/users
  private broadcastEvent(event: BMSWebSocketEvent): void {
    try {
      // Validate event
      if (!validateEvent(event)) {
        console.error('Invalid event format:', event);
        return;
      }

      const eventRooms = RoomUtils.getEventRooms(event);
      
      if (eventRooms.length === 0) {
        // Broadcast to all connections if no specific rooms
        connectionManager.broadcastToAll(event);
      } else {
        // Broadcast to specific rooms
        eventRooms.forEach(roomId => {
          roomManager.broadcastToRoom(roomId, event);
        });
      }

      console.log(`📡 Broadcasted ${event.type} to ${eventRooms.length || 'all'} rooms`);

    } catch (error) {
      console.error('Error broadcasting event:', error);
    }
  }

  // Send event to specific user
  sendToUser(userId: string, event: BMSWebSocketEvent): void {
    const userConnections = connectionManager.getUserConnections(userId);
    userConnections.forEach(socket => {
      socket.emit(event.type, event);
    });
    console.log(`📤 Sent ${event.type} to ${userConnections.length} connections for user ${userId}`);
  }

  // Send event to specific branch
  sendToBranch(branchId: string, event: BMSWebSocketEvent): void {
    connectionManager.broadcastToBranch(branchId, event);
  }

  // Send system notification to all users
  sendSystemNotification(
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'error' | 'success',
    category: 'system' | 'inventory' | 'transaction' | 'user' | 'security',
    branchId?: string
  ): void {
    const event = createSystemNotificationEvent(
      title,
      message,
      severity,
      category,
      branchId || 'all'
    );

    if (branchId) {
      this.sendToBranch(branchId, event);
    } else {
      this.broadcastEvent(event);
    }
  }

  // Disconnect user
  disconnectUser(userId: string, reason: string = 'User disconnected'): void {
    const userConnections = connectionManager.getUserConnections(userId);
    userConnections.forEach(socket => {
      socket.emit('force-disconnect', { reason });
      socket.disconnect(true);
    });
    console.log(`👋 Disconnected ${userConnections.length} connections for user ${userId}`);
  }

  // Get server statistics
  getStats() {
    const connectionHealth = require('./middleware').checkConnectionHealth();
    const roomStats = roomManager.getAllStats();
    
    return {
      connections: {
        total: connectionHealth.total,
        healthy: connectionHealth.healthy,
        issues: connectionHealth.issues.length,
        details: connectionHealth.issues
      },
      rooms: roomStats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      namespaces: {
        [this.config.namespaces.main]: this.io.of(this.config.namespaces.main).sockets.size,
        [this.config.namespaces.admin]: this.io.of(this.config.namespaces.admin).sockets.size,
        [this.config.namespaces.pos]: this.io.of(this.config.namespaces.pos).sockets.size
      }
    };
  }

  // Setup periodic cleanup and monitoring
  private setupPeriodicTasks(): void {
    // Start periodic cleanup
    startPeriodicCleanup(this.io);

    // Log stats every 5 minutes
    setInterval(() => {
      const stats = this.getStats();
      console.log('📊 WebSocket Stats:', {
        connections: stats.connections.total,
        rooms: stats.rooms.totalRooms,
        namespaces: stats.namespaces
      });
    }, 300000); // 5 minutes

    // Cleanup rooms every hour
    setInterval(() => {
      roomManager.cleanupInactiveRooms();
    }, 3600000); // 1 hour

    // Monitor memory usage
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      if (memUsageMB > 500) { // Alert if using more than 500MB
        console.warn(`⚠️ High memory usage: ${memUsageMB}MB`);
        this.sendSystemNotification(
          'High Memory Usage',
          `WebSocket server is using ${memUsageMB}MB of memory`,
          'warning',
          'system'
        );
      }
    }, 120000); // 2 minutes
  }

  // Graceful shutdown
  shutdown(): Promise<void> {
    return new Promise((resolve) => {
      console.log('🛑 Shutting down WebSocket server...');

      // Force cleanup all rooms
      roomManager.forceCleanup();

      // Disconnect all clients
      this.io.close(() => {
        console.log('✅ WebSocket server shutdown complete');
        resolve();
      });

      // Force disconnect after timeout
      setTimeout(() => {
        this.io.disconnectSockets(true);
        resolve();
      }, 10000);
    });
  }
}

// Create and export WebSocket server instance
let wsServer: WebSocketServer | null = null;

export const createWebSocketServer = (
  httpServer: HTTPServer,
  config: WebSocketConfig
): WebSocketServer => {
  if (wsServer) {
    throw new Error('WebSocket server already initialized');
  }

  wsServer = new WebSocketServer(httpServer, config);
  return wsServer;
};

export const getWebSocketServer = (): WebSocketServer | null => {
  return wsServer;
};

// Export for use in other modules
export { BMSWebSocketEvent, websocketEventEmitter, connectionManager, roomManager };