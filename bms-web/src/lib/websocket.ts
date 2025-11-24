import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/stores/authStore';

// WebSocket event types matching backend
export interface BMSWebSocketEvent {
  id: string;
  type: string;
  timestamp: Date;
  branchId: string;
  userId?: string;
  data: Record<string, unknown>;
}

// WebSocket connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// WebSocket client configuration
export interface WebSocketConfig {
  url: string;
  namespaces: {
    main: string;
    admin: string;
    pos: string;
  };
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

// Default configuration
const DEFAULT_CONFIG: WebSocketConfig = {
  url: process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:3001',
  namespaces: {
    main: '/main',
    admin: '/admin',
    pos: '/pos',
  },
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
};

// Event handler type
export type EventHandler = (event: BMSWebSocketEvent) => void | Promise<void>;

// WebSocket client class
export class WebSocketClient {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private connectionState: ConnectionState = 'disconnected';
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isIntentionallyDisconnected = false;
  private connectionStartTime: Date | null = null;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Initialize connection
  async connect(namespace: 'main' | 'admin' | 'pos' = 'main'): Promise<Socket> {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return this.socket;
    }

    this.connectionState = 'connecting';
    this.isIntentionallyDisconnected = false;
    this.connectionStartTime = new Date();

    try {
      // Get auth token
      const token = Cookies.get('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const socketOptions = {
        transports: ['websocket', 'polling'] as any,
        auth: {
          token,
        },
        timeout: 10000,
        forceNew: true,
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
      } as any;

      // Connect to the specified namespace
      const namespacePath = this.config.namespaces[namespace];
      this.socket = io(`${this.config.url}${namespacePath}`, socketOptions);

      this.setupSocketListeners();
      
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Failed to create socket'));
          return;
        }

        this.socket.on('connect', () => {
          console.log(`🚀 WebSocket connected to ${namespacePath}`);
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          
          // Join user-specific rooms
          const user = useAuthStore.getState().user;
          if (user?.branchId) {
            this.joinRoom(`branch-${user.branchId}`);
          }
          if (user?.id) {
            this.joinRoom(`user-${user.id}`);
          }

          resolve(this.socket!);
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.connectionState = 'error';
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          this.handleDisconnection(reason);
        });

        this.socket.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.connectionState = 'error';
        });
      });

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.connectionState = 'error';
      throw error;
    }
  }

  // Setup socket event listeners
  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.connectionState = 'connected';
      this.notifyConnectionStateListeners();
    });

    this.socket.on('disconnect', (reason) => {
      this.handleDisconnection(reason);
    });

    this.socket.on('reconnect', () => {
      console.log('🔄 WebSocket reconnected');
      this.connectionState = 'connected';
      this.notifyConnectionStateListeners();
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      this.connectionState = 'reconnecting';
      this.notifyConnectionStateListeners();
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
      this.connectionState = 'error';
      this.notifyConnectionStateListeners();
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Reconnection failed');
      this.connectionState = 'error';
      this.notifyConnectionStateListeners();
    });

    // Welcome event from server
    this.socket.on('connected', (data) => {
      console.log('✅ WebSocket connection confirmed:', data);
    });

    // System events
    this.socket.on('system:notification', (event: BMSWebSocketEvent) => {
      this.emitEvent('system:notification', event);
    });

    // Real-time data events
    this.socket.on('inventory:updated', (event: BMSWebSocketEvent) => {
      this.emitEvent('inventory:updated', event);
    });

    this.socket.on('product:updated', (event: BMSWebSocketEvent) => {
      this.emitEvent('product:updated', event);
    });

    this.socket.on('transaction:created', (event: BMSWebSocketEvent) => {
      this.emitEvent('transaction:created', event);
    });

    this.socket.on('low-stock:alert', (event: BMSWebSocketEvent) => {
      this.emitEvent('low-stock:alert', event);
    });

    this.socket.on('user:updated', (event: BMSWebSocketEvent) => {
      this.emitEvent('user:updated', event);
    });

    // Room events
    this.socket.on('room-joined', (data) => {
      console.log(`📍 Joined room: ${data.roomId}`);
    });

    this.socket.on('room-left', (data) => {
      console.log(`📍 Left room: ${data.roomId}`);
    });

    this.socket.on('rooms-list', (data) => {
      console.log(`📍 Current rooms: ${data.rooms.join(', ')}`);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('WebSocket server error:', error);
      this.emitEvent('error', { 
        id: 'error-' + Date.now(),
        type: 'error',
        timestamp: new Date(),
        branchId: '',
        data: { message: error.message, error }
      } as BMSWebSocketEvent);
    });

    this.socket.on('force-disconnect', (data) => {
      console.log('🔌 Force disconnect:', data.reason);
      this.isIntentionallyDisconnected = true;
      this.disconnect();
    });
  }

  // Handle disconnection
  private handleDisconnection(reason: string): void {
    this.connectionState = 'disconnected';
    this.notifyConnectionStateListeners();

    // Handle different disconnection reasons
    if (reason === 'io server disconnect') {
      // Server initiated disconnect
      console.log('🔌 Disconnected by server');
    } else if (reason === 'io client disconnect') {
      // Client initiated disconnect
      console.log('🔌 Disconnected by client');
    } else if (reason === 'transport close') {
      // Transport closed
      console.log('🔌 Transport closed');
    } else if (reason === 'ping timeout') {
      // Ping timeout
      console.log('🔌 Ping timeout');
    }

    // Automatic reconnection for unexpected disconnects
    if (!this.isIntentionallyDisconnected && this.config.reconnection) {
      this.scheduleReconnect();
    }
  }

  // Schedule reconnection with exponential backoff
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.connectionState = 'error';
      this.notifyConnectionStateListeners();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`⏰ Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.socket?.connected && !this.isIntentionallyDisconnected) {
        console.log('🔄 Attempting reconnection...');
        this.socket?.connect();
      }
    }, delay);
  }

  // Disconnect
  disconnect(): void {
    this.isIntentionallyDisconnected = true;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionState = 'disconnected';
    this.notifyConnectionStateListeners();
  }

  // Join a room
  joinRoom(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-room', { roomId });
    }
  }

  // Leave a room
  leaveRoom(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-room', { roomId });
    }
  }

  // Get current rooms
  getCurrentRooms(): Promise<string[]> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve([]);
        return;
      }

      const timeout = setTimeout(() => resolve([]), 5000);
      
      this.socket.emit('get-rooms');
      this.socket.once('rooms-list', (data) => {
        clearTimeout(timeout);
        resolve(data.rooms);
      });
    });
  }

  // Send ping
  ping(): void {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }

  // Subscribe to events
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    
    this.eventHandlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(eventType);
        }
      }
    };
  }

  // Unsubscribe from events
  off(eventType: string, handler?: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      if (handler) {
        handlers.delete(handler);
      } else {
        handlers.clear();
      }
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    }
  }

  // Emit event to handlers
  private emitEvent(eventType: string, event: BMSWebSocketEvent): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }

  // Connection state management
  private connectionStateListeners: Set<(state: ConnectionState) => void> = new Set();

  onConnectionStateChange(listener: (state: ConnectionState) => void): () => void {
    this.connectionStateListeners.add(listener);
    return () => {
      this.connectionStateListeners.delete(listener);
    };
  }

  private notifyConnectionStateListeners(): void {
    this.connectionStateListeners.forEach(listener => {
      try {
        listener(this.connectionState);
      } catch (error) {
        console.error('Error in connection state listener:', error);
      }
    });
  }

  // Getters
  get state(): ConnectionState {
    return this.connectionState;
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get connectionDuration(): number {
    if (!this.connectionStartTime) return 0;
    return Date.now() - this.connectionStartTime.getTime();
  }

  // Get connection stats
  getStats() {
    return {
      connected: this.isConnected,
      state: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      connectionDuration: this.connectionDuration,
      subscribedEvents: Array.from(this.eventHandlers.keys()),
      socketId: this.socket?.id,
    };
  }
}

// Create and export singleton instance
let webSocketClient: WebSocketClient | null = null;

export const getWebSocketClient = (): WebSocketClient => {
  if (!webSocketClient) {
    webSocketClient = new WebSocketClient();
  }
  return webSocketClient;
};

// Export WebSocket client factory
export const createWebSocketClient = (config?: Partial<WebSocketConfig>): WebSocketClient => {
  return new WebSocketClient(config);
};

// Export specific client for different namespaces
export const createWebSocketClientForNamespace = (
  _namespace: 'main' | 'admin' | 'pos',
  config?: Partial<WebSocketConfig>
): WebSocketClient => {
  const client = new WebSocketClient(config);
  // Store by namespace for potential future use
  return client;
};