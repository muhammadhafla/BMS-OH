# WebSocket Client Services Implementation Documentation

## Overview

This document provides comprehensive documentation for the implemented WebSocket client services for both the BMS web platform and POS system. The implementation enables real-time communication and data synchronization with the backend WebSocket server.

## Implemented Components

### 1. Web Platform WebSocket Client (`bms-web/src/lib/websocket.ts`)

**Features:**
- Socket.IO client integration with Next.js
- JWT authentication integration
- Real-time event handling for web components
- Connection state management with visual indicators
- Auto-reconnection logic with exponential backoff
- Room management for targeted event subscriptions
- Event subscription/unsubscription system
- Connection health monitoring

**Key Classes:**
- `WebSocketClient` - Main client class with full functionality
- `getWebSocketClient()` - Singleton instance getter
- `createWebSocketClient()` - Factory function for custom instances

### 2. POS System WebSocket Client (`bms-pos/src/services/WebSocketService.ts`)

**Features:**
- Socket.IO client optimized for Electron POS application
- Integration with existing SyncService
- Real-time sync status updates and monitoring
- Connection health monitoring and recovery
- Background sync status updates
- POS-specific room management
- Sync-triggered events and notifications

**Key Classes:**
- `POSWebSocketService` - Extended client with POS-specific features
- `getPOSWebSocketService()` - Singleton instance getter
- `createPOSWebSocketService()` - Factory function for custom instances

### 3. React Hooks for Web Platform (`bms-web/src/hooks/useWebSocket.ts`)

**Available Hooks:**
- `useWebSocket()` - Main hook for general WebSocket usage
- `useWebSocketEvent()` - Hook for subscribing to specific events
- `useWebSocketConnection()` - Hook for connection state monitoring
- `useRealTimeData()` - Hook for real-time data subscriptions
- `useWebSocketRooms()` - Hook for room management

### 4. React Hooks for POS System (`bms-pos/src/hooks/useWebSocket.ts`)

**Available Hooks:**
- `usePOSWebSocket()` - Main hook for POS WebSocket with sync integration
- `usePOSWebSocketEvent()` - Hook for POS-specific event subscriptions
- `usePOSWebSocketConnection()` - Hook for POS connection state monitoring
- `usePOSSyncMonitoring()` - Hook for comprehensive sync monitoring
- `usePOSRealTimeNotifications()` - Hook for POS notifications

### 5. Integration Components

#### Web Platform Components:
- `WebSocketStatus.tsx` - Connection status indicator with detailed view
- `useRealTimeNotifications.tsx` - Hook for real-time notifications
- `useRealTimeData.tsx` - Hook for real-time data updates with SWR integration

#### POS System Components:
- `POSWebSocketStatus.tsx` - POS-specific connection and sync status
- `POSWebSocketControlPanel.tsx` - Comprehensive control panel for monitoring

## Usage Examples

### Web Platform Usage

#### Basic WebSocket Connection
```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

function MyComponent() {
  const {
    isConnected,
    connectionState,
    connect,
    disconnect,
    subscribe,
  } = useWebSocket({
    autoConnect: true,
    namespace: 'main',
    eventHandlers: {
      'inventory:updated': (event) => {
        console.log('Inventory updated:', event.data);
        // Update local state or trigger data refresh
      },
      'product:updated': (event) => {
        console.log('Product updated:', event.data);
        // Update local state or trigger data refresh
      },
      'system:notification': (event) => {
        console.log('System notification:', event.data);
        // Show notification to user
      }
    },
    connectionStateHandler: (state) => {
      console.log('Connection state:', state);
      // Update UI to show connection status
    }
  });

  return (
    <div>
      <p>Connection: {connectionState}</p>
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

#### Real-time Data Integration
```typescript
import { useRealTimeData } from '@/components/websocket/useRealTimeData';

function Dashboard() {
  const { lastUpdate, refreshAllData } = useRealTimeData({
    refreshKeys: ['/api/products', '/api/inventory'],
    enableInventoryUpdates: true,
    enableProductUpdates: true,
    enableTransactionUpdates: true
  });

  return (
    <div>
      <p>Last Update: {lastUpdate?.toLocaleString()}</p>
      <button onClick={refreshAllData}>Refresh All Data</button>
    </div>
  );
}
```

#### Connection Status Display
```typescript
import { WebSocketStatus } from '@/components/websocket/WebSocketStatus';

function AppLayout() {
  return (
    <div className="app-layout">
      <header>
        <WebSocketStatus 
          showDetails={true} 
          showReconnectButton={true}
          onReconnect={() => window.location.reload()}
        />
      </header>
      <main>
        {/* Your app content */}
      </main>
    </div>
  );
}
```

#### Real-time Notifications
```typescript
import { useRealTimeNotifications } from '@/components/websocket/useRealTimeNotifications';

function NotificationHandler() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    clearNotifications 
  } = useRealTimeNotifications();

  return (
    <div>
      <h3>Notifications ({unreadCount})</h3>
      <button onClick={clearNotifications}>Clear All</button>
      {notifications.map(notification => (
        <div key={notification.id}>
          <h4>{notification.data.title}</h4>
          <p>{notification.data.message}</p>
          <button onClick={() => markAsRead(notification.id)}>
            Mark as Read
          </button>
        </div>
      ))}
    </div>
  );
}
```

### POS System Usage

#### Basic POS WebSocket with Sync Integration
```typescript
import { usePOSWebSocket } from '@/hooks/useWebSocket';

function POSLayout() {
  const {
    isConnected,
    connectionState,
    connect,
    disconnect,
    triggerSyncWithNotification,
    lastSyncStatus,
    subscribe,
  } = usePOSWebSocket({
    autoConnect: true,
    namespace: 'pos',
    eventHandlers: {
      'product:updated': (event) => {
        console.log('Product updated:', event.data);
        // Update local product cache
        // Refresh POS interface if needed
      },
      'inventory:updated': (event) => {
        console.log('Inventory updated:', event.data);
        // Update stock levels in POS interface
      },
      'sync:status': (event) => {
        console.log('Sync status update:', event.data);
        // Update sync status UI
      },
      'system:notification': (event) => {
        console.log('System notification:', event.data);
        // Show system notification to POS user
      }
    },
    syncStatusHandler: (status) => {
      console.log('Sync status changed:', status);
      // Update POS UI with sync status
    },
    connectionStateHandler: (state) => {
      console.log('WebSocket state:', state);
      // Update POS UI to show connection status
    },
    enableSyncIntegration: true
  });

  return (
    <div className="pos-layout">
      <div className="status-bar">
        <POSWebSocketStatus 
          showDetails={true} 
          showSyncStatus={true}
          onManualSync={triggerSyncWithNotification}
        />
      </div>
      
      <div className="sync-status">
        <p>Last Sync: {lastSyncStatus?.lastSync?.toLocaleString() || 'Never'}</p>
        <p>Pending: {lastSyncStatus?.pendingTransactions || 0} transactions</p>
        <p>Online: {lastSyncStatus?.isOnline ? 'Yes' : 'No'}</p>
      </div>
      
      <div className="controls">
        <button onClick={connect}>Connect</button>
        <button onClick={disconnect}>Disconnect</button>
        <button onClick={triggerSyncWithNotification}>Manual Sync</button>
      </div>
    </div>
  );
}
```

#### POS Sync Monitoring
```typescript
import { usePOSSyncMonitoring } from '@/hooks/useWebSocket';

function POSSyncDashboard() {
  const { syncMonitoring } = usePOSSyncMonitoring();

  return (
    <div className="sync-dashboard">
      <h3>Sync Status Dashboard</h3>
      
      <div className="status-grid">
        <div className="status-card">
          <h4>Connection Health</h4>
          <p>Status: {syncMonitoring.connectionHealth}</p>
          <p>WebSocket: {syncMonitoring.websocketState}</p>
        </div>
        
        <div className="status-card">
          <h4>Sync Status</h4>
          <p>Online: {syncMonitoring.isOnline ? 'Yes' : 'No'}</p>
          <p>Syncing: {syncMonitoring.isSyncing ? 'Yes' : 'No'}</p>
          <p>Last Sync: {syncMonitoring.lastSyncTime?.toLocaleString()}</p>
        </div>
        
        <div className="status-card">
          <h4>Pending Items</h4>
          <p>Transactions: {syncMonitoring.pendingTransactions}</p>
          <p>Products: {syncMonitoring.pendingProducts}</p>
        </div>
      </div>
    </div>
  );
}
```

#### POS WebSocket Control Panel
```typescript
import { POSWebSocketControlPanel } from '@/components/websocket/POSWebSocketStatus';

function POSApp() {
  const [showControlPanel, setShowControlPanel] = useState(false);

  return (
    <div className="pos-app">
      {/* Your POS app content */}
      
      <button onClick={() => setShowControlPanel(true)}>
        Show Status
      </button>
      
      <POSWebSocketControlPanel 
        isOpen={showControlPanel}
        onClose={() => setShowControlPanel(false)}
      />
    </div>
  );
}
```

## Real-time Events

### Supported Event Types

#### Web Platform Events:
- `inventory:updated` - Inventory stock level changes
- `product:updated` - Product information updates
- `transaction:created` - New transaction notifications
- `system:notification` - System-wide notifications
- `low-stock:alert` - Low stock alerts for products
- `user:updated` - User information updates

#### POS System Events:
- `sync:status` - Real-time sync status updates
- `product:updated` - Product updates for POS cache refresh
- `inventory:updated` - Stock level updates
- `system:notification` - System alerts and notifications
- `low-stock:alert` - POS-specific stock alerts

## Configuration

### Environment Variables

#### Web Platform (.env.local):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

#### POS System (.env):
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

### WebSocket Namespaces
- `/main` - General web platform users
- `/admin` - Administrative users (restricted access)
- `/pos` - POS terminals and applications

## Testing

### Web Platform Tests (`bms-web/src/tests/websocket-tests.tsx`)
```typescript
import { runWebSocketTests } from '@/tests/websocket-tests';

// Run all WebSocket tests
await runWebSocketTests();
```

### POS System Tests (`bms-pos/src/tests/websocket-tests.tsx`)
```typescript
import { runPOSWebSocketTests } from '@/tests/websocket-tests';

// Run all POS WebSocket tests
await runPOSWebSocketTests();
```

## Error Handling

### Connection Error Handling
```typescript
const { connectionState, reconnect } = useWebSocket({
  connectionStateHandler: (state) => {
    switch (state) {
      case 'error':
        console.error('WebSocket connection error');
        // Show user-friendly error message
        break;
      case 'reconnecting':
        console.log('Attempting to reconnect...');
        // Show reconnection status
        break;
      case 'connected':
        console.log('Connection restored');
        // Hide error messages
        break;
    }
  }
});
```

### Sync Error Handling (POS)
```typescript
const { lastSyncStatus } = usePOSWebSocket({
  syncStatusHandler: (status) => {
    if (status.syncErrors && status.syncErrors.length > 0) {
      console.error('Sync errors:', status.syncErrors);
      // Display sync errors to user
      // Provide retry options
    }
  }
});
```

## Performance Considerations

### Connection Pooling
- WebSocket clients use singleton pattern to avoid multiple connections
- Multiple hooks share the same underlying connection
- Efficient event routing to subscribed components

### Memory Management
- Event handlers are automatically cleaned up on component unmount
- Connection state listeners are properly removed
- Periodic cleanup of unused event handlers

### Network Optimization
- Events are batched where possible
- Reconnection uses exponential backoff
- Connection health monitoring with automatic cleanup

## Security Features

### Authentication
- JWT token-based authentication for all connections
- Token refresh handling on connection errors
- Automatic logout on authentication failures

### Authorization
- Role-based access to different namespaces
- Event-level authorization checks
- Secure room joining/leaving

### Rate Limiting
- Connection rate limiting per user
- Event rate limiting to prevent spam
- Automatic connection cleanup on abuse

## Deployment Considerations

### Production Configuration
- Use WSS (WebSocket Secure) in production
- Configure proper CORS settings
- Set up connection monitoring and alerting

### Scaling
- WebSocket server supports horizontal scaling
- Connection state is distributed across server instances
- Room management scales with number of connected users

### Monitoring
- Built-in connection statistics
- Event performance metrics
- Automatic reconnection analytics

## Troubleshooting

### Common Issues

#### Connection Fails
1. Check environment variables for API/WS URLs
2. Verify JWT token is valid and not expired
3. Check network connectivity and firewall settings
4. Review browser console for specific error messages

#### Events Not Received
1. Verify correct event type names
2. Check if connected to the right namespace
3. Ensure event handlers are properly subscribed
4. Verify server is emitting events to correct rooms

#### Sync Issues (POS)
1. Check SyncService integration and database access
2. Verify network connectivity for sync operations
3. Review sync error logs for specific issues
4. Test manual sync trigger functionality

#### Performance Issues
1. Monitor connection count and event volume
2. Check for memory leaks in event handlers
3. Review reconnection patterns and frequency
4. Optimize event handler complexity

## Support and Maintenance

### Logs
- WebSocket connections and events are logged
- Error tracking for connection issues
- Performance metrics collection

### Debug Mode
- Enable verbose logging for troubleshooting
- Event flow visualization
- Connection state transitions

### Future Enhancements
- Message queuing for offline support
- Event compression for large payloads
- Custom event routing and filtering
- Enhanced security features

This implementation provides a robust, scalable, and maintainable WebSocket client solution for both the BMS web platform and POS system, enabling real-time communication and data synchronization across the entire BMS ecosystem.