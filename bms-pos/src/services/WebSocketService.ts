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
}

// Default configuration for POS
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
};

// Event handler type
export type EventHandler = (event: BMSWebSocketEvent) => void | Promise<void>;

// Sync status event handler
export type SyncStatusHandler = (status: SyncStatus & { websocketState?: ConnectionState }) => void;

// POS WebSocket Service class
export class POSWebSocketService {
  private socket: Socket | null = null;
  private config: POSWebSocketConfig;
  private connectionState: ConnectionState = 'disconnected';
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private syncStatusHandlers: Set<SyncStatusHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private _lastSyncStatus: SyncStatus | null = null;
  private isIntentionallyDisconnected = false;
  private connectionStartTime: Date | null = null;
  private syncStatusMonitorInterval: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<POSWebSocketConfig> = {}) {
    this.config = { ...DEFAULT_POS_CONFIG, ...config };
  }

  // Initialize POS WebSocket connection
  async connect(namespace: 'main' | 'admin' | 'pos' = 'pos'): Promise<Socket> {
    if (this.socket?.connected) {
      console.log('POS WebSocket already connected');
      return this.socket;
    }

    this.connectionState = 'connecting';
    this.isIntentionallyDisconnected = false;
    this.connectionStartTime = new Date();

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

        this.socket.on('connect', async () => {
          console.log(`🚀 POS WebSocket connected to ${namespacePath}`);
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          
          // Join POS-specific rooms
          await this.joinPOSRooms();
          
          // Start periodic tasks
          this.startPeriodicTasks();

          resolve(this.socket!);
        });

        this.socket.on('connect_error', (error) => {
          console.error('POS WebSocket connection error:', error);
          this.connectionState = 'error';
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('POS WebSocket disconnected:', reason);
          this.handleDisconnection(reason);
        });

        this.socket.on('error', (error) => {
          console.error('POS WebSocket error:', error);
          this.connectionState = 'error';
        });
      });

    } catch (error) {
      console.error('Failed to connect POS WebSocket:', error);
      this.connectionState = 'error';
      throw error;
    }
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

    // POS-specific real-time events
    this.socket.on('sync:status', (event: BMSWebSocketEvent) => {
      console.log('📊 Real-time sync status update received:', event.data);
      this.handleSyncStatusUpdate(event);
      this.emitEvent('sync:status', event);
    });

    this.socket.on('product:updated', (event: BMSWebSocketEvent) => {
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

    this.socket.on('inventory:updated', (event: BMSWebSocketEvent) => {
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

    this.socket.on('system:notification', (event: BMSWebSocketEvent) => {
      console.log('🔔 System notification received:', event.data);
      this.emitEvent('system:notification', event);
    });

    this.socket.on('low-stock:alert', (event: BMSWebSocketEvent) => {
      console.log('⚠️ Low stock alert received:', event.data);
      this.emitEvent('low-stock:alert', event);
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
        };

        this._lastSyncStatus = updatedStatus;
        
        // Notify sync status handlers
        this.notifySyncStatusHandlers(updatedStatus);
      }
    } catch (error) {
      console.error('Error handling sync status update:', error);
    }
  }

  // Start periodic tasks
  private startPeriodicTasks(): void {
    // Start sync status monitoring
    this.startSyncStatusMonitoring();
    
    // Start ping for connection health
    this.startPingPong();
  }

  // Start sync status monitoring
  private startSyncStatusMonitoring(): void {
    if (this.syncStatusMonitorInterval) {
      clearInterval(this.syncStatusMonitorInterval);
    }

    this.syncStatusMonitorInterval = setInterval(() => {
      if (this.socket?.connected && this.config.syncServiceIntegration) {
        const currentSyncStatus = syncService.getSyncStatus();
        
        // Compare with last status to detect changes
        if (JSON.stringify(currentSyncStatus) !== JSON.stringify(this._lastSyncStatus)) {
          this._lastSyncStatus = currentSyncStatus;
          this.notifySyncStatusHandlers(currentSyncStatus);
          
          // Broadcast sync status to server if significant changes
          if (this.shouldBroadcastSyncStatus(currentSyncStatus)) {
            this.broadcastSyncStatus(currentSyncStatus);
          }
        }
      }
    }, 5000); // Check every 5 seconds
  }

  // Start ping/pong for connection health
  private startPingPong(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // Ping every 30 seconds
  }

  // Check if sync status should be broadcast
  private shouldBroadcastSyncStatus(syncStatus: SyncStatus): boolean {
    if (!this._lastSyncStatus) return true;
    
    // Broadcast on significant changes
    return (
      syncStatus.isSyncing !== this._lastSyncStatus.isSyncing ||
      syncStatus.pendingTransactions !== this._lastSyncStatus.pendingTransactions ||
      syncStatus.pendingProducts !== this._lastSyncStatus.pendingProducts
    );
  }

  // Broadcast sync status to server
  private broadcastSyncStatus(syncStatus: SyncStatus): void {
    if (this.socket?.connected) {
      this.socket.emit('sync-status-update', {
        status: syncStatus,
        timestamp: new Date(),
        clientId: this.getClientId(),
      });
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

  // Handle disconnection
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
    
    setTimeout(() => {
      if (!this.socket?.connected && !this.isIntentionallyDisconnected) {
        console.log('🔄 POS attempting reconnection...');
        this.socket?.connect();
      }
    }, delay);
  }

  // Stop periodic tasks
  private stopPeriodicTasks(): void {
    if (this.syncStatusMonitorInterval) {
      clearInterval(this.syncStatusMonitorInterval);
      this.syncStatusMonitorInterval = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Disconnect
  disconnect(): void {
    this.isIntentionallyDisconnected = true;
    this.stopPeriodicTasks();
    
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
          console.error(`Error in POS event handler for ${eventType}:`, error);
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

  get lastSyncStatus(): SyncStatus | null {
    return this._lastSyncStatus;
  }

  // Public getter for test access
  getLastSyncStatus(): SyncStatus | null {
    return this._lastSyncStatus;
  }

  // Get comprehensive stats
  getStats() {
    const syncStats = syncService.getSyncStatus();
    
    return {
      connected: this.isConnected,
      state: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      connectionDuration: this.connectionDuration,
      subscribedEvents: Array.from(this.eventHandlers.keys()),
      socketId: this.socket?.id,
      syncStatus: syncStats,
      lastSyncStatus: this.lastSyncStatus,
      clientId: this.getClientId(),
    };
  }

  // Cleanup resources
  cleanup(): void {
    this.disconnect();
    this.connectionStateListeners.clear();
    this.eventHandlers.clear();
    this.syncStatusHandlers.clear();
  }
}

// Create and export singleton instance
let posWebSocketService: POSWebSocketService | null = null;

export const getPOSWebSocketService = (): POSWebSocketService => {
  if (!posWebSocketService) {
    posWebSocketService = new POSWebSocketService();
  }
  return posWebSocketService;
};

// Export WebSocket service factory
export const createPOSWebSocketService = (config?: Partial<POSWebSocketConfig>): POSWebSocketService => {
  return new POSWebSocketService(config);
};

// Export for backward compatibility
export default POSWebSocketService;