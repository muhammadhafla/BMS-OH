import { io, Socket } from 'socket.io-client';
import { syncService, SyncStatus } from './SyncService';

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

// POS-specific WebSocket configuration
export interface POSWebSocketConfig {
  url: string;
  namespaces: {
    main: string;
    admin: string;
    pos: string;
  };
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelayMs?: number;
  syncServiceIntegration?: boolean;
  heartbeatInterval?: number;
  maxMemoryUsage?: number; // MB
}

// Default configuration for POS with performance optimizations
const DEFAULT_POS_CONFIG: POSWebSocketConfig = {
  url: process.env.VITE_WS_URL || process.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:3001',
  namespaces: {
    main: '/main',
    admin: '/admin',
    pos: '/pos',
  },
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelayMs: 2000,
  syncServiceIntegration: true,
  heartbeatInterval: 30000, // 30 seconds
  maxMemoryUsage: 100, // 100MB max
};

// Event handler type
export type EventHandler = (event: BMSWebSocketEvent) => void | Promise<void>;

// Sync status event handler
export type SyncStatusHandler = (status: SyncStatus & { websocketState?: ConnectionState }) => void;

// Memory management utilities
class MemoryManager {
  private static instance: MemoryManager;
  private memoryUsage: Map<string, number> = new Map();
  private maxMemoryUsage: number;

  constructor(maxMemoryUsage: number = 100) {
    this.maxMemoryUsage = maxMemoryUsage * 1024 * 1024; // Convert MB to bytes
  }

  static getInstance(maxMemoryUsage?: number): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager(maxMemoryUsage);
    }
    return MemoryManager.instance;
  }

  trackMemoryUsage(key: string, size: number): void {
    this.memoryUsage.set(key, size);
    this.checkMemoryUsage();
  }

  releaseMemory(key: string): void {
    this.memoryUsage.delete(key);
  }

  private checkMemoryUsage(): void {
    const totalUsage = Array.from(this.memoryUsage.values()).reduce((sum, size) => sum + size, 0);
    
    if (totalUsage > this.maxMemoryUsage) {
      console.warn(`⚠️ High memory usage detected: ${(totalUsage / 1024 / 1024).toFixed(2)}MB`);
      this.cleanupOldData();
    }
  }

  private cleanupOldData(): void {
    // Clean up old event handlers, old data, etc.
    // This is a simplified implementation
    const entries = Array.from(this.memoryUsage.entries());
    entries.sort((a, b) => a[1] - b[1]); // Sort by size
    
    // Remove smallest entries first
    const toRemove = entries.slice(0, Math.floor(entries.length * 0.2));
    toRemove.forEach(([key]) => {
      this.releaseMemory(key);
    });
    
    console.log('🧹 Cleaned up memory usage');
  }

  getMemoryStats(): { total: number; count: number; breakdown: Record<string, number> } {
    const total = Array.from(this.memoryUsage.values()).reduce((sum, size) => sum + size, 0);
    const breakdown: Record<string, number> = {};
    
    this.memoryUsage.forEach((size, key) => {
      breakdown[key] = size;
    });

    return {
      total,
      count: this.memoryUsage.size,
      breakdown
    };
  }
}

// Optimized POS WebSocket Service class
export class POSWebSocketServiceOptimized {
  private socket: Socket | null = null;
  private config: POSWebSocketConfig;
  private connectionState: ConnectionState = 'disconnected';
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private syncStatusHandlers: Set<SyncStatusHandler> = new Set();
  private connectionStateListeners: Set<(state: ConnectionState) => void> = new Set();
  
  // Connection management
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private isIntentionallyDisconnected = false;
  private connectionStartTime: Date | null = null;
  
  // Memory and performance management
  private memoryManager = MemoryManager.getInstance(DEFAULT_POS_CONFIG.maxMemoryUsage);
  private eventHistory: BMSWebSocketEvent[] = [];
  private maxEventHistory = 100;
  
  // Cleanup management
  private cleanupIntervals: Set<NodeJS.Timeout> = new Set();
  private eventHandlerReferences: WeakMap<EventHandler, string> = new WeakMap();
  
  // Performance monitoring
  private connectionMetrics = {
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    averageConnectionTime: 0,
    lastConnectionTime: 0
  };

  constructor(config: Partial<POSWebSocketConfig> = {}) {
    this.config = { ...DEFAULT_POS_CONFIG, ...config };
    this.setupMemoryTracking();
  }

  private setupMemoryTracking(): void {
    // Track initial memory usage
    this.memoryManager.trackMemoryUsage('websocket-service', this.estimateObjectSize(this));
  }

  private estimateObjectSize(obj: any): number {
    // Rough estimation of object size in memory
    return JSON.stringify(obj).length * 2; // Rough estimate
  }

  // Initialize POS WebSocket connection with performance optimizations
  async connect(namespace: 'main' | 'admin' | 'pos' = 'pos'): Promise<Socket> {
    if (this.socket?.connected) {
      console.log('🚀 POS WebSocket already connected');
      return this.socket;
    }

    this.connectionState = 'connecting';
    this.isIntentionallyDisconnected = false;
    this.connectionStartTime = new Date();
    this.connectionMetrics.totalConnections++;

    const connectionStartTime = Date.now();

    try {
      // Get auth token from Electron app or storage
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const socketOptions: any = {
        transports: ['websocket', 'polling'],
        auth: {
          token,
        },
        timeout: 15000,
        forceNew: true,
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelayMs,
        // Performance optimizations
        upgrade: true,
        rememberUpgrade: true,
      };

      // Connect to the POS namespace for optimal performance
      const namespacePath = this.config.namespaces[namespace];
      this.socket = io(`${this.config.url}${namespacePath}`, socketOptions);

      this.setupSocketListeners();
      
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Failed to create socket'));
          return;
        }

        const connectionTimeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 20000);

        this.socket.on('connect', async () => {
          clearTimeout(connectionTimeout);
          const connectionTime = Date.now() - connectionStartTime;
          this.connectionMetrics.successfulConnections++;
          this.connectionMetrics.lastConnectionTime = connectionTime;
          this.updateAverageConnectionTime(connectionTime);
          
          console.log(`🚀 POS WebSocket connected to ${namespacePath} in ${connectionTime}ms`);
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          
          // Join POS-specific rooms
          await this.joinPOSRooms();
          
          // Start periodic tasks with cleanup tracking
          this.startPeriodicTasks();

          resolve(this.socket!);
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(connectionTimeout);
          this.connectionMetrics.failedConnections++;
          console.error('POS WebSocket connection error:', error);
          this.connectionState = 'error';
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          clearTimeout(connectionTimeout);
          console.log('POS WebSocket disconnected:', reason);
          this.handleDisconnection(reason);
        });

        this.socket.on('error', (error) => {
          clearTimeout(connectionTimeout);
          console.error('POS WebSocket error:', error);
          this.connectionState = 'error';
        });
      });

    } catch (error) {
      this.connectionMetrics.failedConnections++;
      console.error('Failed to connect POS WebSocket:', error);
      this.connectionState = 'error';
      throw error;
    }
  }

  private updateAverageConnectionTime(connectionTime: number): void {
    const { successfulConnections, averageConnectionTime } = this.connectionMetrics;
    this.connectionMetrics.averageConnectionTime = 
      (averageConnectionTime * (successfulConnections - 1) + connectionTime) / successfulConnections;
  }

  // Get authentication token
  private async getAuthToken(): Promise<string | null> {
    // Fallback to local storage for browser environments
    return localStorage.getItem('auth_token');
  }

  // Join POS-specific rooms
  private async joinPOSRooms(): Promise<void> {
    if (!this.socket?.connected) return;

    try {
      // Join main POS room
      this.joinRoom('pos-terminal');
      
      // Join room for real-time sync updates
      this.joinRoom('sync-updates');

    } catch (error) {
      console.error('Error joining POS rooms:', error);
    }
  }

  // Setup socket event listeners with memory management
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
      console.log('🔄 POS WebSocket reconnected');
      this.connectionState = 'connected';
      this.notifyConnectionStateListeners();
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 POS reconnection attempt ${attemptNumber}`);
      this.connectionState = 'reconnecting';
      this.notifyConnectionStateListeners();
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('POS reconnection error:', error);
      this.connectionState = 'error';
      this.notifyConnectionStateListeners();
    });

    this.socket.on('reconnect_failed', () => {
      console.error('POS reconnection failed');
      this.connectionState = 'error';
      this.notifyConnectionStateListeners();
    });

    // Welcome event from server
    this.socket.on('connected', (data) => {
      console.log('✅ POS WebSocket connection confirmed:', data);
    });

    // POS-specific real-time events with memory management
    this.socket.on('sync:status', (event: BMSWebSocketEvent) => {
      this.handleEventWithMemoryManagement('sync:status', event, () => {
        console.log('📊 Real-time sync status update received:', event.data);
        this.handleSyncStatusUpdate(event);
        this.emitEvent('sync:status', event);
      });
    });

    this.socket.on('product:updated', (event: BMSWebSocketEvent) => {
      this.handleEventWithMemoryManagement('product:updated', event, () => {
        console.log('📦 Product update received for POS:', event.data);
        this.emitEvent('product:updated', event);
        
        // Trigger immediate sync to update local cache
        if (this.config.syncServiceIntegration) {
          setTimeout(() => {
            syncService.syncProductsOnly().catch(error => {
              console.error('Failed to sync products after update:', error);
            });
          }, 1000);
        }
      });
    });

    this.socket.on('inventory:updated', (event: BMSWebSocketEvent) => {
      this.handleEventWithMemoryManagement('inventory:updated', event, () => {
        console.log('📋 Inventory update received for POS:', event.data);
        this.emitEvent('inventory:updated', event);
        
        // Trigger sync for inventory updates
        if (this.config.syncServiceIntegration) {
          setTimeout(() => {
            syncService.syncProductsOnly().catch(error => {
              console.error('Failed to sync inventory after update:', error);
            });
          }, 1000);
        }
      });
    });

    this.socket.on('system:notification', (event: BMSWebSocketEvent) => {
      this.handleEventWithMemoryManagement('system:notification', event, () => {
        console.log('🔔 System notification received:', event.data);
        this.emitEvent('system:notification', event);
      });
    });

    this.socket.on('low-stock:alert', (event: BMSWebSocketEvent) => {
      this.handleEventWithMemoryManagement('low-stock:alert', event, () => {
        console.log('⚠️ Low stock alert received:', event.data);
        this.emitEvent('low-stock:alert', event);
      });
    });

    // Room events
    this.socket.on('room-joined', (data) => {
      console.log(`📍 POS joined room: ${data.roomId}`);
    });

    this.socket.on('room-left', (data) => {
      console.log(`📍 POS left room: ${data.roomId}`);
    });

    this.socket.on('rooms-list', (data) => {
      console.log(`📍 POS current rooms: ${data.rooms.join(', ')}`);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('POS WebSocket server error:', error);
      this.emitEvent('error', {
        id: `error-${Date.now()}`,
        type: 'error',
        timestamp: new Date(),
        branchId: 'unknown',
        data: { message: error.message, error: error.toString() }
      });
    });

    this.socket.on('force-disconnect', (data) => {
      console.log('🔌 POS force disconnect:', data.reason);
      this.isIntentionallyDisconnected = true;
      this.disconnect();
    });
  }

  // Memory-managed event handler
  private handleEventWithMemoryManagement(eventType: string, event: BMSWebSocketEvent, handler: () => void): void {
    try {
      // Add to event history with size tracking
      this.eventHistory.push(event);
      this.memoryManager.trackMemoryUsage(`event-${eventType}`, this.estimateObjectSize(event));
      
      // Limit event history size
      if (this.eventHistory.length > this.maxEventHistory) {
        const oldEvent = this.eventHistory.shift();
        if (oldEvent) {
          this.memoryManager.releaseMemory(`event-${oldEvent.type}`);
        }
      }
      
      handler();
    } catch (error) {
      console.error(`Error in memory-managed event handler for ${eventType}:`, error);
    }
  }

  // Handle sync status updates
  private handleSyncStatusUpdate(event: BMSWebSocketEvent): void {
    try {
      const syncStatusData = event.data as Partial<SyncStatus>;
      
      if (syncStatusData) {
        // Update current sync status with websocket state
        const updatedStatus = {
          ...syncService.getSyncStatus(),
          ...syncStatusData,
          websocketState: this.connectionState,
          lastWebSocketUpdate: new Date(),
        } as SyncStatus & { websocketState?: ConnectionState; lastWebSocketUpdate?: Date };

        // Notify sync status handlers
        this.notifySyncStatusHandlers(updatedStatus);
      }
    } catch (error) {
      console.error('Error handling sync status update:', error);
    }
  }

  // Start periodic tasks with proper cleanup tracking
  private startPeriodicTasks(): void {
    this.stopPeriodicTasks(); // Clear existing tasks
    
    // Start sync status monitoring
    this.startSyncStatusMonitoring();
    
    // Start ping for connection health
    this.startPingPong();
    
    // Start memory cleanup
    this.startMemoryCleanup();
  }

  // Start sync status monitoring
  private startSyncStatusMonitoring(): void {
    const interval = setInterval(() => {
      if (this.socket?.connected && this.config.syncServiceIntegration) {
        const currentSyncStatus = syncService.getSyncStatus();
        this.notifySyncStatusHandlers({
          ...currentSyncStatus,
          websocketState: this.connectionState,
          lastWebSocketUpdate: new Date(),
        } as SyncStatus & { websocketState?: ConnectionState; lastWebSocketUpdate?: Date });
      }
    }, 5000); // Check every 5 seconds
    
    this.cleanupIntervals.add(interval);
  }

  // Start ping/pong for connection health
  private startPingPong(): void {
    const interval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, this.config.heartbeatInterval || 30000); // Configurable heartbeat
    
    this.cleanupIntervals.add(interval);
  }

  // Start memory cleanup
  private startMemoryCleanup(): void {
    const interval = setInterval(() => {
      this.performMemoryCleanup();
    }, 60000); // Every minute
    
    this.cleanupIntervals.add(interval);
  }

  // Perform memory cleanup
  private performMemoryCleanup(): void {
    // Clean up old event history
    if (this.eventHistory.length > this.maxEventHistory * 0.8) {
      const toRemove = this.eventHistory.splice(0, this.eventHistory.length - this.maxEventHistory);
      toRemove.forEach(event => {
        this.memoryManager.releaseMemory(`event-${event.type}`);
      });
    }

    // Log memory stats periodically
    const stats = this.memoryManager.getMemoryStats();
    if (stats.total > 50 * 1024 * 1024) { // 50MB threshold
      console.log(`📊 Memory usage: ${(stats.total / 1024 / 1024).toFixed(2)}MB across ${stats.count} items`);
    }
  }

  // Handle disconnection with improved cleanup
  private handleDisconnection(reason: string): void {
    this.connectionState = 'disconnected';
    this.notifyConnectionStateListeners();

    // Handle different disconnection reasons
    if (reason === 'io server disconnect') {
      console.log('🔌 POS disconnected by server');
    } else if (reason === 'io client disconnect') {
      console.log('🔌 POS disconnected by client');
    } else if (reason === 'transport close') {
      console.log('🔌 POS transport closed');
    } else if (reason === 'ping timeout') {
      console.log('🔌 POS ping timeout');
    }

    // Stop periodic tasks
    this.stopPeriodicTasks();

    // Automatic reconnection for unexpected disconnects
    if (!this.isIntentionallyDisconnected && this.config.reconnection) {
      this.scheduleReconnect();
    }
  }

  // Schedule reconnection with exponential backoff
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ POS max reconnection attempts reached');
      this.connectionState = 'error';
      this.notifyConnectionStateListeners();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 60000);
    
    console.log(`⏰ POS scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    const timeout = setTimeout(() => {
      if (!this.socket?.connected && !this.isIntentionallyDisconnected) {
        console.log('🔄 POS attempting reconnection...');
        this.socket?.connect();
      }
    }, delay);
    
    this.cleanupIntervals.add(timeout);
  }

  // Stop periodic tasks with cleanup tracking
  private stopPeriodicTasks(): void {
    this.cleanupIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.cleanupIntervals.clear();
  }

  // Disconnect with comprehensive cleanup
  disconnect(): void {
    this.isIntentionallyDisconnected = true;
    this.stopPeriodicTasks();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionState = 'disconnected';
    this.notifyConnectionStateListeners();
    
    // Clear all memory tracking
    this.clearMemoryTracking();
  }

  // Clear memory tracking
  private clearMemoryTracking(): void {
    this.eventHistory.forEach(event => {
      this.memoryManager.releaseMemory(`event-${event.type}`);
    });
    this.eventHistory = [];
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

  // Subscribe to events with memory tracking
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    
    const handlers = this.eventHandlers.get(eventType)!;
    handlers.add(handler);
    this.eventHandlerReferences.set(handler, eventType);
    
    // Track memory usage for event handlers
    this.memoryManager.trackMemoryUsage(`handler-${eventType}`, this.estimateObjectSize(handler));

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler);
    };
  }

  // Unsubscribe from events with memory cleanup
  off(eventType: string, handler?: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      if (handler) {
        handlers.delete(handler);
        this.memoryManager.releaseMemory(`handler-${eventType}`);
      } else {
        handlers.clear();
        this.memoryManager.releaseMemory(`handler-${eventType}`);
      }
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    }
  }

  // Emit event to handlers with error boundaries
  private emitEvent(eventType: string, event: BMSWebSocketEvent): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in POS event handler for ${eventType}:`, error);
          // Remove faulty handler to prevent future errors
          handlers.delete(handler);
          this.memoryManager.releaseMemory(`handler-${eventType}`);
        }
      });
    }
  }

  // Sync status subscription
  onSyncStatusChange(handler: SyncStatusHandler): () => void {
    this.syncStatusHandlers.add(handler);
    return () => {
      this.syncStatusHandlers.delete(handler);
    };
  }

  private notifySyncStatusHandlers(status: SyncStatus & { websocketState?: ConnectionState }): void {
    this.syncStatusHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        console.error('Error in POS sync status handler:', error);
      }
    });
  }

  // Connection state management
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
        console.error('Error in POS connection state listener:', error);
      }
    });
  }

  // Manual sync trigger with WebSocket notification
  async triggerSyncWithNotification(): Promise<void> {
    try {
      console.log('🔄 POS triggering manual sync with WebSocket notification');
      
      // Notify server about manual sync
      if (this.socket?.connected) {
        this.socket.emit('manual-sync-trigger', {
          clientId: this.getClientId(),
          timestamp: new Date(),
          reason: 'manual-trigger'
        });
      }

      // Perform local sync
      const result = await syncService.syncNow();
      
      // Broadcast sync result
      if (this.socket?.connected) {
        this.socket.emit('sync-result', {
          result,
          clientId: this.getClientId(),
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('Failed to trigger sync with notification:', error);
      
      // Notify server about sync failure
      if (this.socket?.connected) {
        this.socket.emit('sync-error', {
          error: error instanceof Error ? error.message : 'Unknown sync error',
          clientId: this.getClientId(),
          timestamp: new Date()
        });
      }
    }
  }

  // Get unique client ID
  private getClientId(): string {
    // Generate or retrieve unique client ID for this POS terminal
    let clientId = localStorage.getItem('pos-client-id');
    if (!clientId) {
      clientId = `pos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('pos-client-id', clientId);
    }
    return clientId;
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

  // Get comprehensive stats including performance metrics
  getStats() {
    const syncStats = syncService.getSyncStatus();
    const memoryStats = this.memoryManager.getMemoryStats();
    
    return {
      connected: this.isConnected,
      state: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      connectionDuration: this.connectionDuration,
      subscribedEvents: Array.from(this.eventHandlers.keys()),
      socketId: this.socket?.id,
      syncStatus: syncStats,
      clientId: this.getClientId(),
      memory: memoryStats,
      performance: this.connectionMetrics,
    };
  }

  // Cleanup resources
  cleanup(): void {
    this.disconnect();
    this.connectionStateListeners.clear();
    this.eventHandlers.clear();
    this.syncStatusHandlers.clear();
    this.cleanupIntervals.clear();
    this.eventHandlerReferences = new WeakMap();
    this.clearMemoryTracking();
  }
}

// Create and export singleton instance
let posWebSocketServiceOptimized: POSWebSocketServiceOptimized | null = null;

export const getPOSWebSocketServiceOptimized = (): POSWebSocketServiceOptimized => {
  if (!posWebSocketServiceOptimized) {
    posWebSocketServiceOptimized = new POSWebSocketServiceOptimized();
  }
  return posWebSocketServiceOptimized;
};

// Export WebSocket service factory
export const createPOSWebSocketServiceOptimized = (config?: Partial<POSWebSocketConfig>): POSWebSocketServiceOptimized => {
  return new POSWebSocketServiceOptimized(config);
};

// Export for backward compatibility
export default POSWebSocketServiceOptimized;