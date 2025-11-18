/**
 * POS WebSocket Client Tests for BMS POS System
 * Tests the POS WebSocket client functionality and sync integration
 */

// Note: These are integration tests that should be run in the Electron POS environment
// with the backend WebSocket server running

// Import the POS WebSocket client and hooks
import { getPOSWebSocketService, POSWebSocketService, BMSWebSocketEvent, ConnectionState } from '@/services/WebSocketService';
import { usePOSWebSocket, usePOSWebSocketEvent} from '@/hooks/useWebSocket';
import { syncService, SyncStatus } from '@/services/SyncService';

/**
 * Test Suite for POS WebSocket Client
 */
export class POSWebSocketClientTests {
  private client: POSWebSocketService;
  private testResults: { test: string; passed: boolean; error?: string }[] = [];

  constructor() {
    this.client = getPOSWebSocketService();
  }

  /**
   * Run all POS WebSocket tests
   */
  async runAllTests(): Promise<{ passed: number; failed: number; total: number }> {
    console.log('🧪 Starting POS WebSocket Client Tests...');

    try {
      await this.testConnection();
      await this.testSyncIntegration();
      await this.testRealTimeSync();
      await this.testEventHandling();
      await this.testReconnectionWithSync();
      await this.testRoomManagement();
      await this.testSyncStatusMonitoring();
      await this.testPOSHooksIntegration();
      await this.testConnectionStateManagement();

      const passed = this.testResults.filter(r => r.passed).length;
      const failed = this.testResults.filter(r => !r.passed).length;
      const total = this.testResults.length;

      console.log('✅ POS WebSocket Tests Complete:', { passed, failed, total });
      return { passed, failed, total };

    } catch (error) {
      console.error('❌ POS WebSocket test suite failed:', error);
      throw error;
    }
  }

  /**
   * Test basic POS connection functionality
   */
  private async testConnection(): Promise<void> {
    try {
      console.log('🔌 Testing POS connection...');

      // Test initial connection state
      if (this.client.isConnected) {
        console.log('✅ Already connected');
        this.recordTest('pos-connection-initial-state', true);
        return;
      }

      // Test connection establishment to POS namespace
      const socket = await this.client.connect('pos');
      
      if (socket && socket.connected) {
        console.log('✅ POS connection established');
        this.recordTest('pos-connection-establishment', true);
        
        // Test disconnection
        this.client.disconnect();
        setTimeout(() => {
          if (!this.client.isConnected) {
            console.log('✅ POS disconnection successful');
            this.recordTest('pos-disconnection', true);
          } else {
            console.log('❌ POS disconnection failed');
            this.recordTest('pos-disconnection', false, 'Still connected after disconnect');
          }
        }, 100);
      } else {
        throw new Error('POS connection failed - socket not connected');
      }

    } catch (error) {
      console.error('❌ POS connection test failed:', error);
      this.recordTest('pos-connection-establishment', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test sync service integration
   */
  private async testSyncIntegration(): Promise<void> {
    try {
      console.log('🔄 Testing sync service integration...');

      await this.client.connect('pos');

      // Test initial sync status
      const initialSyncStatus = syncService.getSyncStatus();
      console.log('📊 Initial sync status:', initialSyncStatus);

      if (initialSyncStatus) {
        console.log('✅ Sync service accessible');
        this.recordTest('sync-service-accessibility', true);
      } else {
        this.recordTest('sync-service-accessibility', false, 'Sync service not accessible');
      }

      // Test manual sync trigger
      try {
        await this.client.triggerSyncWithNotification();
        console.log('✅ Manual sync trigger successful');
        this.recordTest('manual-sync-trigger', true);
      } catch (error) {
        this.recordTest('manual-sync-trigger', false, error instanceof Error ? error.message : 'Manual sync failed');
      }

    } catch (error) {
      console.error('❌ Sync integration test failed:', error);
      this.recordTest('sync-service-integration', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test real-time sync status updates
   */
  private async testRealTimeSync(): Promise<void> {
    try {
      console.log('📡 Testing real-time sync...');

      let syncStatusUpdateReceived = false;

      // Subscribe to sync status changes
      const unsubscribeSyncStatus = this.client.onSyncStatusChange((status) => {
        console.log('✅ Sync status update received:', status);
        syncStatusUpdateReceived = true;
        this.recordTest('real-time-sync-updates', true);
      });

      await this.client.connect('pos');

      // Trigger a sync to generate status updates
      try {
        await this.client.triggerSyncWithNotification();
      } catch (error) {
        console.warn('⚠️ Manual sync failed, continuing test:', error);
      }

      // Wait for sync status update
      setTimeout(() => {
        if (!syncStatusUpdateReceived) {
          this.recordTest('real-time-sync-updates', false, 'No sync status updates received');
        }
      }, 5000);

      // Cleanup
      setTimeout(() => {
        unsubscribeSyncStatus();
      }, 6000);

    } catch (error) {
      console.error('❌ Real-time sync test failed:', error);
      this.recordTest('real-time-sync-updates', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test event handling for POS-specific events
   */
  private async testEventHandling(): Promise<void> {
    try {
      console.log('📡 Testing POS event handling...');

      let productUpdateReceived = false;
      let inventoryUpdateReceived = false;

      // Subscribe to POS-specific events
      const unsubscribeProduct = this.client.on('product:updated', (event: BMSWebSocketEvent) => {
        console.log('✅ Product update received:', event);
        productUpdateReceived = true;
      });

      const unsubscribeInventory = this.client.on('inventory:updated', (event: BMSWebSocketEvent) => {
        console.log('✅ Inventory update received:', event);
        inventoryUpdateReceived = true;
      });

      const unsubscribeSync = this.client.on('sync:status', (event: BMSWebSocketEvent) => {
        console.log('✅ Sync status event received:', event);
        this.recordTest('pos-event-handling', true);
      });

      await this.client.connect('pos');

      // Simulate receiving events (normally would come from server)
      const productEvent: BMSWebSocketEvent = {
        id: 'pos-test-product-' + Date.now(),
        type: 'product:updated',
        timestamp: new Date(),
        branchId: 'pos-test-branch',
        data: { productId: 'test-product', name: 'Test Product', price: 10.99 }
      };

      const inventoryEvent: BMSWebSocketEvent = {
        id: 'pos-test-inventory-' + Date.now(),
        type: 'inventory:updated',
        timestamp: new Date(),
        branchId: 'pos-test-branch',
        data: { productId: 'test-product', currentStock: 50, minStock: 10 }
      };

      // Emit test events
      (this.client as any).emitEvent('product:updated', productEvent);
      (this.client as any).emitEvent('inventory:updated', inventoryEvent);

      // Cleanup
      unsubscribeProduct();
      unsubscribeInventory();
      unsubscribeSync();

      // Wait for event processing
      setTimeout(() => {
        if (!productUpdateReceived || !inventoryUpdateReceived) {
          this.recordTest('pos-event-handling', false, 'Some POS events not received');
        }
      }, 1000);

    } catch (error) {
      console.error('❌ POS event handling test failed:', error);
      this.recordTest('pos-event-handling', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test reconnection with sync integration
   */
  private async testReconnectionWithSync(): Promise<void> {
    try {
      console.log('🔄 Testing reconnection with sync...');

      // Connect first
      await this.client.connect('pos');
      
      if (!this.client.isConnected) {
        this.recordTest('reconnection-prerequisite-pos', false, 'Cannot connect to test reconnection');
        return;
      }

      // Get initial sync status
      const initialSyncStatus = this.client.getLastSyncStatus();

      // Simulate disconnection
      this.client.disconnect();
      
      // Wait for disconnection
      setTimeout(async () => {
        try {
          // Test reconnection
          await this.client.connect('pos');
          
          if (this.client.isConnected) {
            console.log('✅ POS reconnection successful');
            this.recordTest('pos-reconnection', true);
            
            // Check if sync was triggered after reconnection
            setTimeout(() => {
              const currentSyncStatus = this.client.getLastSyncStatus();
              if (currentSyncStatus !== initialSyncStatus) {
                console.log('✅ Sync triggered after reconnection');
                this.recordTest('pos-reconnection-sync', true);
              } else {
                console.log('⚠️ No sync trigger after reconnection');
                this.recordTest('pos-reconnection-sync', false, 'No sync trigger after reconnection');
              }
            }, 2000);
            
          } else {
            this.recordTest('pos-reconnection', false, 'Reconnection failed');
          }
        } catch (error) {
          this.recordTest('pos-reconnection', false, error instanceof Error ? error.message : 'Reconnection error');
        }
      }, 200);

    } catch (error) {
      console.error('❌ POS reconnection test failed:', error);
      this.recordTest('pos-reconnection', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test POS-specific room management
   */
  private async testRoomManagement(): Promise<void> {
    try {
      console.log('🏠 Testing POS room management...');

      await this.client.connect('pos');

      // Test joining POS-specific rooms
      this.client.joinRoom('pos-terminal');
      this.client.joinRoom('sync-updates');

      // Test getting current rooms
      const rooms = await this.client.getCurrentRooms();
      
      if (rooms.includes('pos-terminal') && rooms.includes('sync-updates')) {
        console.log('✅ POS room joining successful');
        this.recordTest('pos-room-management', true);
      } else {
        this.recordTest('pos-room-management', false, 'POS rooms not found in current rooms');
      }

      // Test leaving rooms
      this.client.leaveRoom('pos-terminal');
      this.client.leaveRoom('sync-updates');

      // Check if rooms were left
      setTimeout(async () => {
        const updatedRooms = await this.client.getCurrentRooms();
        if (!updatedRooms.includes('pos-terminal') && !updatedRooms.includes('sync-updates')) {
          console.log('✅ POS room leaving successful');
          this.recordTest('pos-room-management-leave', true);
        } else {
          this.recordTest('pos-room-management-leave', false, 'POS rooms still in current rooms');
        }
      }, 100);

    } catch (error) {
      console.error('❌ POS room management test failed:', error);
      this.recordTest('pos-room-management', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test sync status monitoring
   */
  private async testSyncStatusMonitoring(): Promise<void> {
    try {
      console.log('📊 Testing sync status monitoring...');

      let syncStatusChanges: SyncStatus[] = [];

      // Subscribe to sync status changes
      const unsubscribe = this.client.onSyncStatusChange((status) => {
        syncStatusChanges.push(status);
        console.log('🔄 Sync status changed:', status);
      });

      await this.client.connect('pos');

      // Trigger sync to generate status changes
      try {
        await this.client.triggerSyncWithNotification();
      } catch (error) {
        console.warn('⚠️ Manual sync failed, continuing test:', error);
      }

      // Wait for sync status changes
      setTimeout(() => {
        if (syncStatusChanges.length > 0) {
          console.log('✅ Sync status monitoring working');
          this.recordTest('sync-status-monitoring', true);
        } else {
          this.recordTest('sync-status-monitoring', false, 'No sync status changes detected');
        }
        
        unsubscribe();
      }, 5000);

    } catch (error) {
      console.error('❌ Sync status monitoring test failed:', error);
      this.recordTest('sync-status-monitoring', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test POS React hooks integration
   */
  private async testPOSHooksIntegration(): Promise<void> {
    try {
      console.log('⚛️ Testing POS React hooks...');

      // Test usePOSWebSocketEvent hook
      let hookEventReceived = false;
      
      // Create a test subscription using the POS hook pattern
      const unsubscribe = usePOSWebSocketEvent('test-pos-hook-event', (event: BMSWebSocketEvent) => {
        hookEventReceived = true;
        console.log('✅ POS hook event received:', event);
        this.recordTest('pos-react-hooks', true);
      });

      // Emit a test event
      const testEvent: BMSWebSocketEvent = {
        id: 'pos-hook-test-' + Date.now(),
        type: 'test-pos-hook-event',
        timestamp: new Date(),
        branchId: 'pos-test-branch',
        data: { message: 'pos hook test event', terminalId: 'test-terminal' }
      };

      // Emit the test event
      (this.client as any).emitEvent('test-pos-hook-event', testEvent);

      // Cleanup
      unsubscribe();

      // Wait for event processing
      setTimeout(() => {
        if (!hookEventReceived) {
          this.recordTest('pos-react-hooks', false, 'POS hook event not received');
        }
      }, 1000);

    } catch (error) {
      console.error('❌ POS React hooks test failed:', error);
      this.recordTest('pos-react-hooks', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test POS connection state management
   */
  private async testConnectionStateManagement(): Promise<void> {
    try {
      console.log('📊 Testing POS connection state management...');

      let stateChanges: ConnectionState[] = [];
      
      // Subscribe to connection state changes
      const unsubscribe = this.client.onConnectionStateChange((state) => {
        stateChanges.push(state);
        console.log('🔄 POS connection state changed to:', state);
      });

      // Connect and monitor state changes
      await this.client.connect('pos');
      
      // Disconnect and monitor state changes
      this.client.disconnect();

      // Wait for state changes to be processed
      setTimeout(() => {
        if (stateChanges.length >= 2) {
          console.log('✅ POS connection state management working');
          this.recordTest('pos-connection-state-management', true);
        } else {
          this.recordTest('pos-connection-state-management', false, 'Insufficient POS state changes detected');
        }
        
        unsubscribe();
      }, 500);

    } catch (error) {
      console.error('❌ POS connection state management test failed:', error);
      this.recordTest('pos-connection-state-management', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Record test result
   */
  private recordTest(testName: string, passed: boolean, error?: string): void {
    this.testResults.push({ test: testName, passed, error });
    
    if (passed) {
      console.log(`✅ ${testName}: PASSED`);
    } else {
      console.error(`❌ ${testName}: FAILED - ${error}`);
    }
  }

  /**
   * Get test results
   */
  getResults(): { test: string; passed: boolean; error?: string }[] {
    return this.testResults;
  }

  /**
   * Generate POS test report
   */
  generateReport(): string {
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    
    let report = `POS WebSocket Client Test Report\n`;
    report += `==================================\n\n`;
    report += `Total Tests: ${this.testResults.length}\n`;
    report += `Passed: ${passed}\n`;
    report += `Failed: ${failed}\n`;
    report += `Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%\n\n`;
    
    if (failed > 0) {
      report += `Failed Tests:\n`;
      this.testResults.filter(r => !r.passed).forEach(result => {
        report += `- ${result.test}: ${result.error}\n`;
      });
    }
    
    return report;
  }
}

/**
 * Utility function to run POS WebSocket tests
 */
export const runPOSWebSocketTests = async (): Promise<void> => {
  const tester = new POSWebSocketClientTests();
  const results = await tester.runAllTests();
  
  console.log(tester.generateReport());
  
  if (results.failed > 0) {
    throw new Error(`POS WebSocket tests failed: ${results.failed}/${results.total} tests failed`);
  }
  
  console.log('🎉 All POS WebSocket tests passed!');
};

/**
 * POS WebSocket Integration Example
 */
export const POSWebSocketIntegrationExample: React.FC = () => {
  // Example of using the POS WebSocket hooks in a React component
  const { 
    isConnected, 
    connectionState, 
    connect, 
    disconnect,
    triggerSyncWithNotification,
    lastSyncStatus,
  } = usePOSWebSocket({
    autoConnect: true,
    namespace: 'pos',
    eventHandlers: {
      'product:updated': (event) => {
        console.log('🔄 POS: Product updated:', event.data);
        // Update local product cache
        // Refresh POS interface if needed
      },
      'inventory:updated': (event) => {
        console.log('🔄 POS: Inventory updated:', event.data);
        // Update stock levels in POS interface
      },
      'sync:status': (event) => {
        console.log('🔄 POS: Sync status update:', event.data);
        // Update sync status UI
      },
      'system:notification': (event) => {
        console.log('🔔 POS: System notification:', event.data);
        // Show system notification to POS user
      }
    },
    syncStatusHandler: (status) => {
      console.log('📊 POS: Sync status changed:', status);
      // Update POS UI with sync status
    },
    connectionStateHandler: (state) => {
      console.log('📊 POS: WebSocket state:', state);
      // Update POS UI to show connection status
    },
    enableSyncIntegration: true
  });

  return (
    <div className="pos-websocket-integration-example">
      <h3>POS WebSocket Integration Example</h3>
      
      <div className="status-section">
        <div className="connection-status">
          <p><strong>Connection Status:</strong> {connectionState}</p>
          <p><strong>Is Connected:</strong> {isConnected ? 'Yes' : 'No'}</p>
        </div>
        
        <div className="sync-status">
          <p><strong>Last Sync:</strong> {lastSyncStatus?.lastSync ? new Date(lastSyncStatus.lastSync).toLocaleString() : 'Never'}</p>
          <p><strong>Pending Transactions:</strong> {lastSyncStatus?.pendingTransactions || 0}</p>
          <p><strong>Online Status:</strong> {lastSyncStatus?.isOnline ? 'Online' : 'Offline'}</p>
        </div>
      </div>
      
      <div className="controls">
        <button onClick={() => connect()}>
          Connect
        </button>
        <button onClick={() => disconnect()}>
          Disconnect
        </button>
        <button onClick={() => triggerSyncWithNotification()}>
          Manual Sync
        </button>
      </div>
      
      <div className="events">
        <p>Listening for POS real-time events:</p>
        <ul>
          <li>Product Updates (Price changes, new products)</li>
          <li>Inventory Updates (Stock level changes)</li>
          <li>Sync Status Updates (Connection and sync monitoring)</li>
          <li>System Notifications (Maintenance, alerts)</li>
        </ul>
      </div>
      
      <div className="sync-features">
        <h4>POS Sync Features:</h4>
        <ul>
          <li>Real-time product synchronization</li>
          <li>Automatic inventory updates</li>
          <li>Offline-first sync capabilities</li>
          <li>Connection health monitoring</li>
          <li>Manual sync trigger for critical updates</li>
        </ul>
      </div>
    </div>
  );
};

export default POSWebSocketClientTests;