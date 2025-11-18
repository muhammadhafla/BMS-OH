/**
 * WebSocket Client Tests for BMS Web Platform
 * Tests the WebSocket client functionality and integration
 */

// Note: These are integration tests that should be run in a browser environment
// with the backend WebSocket server running

// Import the WebSocket client and hooks
import { getWebSocketClient, WebSocketClient, BMSWebSocketEvent } from '@/lib/websocket';
import { useWebSocket, useWebSocketEvent } from '@/hooks/useWebSocket';

/**
 * Test Suite for WebSocket Client
 */
export class WebSocketClientTests {
  private client: WebSocketClient;
  private testResults: { test: string; passed: boolean; error?: string }[] = [];

  constructor() {
    this.client = getWebSocketClient();
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<{ passed: number; failed: number; total: number }> {
    console.log('🧪 Starting WebSocket Client Tests...');

    try {
      await this.testConnection();
      await this.testAuthentication();
      await this.testEventHandling();
      await this.testReconnection();
      await this.testRoomManagement();
      await this.testRealTimeHooks();
      await this.testConnectionStateManagement();

      const passed = this.testResults.filter(r => r.passed).length;
      const failed = this.testResults.filter(r => !r.passed).length;
      const total = this.testResults.length;

      console.log('✅ WebSocket Tests Complete:', { passed, failed, total });
      return { passed, failed, total };

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    }
  }

  /**
   * Test basic connection functionality
   */
  private async testConnection(): Promise<void> {
    try {
      console.log('🔌 Testing connection...');

      // Test initial connection state
      if (this.client.isConnected) {
        console.log('✅ Already connected');
        this.recordTest('connection-initial-state', true);
        return;
      }

      // Test connection establishment
      const socket = await this.client.connect('main');
      
      if (socket && socket.connected) {
        console.log('✅ Connection established');
        this.recordTest('connection-establishment', true);
        
        // Test disconnection
        this.client.disconnect();
        setTimeout(() => {
          if (!this.client.isConnected) {
            console.log('✅ Disconnection successful');
            this.recordTest('disconnection', true);
          } else {
            console.log('❌ Disconnection failed');
            this.recordTest('disconnection', false, 'Still connected after disconnect');
          }
        }, 100);
      } else {
        throw new Error('Connection failed - socket not connected');
      }

    } catch (error) {
      console.error('❌ Connection test failed:', error);
      this.recordTest('connection-establishment', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test authentication integration
   */
  private async testAuthentication(): Promise<void> {
    try {
      console.log('🔐 Testing authentication...');

      // Connect and check if authentication works
      await this.client.connect('main');
      
      // Listen for connected event to verify authentication
      let authTestPassed = false;
      
      const authHandler = (event: BMSWebSocketEvent) => {
        if (event.type === 'connected') {
          authTestPassed = true;
          console.log('✅ Authentication successful');
          this.recordTest('authentication', true);
        }
      };

      this.client.on('connected', authHandler);

      // Wait for authentication (timeout after 5 seconds)
      setTimeout(() => {
        if (!authTestPassed) {
          console.log('❌ Authentication test timed out');
          this.recordTest('authentication', false, 'Authentication timeout');
        }
      }, 5000);

    } catch (error) {
      console.error('❌ Authentication test failed:', error);
      this.recordTest('authentication', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test event handling system
   */
  private async testEventHandling(): Promise<void> {
    try {
      console.log('📡 Testing event handling...');

      let eventReceived = false;

      // Subscribe to a test event
      const unsubscribe = this.client.on('test-event', (event: BMSWebSocketEvent) => {
        console.log('✅ Test event received:', event);
        eventReceived = true;
        this.recordTest('event-handling', true);
      });

      // Simulate receiving an event (this would normally come from the server)
      const testEvent: BMSWebSocketEvent = {
        id: 'test-' + Date.now(),
        type: 'test-event',
        timestamp: new Date(),
        branchId: 'test-branch',
        data: { message: 'test event data' }
      };

      // Emit the test event locally to test the handler
      (this.client as any).emitEvent('test-event', testEvent);

      // Cleanup
      unsubscribe();

      // Wait a bit for event processing
      setTimeout(() => {
        if (!eventReceived) {
          this.recordTest('event-handling', false, 'Event not received');
        }
      }, 1000);

    } catch (error) {
      console.error('❌ Event handling test failed:', error);
      this.recordTest('event-handling', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test reconnection logic
   */
  private async testReconnection(): Promise<void> {
    try {
      console.log('🔄 Testing reconnection...');

      // Connect first
      await this.client.connect('main');
      
      if (!this.client.isConnected) {
        this.recordTest('reconnection-prerequisite', false, 'Cannot connect to test reconnection');
        return;
      }

      // Simulate disconnection by force disconnecting
      this.client.disconnect();
      
      // Wait for disconnection
      setTimeout(async () => {
        try {
          // Test automatic reconnection would be triggered by the client
          // For testing purposes, we'll manually trigger reconnection
          await this.client.connect('main');
          
          if (this.client.isConnected) {
            console.log('✅ Reconnection successful');
            this.recordTest('reconnection', true);
          } else {
            this.recordTest('reconnection', false, 'Reconnection failed');
          }
        } catch (error) {
          this.recordTest('reconnection', false, error instanceof Error ? error.message : 'Reconnection error');
        }
      }, 200);

    } catch (error) {
      console.error('❌ Reconnection test failed:', error);
      this.recordTest('reconnection', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test room management
   */
  private async testRoomManagement(): Promise<void> {
    try {
      console.log('🏠 Testing room management...');

      await this.client.connect('main');

      // Test joining a room
      this.client.joinRoom('test-room');

      // Test getting current rooms
      const rooms = await this.client.getCurrentRooms();
      
      if (rooms.includes('test-room')) {
        console.log('✅ Room joining successful');
        this.recordTest('room-management', true);
      } else {
        this.recordTest('room-management', false, 'Room not found in current rooms');
      }

      // Test leaving the room
      this.client.leaveRoom('test-room');

      // Check if room was left
      setTimeout(async () => {
        const updatedRooms = await this.client.getCurrentRooms();
        if (!updatedRooms.includes('test-room')) {
          console.log('✅ Room leaving successful');
          this.recordTest('room-management-leave', true);
        } else {
          this.recordTest('room-management-leave', false, 'Room still in current rooms');
        }
      }, 100);

    } catch (error) {
      console.error('❌ Room management test failed:', error);
      this.recordTest('room-management', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test React hooks integration
   */
  private async testRealTimeHooks(): Promise<void> {
    try {
      console.log('⚛️ Testing React hooks...');

      // Test useWebSocketEvent hook
      let hookEventReceived = false;
      
      // Create a test subscription using the hook pattern
      useWebSocketEvent('test-hook-event', (event: BMSWebSocketEvent) => {
        hookEventReceived = true;
        console.log('✅ Hook event received:', event);
        this.recordTest('react-hooks', true);
      });

      // Emit a test event
      const testEvent: BMSWebSocketEvent = {
        id: 'hook-test-' + Date.now(),
        type: 'test-hook-event',
        timestamp: new Date(),
        branchId: 'test-branch',
        data: { message: 'hook test event' }
      };

      // Emit the test event
      (this.client as any).emitEvent('test-hook-event', testEvent);

      // Cleanup
      unsubscribe();

      // Wait for event processing
      setTimeout(() => {
        if (!hookEventReceived) {
          this.recordTest('react-hooks', false, 'Hook event not received');
        }
      }, 1000);

    } catch (error) {
      console.error('❌ React hooks test failed:', error);
      this.recordTest('react-hooks', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test connection state management
   */
  private async testConnectionStateManagement(): Promise<void> {
    try {
      console.log('📊 Testing connection state management...');

      let stateChanges: string[] = [];
      
      // Subscribe to connection state changes
      const unsubscribe = this.client.onConnectionStateChange((state) => {
        stateChanges.push(state);
        console.log('🔄 Connection state changed to:', state);
      });

      // Connect and monitor state changes
      await this.client.connect('main');
      
      // Disconnect and monitor state changes
      this.client.disconnect();

      // Wait for state changes to be processed
      setTimeout(() => {
        if (stateChanges.length >= 2) {
          console.log('✅ Connection state management working');
          this.recordTest('connection-state-management', true);
        } else {
          this.recordTest('connection-state-management', false, 'Insufficient state changes detected');
        }
        
        unsubscribe();
      }, 500);

    } catch (error) {
      console.error('❌ Connection state management test failed:', error);
      this.recordTest('connection-state-management', false, error instanceof Error ? error.message : 'Unknown error');
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
   * Generate test report
   */
  generateReport(): string {
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    
    let report = `WebSocket Client Test Report\n`;
    report += `============================\n\n`;
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
 * Utility function to run tests
 */
export const runWebSocketTests = async (): Promise<void> => {
  const tester = new WebSocketClientTests();
  const results = await tester.runAllTests();
  
  console.log(tester.generateReport());
  
  if (results.failed > 0) {
    throw new Error(`WebSocket tests failed: ${results.failed}/${results.total} tests failed`);
  }
  
  console.log('🎉 All WebSocket tests passed!');
};

/**
 * Example usage integration
 */
export const WebSocketIntegrationExample: React.FC = () => {
  // Example of using the WebSocket hooks in a React component
  const {
    isConnected,
    connectionState,
    subscribe
  } = useWebSocket({
    autoConnect: true,
    namespace: 'main',
    eventHandlers: {
      'inventory:updated': (event) => {
        console.log('🔄 Inventory updated:', event.data);
        // Update local state or trigger data refresh
      },
      'product:updated': (event) => {
        console.log('🔄 Product updated:', event.data);
        // Update local state or trigger data refresh
      },
      'system:notification': (event) => {
        console.log('🔔 System notification:', event.data);
        // Show notification to user
      }
    }
  });

  return (
    <div className="websocket-integration-example">
      <h3>WebSocket Integration Example</h3>
      
      <div className="status">
        <p>Connection Status: {connectionState}</p>
        <p>Is Connected: {isConnected ? 'Yes' : 'No'}</p>
      </div>
      
      <div className="controls">
        <button onClick={() => connect()}>
          Connect
        </button>
        <button onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
      
      <div className="events">
        <p>Listening for real-time events:</p>
        <ul>
          <li>Inventory Updates</li>
          <li>Product Updates</li>
          <li>System Notifications</li>
        </ul>
      </div>
    </div>
  );
};

export default WebSocketClientTests;