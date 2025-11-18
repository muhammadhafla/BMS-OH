import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getPOSWebSocketService, POSWebSocketService, BMSWebSocketEvent, ConnectionState } from '@/services/WebSocketService';
import { SyncStatus } from '@/services/SyncService';

// Hook configuration interface for POS
export interface UsePOSWebSocketOptions {
  autoConnect?: boolean;
  namespace?: 'main' | 'admin' | 'pos';
  eventHandlers?: Record<string, (event: BMSWebSocketEvent) => void>;
  syncStatusHandler?: (status: SyncStatus & { websocketState?: ConnectionState }) => void;
  connectionStateHandler?: (state: ConnectionState) => void;
  enableSyncIntegration?: boolean;
}

// Return type for the POS WebSocket hook
export interface UsePOSWebSocketReturn {
  // Connection state
  isConnected: boolean;
  connectionState: ConnectionState;
  connectionDuration: number;
  reconnectAttempts: number;
  lastSyncStatus: SyncStatus | null;
  
  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;
  triggerSyncWithNotification: () => Promise<void>;
  
  // Event subscription
  subscribe: (eventType: string, handler: (event: BMSWebSocketEvent) => void) => () => void;
  unsubscribe: (eventType: string, handler?: (event: BMSWebSocketEvent) => void) => void;
  
  // Room management
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  getCurrentRooms: () => Promise<string[]>;
  
  // Sync integration
  onSyncStatusChange: (handler: (status: SyncStatus & { websocketState?: ConnectionState }) => void) => () => void;
  
  // Utility methods
  ping: () => void;
  getStats: () => any;
  
  // Raw WebSocket service (for advanced usage)
  client: POSWebSocketService | null;
}

/**
 * Custom React hook for POS WebSocket connections with sync integration
 * Optimized for Electron POS applications with offline-first capabilities
 * 
 * @param options - Configuration options for the POS WebSocket hook
 * @returns POS WebSocket management interface with sync integration
 */
export const usePOSWebSocket = (options: UsePOSWebSocketOptions = {}): UsePOSWebSocketReturn => {
  const {
    autoConnect = true,
    namespace = 'pos',
    eventHandlers = {},
    syncStatusHandler,
    connectionStateHandler,
    enableSyncIntegration = true,
  } = options;

  const client = useMemo(() => getPOSWebSocketService(), []);
  const [isConnected, setIsConnected] = useState(client.isConnected);
  const [connectionState, setConnectionState] = useState<ConnectionState>(client.state);
  const [connectionDuration, setConnectionDuration] = useState(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastSyncStatus, setLastSyncStatus] = useState<SyncStatus | null>(client.getLastSyncStatus());
  
  // Store event handlers to maintain reference stability
  const eventHandlersRef = useRef(eventHandlers);
  eventHandlersRef.current = eventHandlers;

  // Store handlers
  const syncStatusHandlerRef = useRef(syncStatusHandler);
  syncStatusHandlerRef.current = syncStatusHandler;

  const connectionStateHandlerRef = useRef(connectionStateHandler);
  connectionStateHandlerRef.current = connectionStateHandler;

  // Update connection duration periodically
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isConnected) {
      interval = setInterval(() => {
        setConnectionDuration(client.connectionDuration);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isConnected, client.connectionDuration]);

  // Connection state change handler
  const handleConnectionStateChange = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    setIsConnected(state === 'connected');
    
    // Update connection stats
    setReconnectAttempts(client.getStats().reconnectAttempts || 0);
    
    // Call custom handler if provided
    if (connectionStateHandlerRef.current) {
      connectionStateHandlerRef.current(state);
    }
  }, [client]);

  // Sync status change handler
  const handleSyncStatusChange = useCallback((status: SyncStatus & { websocketState?: ConnectionState }) => {
    setLastSyncStatus(status);
    
    // Call custom sync status handler if provided
    if (syncStatusHandlerRef.current) {
      syncStatusHandlerRef.current(status);
    }
  }, []);

  // Initialize connection and setup listeners
  useEffect(() => {
    // Setup connection state listener
    const unsubscribeConnectionState = client.onConnectionStateChange(handleConnectionStateChange);
    
    // Setup sync status listener if integration is enabled
    const unsubscribeSyncStatus = enableSyncIntegration 
      ? client.onSyncStatusChange(handleSyncStatusChange)
      : null;
    
    // Register event handlers
    const unsubscribers: (() => void)[] = [];
    Object.entries(eventHandlersRef.current).forEach(([eventType, handler]) => {
      const unsubscribe = client.on(eventType, handler);
      unsubscribers.push(unsubscribe);
    });

    // Auto-connect if enabled
    if (autoConnect && !client.isConnected) {
      client.connect(namespace).catch(error => {
        console.error('Failed to auto-connect POS WebSocket:', error);
      });
    }

    // Cleanup function
    return () => {
      unsubscribeConnectionState();
      if (unsubscribeSyncStatus) {
        unsubscribeSyncStatus();
      }
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [client, autoConnect, namespace, enableSyncIntegration, handleConnectionStateChange, handleSyncStatusChange]);

  // Connection methods
  const connect = useCallback(async (): Promise<void> => {
    try {
      await client.connect(namespace);
    } catch (error) {
      console.error('POS WebSocket connection failed:', error);
      throw error;
    }
  }, [client, namespace]);

  const disconnect = useCallback((): void => {
    client.disconnect();
  }, [client]);

  const reconnect = useCallback(async (): Promise<void> => {
    client.disconnect();
    // Small delay before reconnecting
    setTimeout(() => {
      client.connect(namespace);
    }, 100);
  }, [client, namespace]);

  // Sync integration method
  const triggerSyncWithNotification = useCallback(async (): Promise<void> => {
    await client.triggerSyncWithNotification();
  }, [client]);

  // Event subscription methods
  const subscribe = useCallback((eventType: string, handler: (event: BMSWebSocketEvent) => void) => {
    return client.on(eventType, handler);
  }, [client]);

  const unsubscribe = useCallback((eventType: string, handler?: (event: BMSWebSocketEvent) => void) => {
    client.off(eventType, handler);
  }, [client]);

  // Room management methods
  const joinRoom = useCallback((roomId: string) => {
    client.joinRoom(roomId);
  }, [client]);

  const leaveRoom = useCallback((roomId: string) => {
    client.leaveRoom(roomId);
  }, [client]);

  const getCurrentRooms = useCallback(async (): Promise<string[]> => {
    return client.getCurrentRooms();
  }, [client]);

  // Sync status subscription
  const onSyncStatusChange = useCallback((handler: (status: SyncStatus & { websocketState?: ConnectionState }) => void) => {
    return client.onSyncStatusChange(handler);
  }, [client]);

  // Utility methods
  const ping = useCallback(() => {
    client.ping();
  }, [client]);

  const getStats = useCallback(() => {
    return client.getStats();
  }, [client]);

  return {
    // Connection state
    isConnected,
    connectionState,
    connectionDuration,
    reconnectAttempts,
    lastSyncStatus,
    
    // Connection methods
    connect,
    disconnect,
    reconnect,
    triggerSyncWithNotification,
    
    // Event subscription
    subscribe,
    unsubscribe,
    
    // Room management
    joinRoom,
    leaveRoom,
    getCurrentRooms,
    
    // Sync integration
    onSyncStatusChange,
    
    // Utility methods
    ping,
    getStats,
    
    // Raw client
    client,
  };
};

/**
 * Hook for subscribing to specific POS WebSocket events
 * 
 * @param eventType - The type of event to subscribe to
 * @param handler - The event handler function
 * @param client - Optional WebSocket client instance
 * @returns Unsubscribe function
 */
export const usePOSWebSocketEvent = (
  eventType: string,
  handler: (event: BMSWebSocketEvent) => void,
  client: POSWebSocketService = getPOSWebSocketService()
): (() => void) => {
  const unsubscribeRef = useRef<() => void>();

  useEffect(() => {
    unsubscribeRef.current = client.on(eventType, handler);
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [eventType, handler, client]);

  return unsubscribeRef.current || (() => {});
};

/**
 * Hook for monitoring POS WebSocket connection state
 * 
 * @param client - Optional WebSocket client instance
 * @returns Connection state and callback
 */
export const usePOSWebSocketConnection = (
  client: POSWebSocketService = getPOSWebSocketService()
): {
  connectionState: ConnectionState;
  isConnected: boolean;
  connectionDuration: number;
  onConnectionStateChange: (listener: (state: ConnectionState) => void) => () => void;
} => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(client.state);
  const [isConnected, setIsConnected] = useState(client.isConnected);
  const [connectionDuration, setConnectionDuration] = useState(0);

  useEffect(() => {
    const unsubscribe = client.onConnectionStateChange((state) => {
      setConnectionState(state);
      setIsConnected(state === 'connected');
    });

    // Update connection duration
    const interval = setInterval(() => {
      if (isConnected) {
        setConnectionDuration(client.connectionDuration);
      }
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [client, isConnected]);

  const onConnectionStateChange = useCallback((listener: (state: ConnectionState) => void) => {
    return client.onConnectionStateChange(listener);
  }, [client]);

  return {
    connectionState,
    isConnected,
    connectionDuration,
    onConnectionStateChange,
  };
};

/**
 * Hook for POS real-time sync monitoring
 * Integrates WebSocket connection status with sync service status
 */
export const usePOSSyncMonitoring = (client: POSWebSocketService = getPOSWebSocketService()) => {
  const [syncMonitoring, setSyncMonitoring] = useState({
    lastSyncTime: null as Date | null,
    isOnline: false,
    isSyncing: false,
    pendingTransactions: 0,
    pendingProducts: 0,
    websocketState: 'disconnected' as ConnectionState,
    connectionHealth: 'unknown' as 'healthy' | 'unstable' | 'offline',
  });

  const handleSyncStatusChange = useCallback((status: SyncStatus & { websocketState?: ConnectionState }) => {
    setSyncMonitoring(prev => ({
      ...prev,
      ...status,
      lastSyncTime: status.lastSync,
      websocketState: status.websocketState || 'disconnected',
    }));
  }, []);

  const handleConnectionStateChange = useCallback((state: ConnectionState) => {
    setSyncMonitoring(prev => ({
      ...prev,
      websocketState: state,
      connectionHealth: getConnectionHealth(state, prev.isOnline),
    }));
  }, []);

  useEffect(() => {
    const unsubscribeSync = client.onSyncStatusChange(handleSyncStatusChange);
    const unsubscribeConnection = client.onConnectionStateChange(handleConnectionStateChange);

    return () => {
      unsubscribeSync();
      unsubscribeConnection();
    };
  }, [client, handleSyncStatusChange, handleConnectionStateChange]);

  // Determine connection health based on websocket state and online status
  const getConnectionHealth = (websocketState: ConnectionState, isOnline: boolean): 'healthy' | 'unstable' | 'offline' => {
    if (!isOnline) return 'offline';
    
    switch (websocketState) {
      case 'connected': return 'healthy';
      case 'connecting':
      case 'reconnecting': return 'unstable';
      case 'error':
      case 'disconnected': 
      default: return 'offline';
    }
  };

  // Auto-trigger sync when connection is restored
  useEffect(() => {
    if (syncMonitoring.websocketState === 'connected' && syncMonitoring.isOnline && !syncMonitoring.isSyncing) {
      // Small delay to ensure connection is stable
      const timeout = setTimeout(() => {
        client.triggerSyncWithNotification().catch(error => {
          console.error('Auto sync failed after connection:', error);
        });
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [syncMonitoring.websocketState, syncMonitoring.isOnline, syncMonitoring.isSyncing, client]);

  return {
    syncMonitoring,
    setSyncMonitoring,
  };
};

/**
 * Hook for POS real-time notifications
 */
export const usePOSRealTimeNotifications = (client: POSWebSocketService = getPOSWebSocketService()) => {
  const [notifications, setNotifications] = useState<BMSWebSocketEvent[]>([]);

  useEffect(() => {
    const unsubscribeProduct = client.on('product:updated', (event) => {
      console.log('📦 POS: Product updated', event.data);
      setNotifications(prev => [event, ...prev.slice(0, 19)]); // Keep last 20
    });

    const unsubscribeInventory = client.on('inventory:updated', (event) => {
      console.log('📋 POS: Inventory updated', event.data);
      setNotifications(prev => [event, ...prev.slice(0, 19)]);
    });

    const unsubscribeSync = client.on('sync:status', (event) => {
      console.log('🔄 POS: Sync status update', event.data);
      setNotifications(prev => [event, ...prev.slice(0, 19)]);
    });

    const unsubscribeSystem = client.on('system:notification', (event) => {
      console.log('🔔 POS: System notification', event.data);
      setNotifications(prev => [event, ...prev.slice(0, 19)]);
    });

    return () => {
      unsubscribeProduct();
      unsubscribeInventory();
      unsubscribeSync();
      unsubscribeSystem();
    };
  }, [client]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  return {
    notifications,
    clearNotifications,
  };
};

export default usePOSWebSocket;