/**
 * Inventory Tracking System Integration Test Suite
 * This file tests all the inventory management functionality including:
 * - InventoryService CRUD operations
 * - Stock movement tracking
 * - Low stock alerts
 * - Batch operations
 * - Data persistence
 * - Component integration
 */

import { inventoryService, StockMovementType } from '../services/InventoryService';
import { authService } from '../services/AuthService';

// Test runner
class InventoryIntegrationTest {
  private results: Array<{ test: string; status: 'PASS' | 'FAIL' | 'SKIP'; message?: string }> = [];
  private currentUser: any;

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Inventory Tracking System Integration Tests...\n');

    // Get current user for testing
    this.currentUser = authService.getCurrentUser();
    console.log(`👤 Testing with user: ${this.currentUser?.username || 'No user found'}`);

    await this.testInventoryServiceCore();
    await this.testPosIntegration();
    await this.testDataPersistence();
    await this.testComponentIntegration();

    this.printResults();
  }

  private async testInventoryServiceCore(): Promise<void> {
    console.log('📦 Testing InventoryService Core Functionality...');

    // Test 1: Initialize with sample products
    try {
      const inventory = await inventoryService.getAllInventory();
      this.addResult('Initialize with sample products', 
        inventory.length > 0 ? 'PASS' : 'FAIL', 
        `Found ${inventory.length} products`);
    } catch (error) {
      this.addResult('Initialize with sample products', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 2: Get inventory item for specific product
    try {
      const inventory = await inventoryService.getAllInventory();
      if (inventory.length > 0) {
        const firstProduct = inventory[0];
        const item = await inventoryService.getInventoryItem(firstProduct.productId);
        this.addResult('Get inventory item for specific product', 
          item ? 'PASS' : 'FAIL', 
          item ? `Found item for ${firstProduct.productId}` : 'Item not found');
      } else {
        this.addResult('Get inventory item for specific product', 'SKIP', 'No products available');
      }
    } catch (error) {
      this.addResult('Get inventory item for specific product', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 3: Update stock with movement tracking
    try {
      const testProductId = 'prod-1';
      const initialItem = await inventoryService.getInventoryItem(testProductId);
      
      if (initialItem) {
        const initialStock = initialItem.currentStock;
        const updateResult = await inventoryService.updateStock(
          testProductId,
          5, // Add 5 units
          'restock' as StockMovementType,
          this.currentUser?.id || '1',
          'Test restock',
          'test-transaction-123',
          'Test note'
        );

        this.addResult('Update stock with movement tracking', 
          updateResult.success ? 'PASS' : 'FAIL', 
          updateResult.success ? `Stock updated from ${initialStock} to ${initialStock + 5}` : 'Stock update failed');

        // Verify stock was updated
        const updatedItem = await inventoryService.getInventoryItem(testProductId);
        if (updatedItem) {
          this.addResult('Verify stock update', 
            updatedItem.currentStock === initialStock + 5 ? 'PASS' : 'FAIL',
            `Expected: ${initialStock + 5}, Actual: ${updatedItem.currentStock}`);
        }
      } else {
        this.addResult('Update stock with movement tracking', 'SKIP', 'Test product not found');
      }
    } catch (error) {
      this.addResult('Update stock with movement tracking', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 4: Detect low stock items
    try {
      const lowStockAlerts = await inventoryService.getLowStockItems();
      this.addResult('Detect low stock items', 
        Array.isArray(lowStockAlerts) ? 'PASS' : 'FAIL', 
        `Found ${lowStockAlerts.length} low stock alerts`);
    } catch (error) {
      this.addResult('Detect low stock items', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 5: Track stock movements
    try {
      const movements = await inventoryService.getStockMovements({ limit: 10 });
      this.addResult('Track stock movements', 
        Array.isArray(movements) ? 'PASS' : 'FAIL', 
        `Found ${movements.length} stock movements`);
    } catch (error) {
      this.addResult('Track stock movements', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 6: Get inventory statistics
    try {
      const stats = await inventoryService.getInventoryStats();
      const hasRequiredProps = stats && 
        typeof stats.totalItems === 'number' &&
        typeof stats.totalValue === 'number' &&
        typeof stats.lowStockItems === 'number';
      
      this.addResult('Get inventory statistics', 
        hasRequiredProps ? 'PASS' : 'FAIL', 
        `Total items: ${stats?.totalItems || 0}, Value: ${stats?.totalValue || 0}`);
    } catch (error) {
      this.addResult('Get inventory statistics', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 7: Check stock availability
    try {
      const availability = await inventoryService.checkStockAvailability([
        { productId: 'prod-1', quantity: 5 },
        { productId: 'prod-2', quantity: 2 }
      ]);
      
      const hasRequiredProps = availability && 
        typeof availability.available === 'boolean' &&
        Array.isArray(availability.issues);
      
      this.addResult('Check stock availability', 
        hasRequiredProps ? 'PASS' : 'FAIL', 
        `Available: ${availability?.available || false}, Issues: ${availability?.issues?.length || 0}`);
    } catch (error) {
      this.addResult('Check stock availability', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 8: Batch update multiple products
    try {
      if (this.currentUser) {
        const updates = [
          {
            productId: 'prod-1',
            quantity: 3,
            type: 'adjustment' as StockMovementType,
            reason: 'Test batch adjustment',
            notes: 'Test batch note'
          },
          {
            productId: 'prod-2',
            quantity: -2,
            type: 'sale' as StockMovementType,
            reason: 'Test batch sale',
            notes: 'Test batch sale note'
          }
        ];

        const result = await inventoryService.batchUpdateStock(updates, this.currentUser.id, 'test-batch-123');
        
        const success = result.success && 
          Array.isArray(result.results) && 
          result.results.length === 2;
          
        this.addResult('Batch update multiple products', 
          success ? 'PASS' : 'FAIL', 
          `Batch operation ${result.success ? 'successful' : 'failed'}`);
      } else {
        this.addResult('Batch update multiple products', 'SKIP', 'No current user available');
      }
    } catch (error) {
      this.addResult('Batch update multiple products', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testPosIntegration(): Promise<void> {
    console.log('🛒 Testing Integration with POS System...');

    // Test 1: Validate stock before adding to cart
    try {
      const testProductId = 'prod-1';
      const validation = await inventoryService.checkStockAvailability([
        { productId: testProductId, quantity: 1 }
      ]);
      
      const hasRequiredProps = validation && 
        typeof validation.available === 'boolean' &&
        Array.isArray(validation.issues);
      
      this.addResult('Validate stock before adding to cart', 
        hasRequiredProps ? 'PASS' : 'FAIL', 
        `Validation complete: ${validation?.available ? 'Available' : 'Not available'}`);
    } catch (error) {
      this.addResult('Validate stock before adding to cart', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 2: Update inventory during sales transaction
    try {
      if (this.currentUser) {
        const cartItems = [
          { productId: 'prod-1', productName: 'Test Product', sku: 'TEST-001', quantity: 2, unitPrice: 1000, discount: 0, total: 2000 },
          { productId: 'prod-2', productName: 'Test Product 2', sku: 'TEST-002', quantity: 1, unitPrice: 500, discount: 0, total: 500 }
        ];

        const stockUpdates = cartItems.map(item => ({
          productId: item.productId,
          quantity: -item.quantity,
          type: 'sale' as StockMovementType,
          reason: 'Test sale transaction',
          notes: `Sold ${item.quantity} units`
        }));

        const result = await inventoryService.batchUpdateStock(stockUpdates, this.currentUser.id, 'test-sale-123');
        
        const allSuccess = result.results && result.results.every((r: any) => r.success);
        
        this.addResult('Update inventory during sales transaction', 
          allSuccess ? 'PASS' : 'FAIL', 
          `Sales transaction ${allSuccess ? 'successful' : 'failed'}`);
      } else {
        this.addResult('Update inventory during sales transaction', 'SKIP', 'No current user available');
      }
    } catch (error) {
      this.addResult('Update inventory during sales transaction', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testDataPersistence(): Promise<void> {
    console.log('💾 Testing Data Persistence...');

    // Test 1: Export and import inventory data
    try {
      const exportData = await inventoryService.exportInventoryData();
      this.addResult('Export inventory data', 
        typeof exportData === 'string' ? 'PASS' : 'FAIL', 
        `Export completed (${exportData.length} characters)`);
      
      // Test import (this would normally be done in a separate test environment)
      const importResult = await inventoryService.importInventoryData(exportData);
      this.addResult('Import inventory data', 
        importResult.success ? 'PASS' : 'FAIL', 
        `Import ${importResult.success ? 'successful' : 'failed'}`);
    } catch (error) {
      this.addResult('Export and import inventory data', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testComponentIntegration(): Promise<void> {
    console.log('🧩 Testing Component Integration...');

    // Test 1: StockAlerts Component integration
    try {
      const lowStockAlerts = await inventoryService.getLowStockItems();
      this.addResult('StockAlerts Component integration', 
        Array.isArray(lowStockAlerts) ? 'PASS' : 'FAIL', 
        `Component data: ${lowStockAlerts.length} alerts`);
    } catch (error) {
      this.addResult('StockAlerts Component integration', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 2: InventoryOverview Component integration
    try {
      const [inventory, stats, movements] = await Promise.all([
        inventoryService.getAllInventory(),
        inventoryService.getInventoryStats(),
        inventoryService.getStockMovements({ limit: 50 })
      ]);
      
      const hasData = Array.isArray(inventory) && 
        stats && 
        Array.isArray(movements);
      
      this.addResult('InventoryOverview Component integration', 
        hasData ? 'PASS' : 'FAIL', 
        `Component data: ${inventory.length} items, stats, ${movements.length} movements`);
    } catch (error) {
      this.addResult('InventoryOverview Component integration', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 3: StockAdjustment Component integration
    try {
      if (this.currentUser) {
        const adjustmentResult = await inventoryService.updateStock(
          'prod-1',
          -5, // Reduce stock
          'adjustment' as StockMovementType,
          this.currentUser.id,
          'Test adjustment',
          'test-adjustment-123',
          'Manual stock correction'
        );
        
        this.addResult('StockAdjustment Component integration', 
          adjustmentResult.success ? 'PASS' : 'FAIL', 
          `Adjustment ${adjustmentResult.success ? 'successful' : 'failed'}`);
      } else {
        this.addResult('StockAdjustment Component integration', 'SKIP', 'No current user available');
      }
    } catch (error) {
      this.addResult('StockAdjustment Component integration', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'SKIP', message?: string): void {
    this.results.push({ test, status, message });
    let statusIcon = '';
    switch (status) {
      case 'PASS': statusIcon = '✅'; break;
      case 'FAIL': statusIcon = '❌'; break;
      case 'SKIP': statusIcon = '⏭️'; break;
    }
    console.log(`${statusIcon} ${test}: ${message || status}`);
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed + skipped)) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`  • ${result.test}: ${result.message}`);
      });
    }
    
    console.log('\n🎉 Inventory Tracking System Integration Tests Complete!');
  }
}

// Export test runner for use in development
export const runInventoryTests = async (): Promise<void> => {
  const tester = new InventoryIntegrationTest();
  await tester.runAllTests();
};

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location.search.includes('test=inventory')) {
  runInventoryTests();
}

console.log('Inventory Tracking System Integration Tests Setup Complete');