import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getWebSocketClient, WebSocketClient, BMSWebSocketEvent, ConnectionState } from '@/lib/websocket';

// Hook configuration interface
export interface UseWebSocketOptions {
  autoConnect?: boolean;
  namespace?: 'main' | 'admin' | 'pos';
  eventHandlers?: Record<string, (event: BMSWebSocketEvent) => void>;
  connectionStateHandler?: (state: ConnectionState) => void;
}

// Return type for the hook
export interface UseWebSocketReturn {
  // Connection state
  isConnected: boolean;
  connectionState: ConnectionState;
  connectionDuration: number;
  reconnectAttempts: number;
  
  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;
  
  // Event subscription
  subscribe: (eventType: string, handler: (event: BMSWebSocketEvent) => void) => () => void;
  unsubscribe: (eventType: string, handler?: (event: BMSWebSocketEvent) => void) => void;
  
  // Room management
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  getCurrentRooms: () => Promise<string[]>;
  
  // Utility methods
  ping: () => void;
  getStats: () => any;
  
  // Raw WebSocket client (for advanced usage)
  client: WebSocketClient | null;
}

/**
 * Custom React hook for WebSocket connections with automatic management
 * 
 * @param options - Configuration options for the WebSocket hook
 * @returns WebSocket management interface
 */
export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    autoConnect = true,
    namespace = 'main',
    eventHandlers = {},
    connectionStateHandler,
  } = options;

  const client = useMemo(() => getWebSocketClient(), []);
  const [isConnected, setIsConnected] = useState(client.isConnected);
  const [connectionState, setConnectionState] = useState<ConnectionState>(client.state);
  const [connectionDuration, setConnectionDuration] = useState(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Store event handlers to maintain reference stability
  const eventHandlersRef = useRef(eventHandlers);
  eventHandlersRef.current = eventHandlers;

  // Store connection state handler
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

  // Initialize connection and setup listeners
  useEffect(() => {
    // Setup connection state listener
    const unsubscribeConnectionState = client.onConnectionStateChange(handleConnectionStateChange);
    
    // Register event handlers
    const unsubscribers: (() => void)[] = [];
    Object.entries(eventHandlersRef.current).forEach(([eventType, handler]) => {
      const unsubscribe = client.on(eventType, handler);
      unsubscribers.push(unsubscribe);
    });

    // Auto-connect if enabled
    if (autoConnect && !client.isConnected) {
      client.connect(namespace).catch(error => {
        console.error('Failed to auto-connect WebSocket:', error);
      });
    }

    // Cleanup function
    return () => {
      unsubscribeConnectionState();
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [client, autoConnect, namespace, handleConnectionStateChange]);

  // Connection methods
  const connect = useCallback(async (): Promise<void> => {
    try {
      await client.connect(namespace);
    } catch (error) {
      console.error('WebSocket connection failed:', error);
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
    
    // Connection methods
    connect,
    disconnect,
    reconnect,
    
    // Event subscription
    subscribe,
    unsubscribe,
    
    // Room management
    joinRoom,
    leaveRoom,
    getCurrentRooms,
    
    // Utility methods
    ping,
    getStats,
    
    // Raw client
    client,
  };
};

/**
 * Hook for subscribing to specific WebSocket events
 * 
 * @param eventType - The type of event to subscribe to
 * @param handler - The event handler function
 * @param client - Optional WebSocket client instance
 * @returns Unsubscribe function
 */
export const useWebSocketEvent = (
  eventType: string,
  handler: (event: BMSWebSocketEvent) => void,
  client: WebSocketClient = getWebSocketClient()
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
 * Hook for monitoring WebSocket connection state
 * 
 * @param client - Optional WebSocket client instance
 * @returns Connection state and callback
 */
export const useWebSocketConnection = (
  client: WebSocketClient = getWebSocketClient()
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
 * Hook for real-time data subscriptions
 * Provides convenient shortcuts for common data types
 */
export const useRealTimeData = (client: WebSocketClient = getWebSocketClient()) => {
  // Subscribe to inventory updates
  const useInventoryUpdates = () => {
    return useWebSocketEvent('inventory:updated', (event) => {
      return event;
    }, client);
  };

  // Subscribe to product updates
  const useProductUpdates = () => {
    return useWebSocketEvent('product:updated', (event) => {
      return event;
    }, client);
  };

  // Subscribe to transaction updates
  const useTransactionUpdates = () => {
    return useWebSocketEvent('transaction:created', (event) => {
      return event;
    }, client);
  };

  // Subscribe to system notifications
  const useSystemNotifications = () => {
    return useWebSocketEvent('system:notification', (event) => {
      return event;
    }, client);
  };

  // Subscribe to low stock alerts
  const useLowStockAlerts = () => {
    return useWebSocketEvent('low-stock:alert', (event) => {
      return event;
    }, client);
  };

  return {
    useInventoryUpdates,
    useProductUpdates,
    useTransactionUpdates,
    useSystemNotifications,
    useLowStockAlerts,
  };
};

/**
 * Hook for WebSocket room management
 */
export const useWebSocketRooms = (client: WebSocketClient = getWebSocketClient()) => {
  const [currentRooms, setCurrentRooms] = useState<string[]>([]);

  const joinRoom = useCallback((roomId: string) => {
    client.joinRoom(roomId);
    // Update current rooms list
    setTimeout(() => {
      client.getCurrentRooms().then(setCurrentRooms);
    }, 100);
  }, [client]);

  const leaveRoom = useCallback((roomId: string) => {
    client.leaveRoom(roomId);
    // Update current rooms list
    setTimeout(() => {
      client.getCurrentRooms().then(setCurrentRooms);
    }, 100);
  }, [client]);

  const refreshCurrentRooms = useCallback(async () => {
    const rooms = await client.getCurrentRooms();
    setCurrentRooms(rooms);
  }, [client]);

  // Refresh rooms when connected
  useEffect(() => {
    if (client.isConnected) {
      refreshCurrentRooms();
    }
  }, [client.isConnected, refreshCurrentRooms]);

  return {
    currentRooms,
    joinRoom,
    leaveRoom,
    refreshCurrentRooms,
  };
};

export default useWebSocket;