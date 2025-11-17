// Inventory management service with real-time stock tracking
export type StockMovementType = 'sale' | 'restock' | 'adjustment' | 'return';

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number; // Positive for increases, negative for decreases
  previousStock: number;
  newStock: number;
  reason?: string;
  timestamp: Date;
  userId: string;
  transactionId?: string;
  approvedBy?: string;
  notes?: string;
}

export interface InventoryItem {
  productId: string;
  currentStock: number;
  reservedStock: number; // For pending orders/reservations
  reorderLevel: number; // Minimum stock before reorder
  reorderQuantity: number; // Recommended reorder amount
  lastRestocked?: Date;
  movements: StockMovement[];
  totalValue?: number; // Current stock value
  averageCost?: number; // Average cost per unit
  lowStockAlerted: boolean; // To prevent multiple alerts
}

export interface InventoryUpdate {
  productId: string;
  previousStock: number;
  newStock: number;
  movementId: string;
  timestamp: Date;
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  reorderLevel: number;
  shortage: number; // How many units below reorder level
  suggestedReorder: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  lastAlerted?: Date;
}

export interface StockMovementQuery {
  productId?: string;
  type?: StockMovementType;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  criticalStockItems: number;
  outOfStockItems: number;
  recentMovements: number; // Last 24 hours
  averageStockLevel: number;
}

class InventoryService {
  private readonly STORAGE_KEY = 'bms_pos_inventory';
  private readonly MOVEMENTS_KEY = 'bms_pos_stock_movements';
  private readonly DEFAULT_REORDER_LEVEL = 10;
  private readonly DEFAULT_REORDER_QUANTITY = 50;

  // Sample products for initialization
  private readonly SAMPLE_PRODUCTS = [
    { id: 'prod-1', name: 'Coffee Beans', stock: 25, price: 15000 },
    { id: 'prod-2', name: 'Tea Leaves', stock: 8, price: 12000 },
    { id: 'prod-3', name: 'Sugar Packets', stock: 50, price: 500 },
    { id: 'prod-4', name: 'Cups', stock: 15, price: 200 },
    { id: 'prod-5', name: 'Lids', stock: 30, price: 100 },
  ];

  // Get all inventory items from localStorage
  private loadInventoryFromStorage(): InventoryItem[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const inventory = JSON.parse(stored);
      // Convert date strings back to Date objects
      return inventory.map((item: any) => ({
        ...item,
        lastRestocked: item.lastRestocked ? new Date(item.lastRestocked) : undefined,
        movements: item.movements?.map((movement: any) => ({
          ...movement,
          timestamp: new Date(movement.timestamp)
        })) || []
      }));
    } catch (error) {
      console.error('Error loading inventory:', error);
      return [];
    }
  }

  // Save inventory to localStorage
  private saveInventory(inventory: InventoryItem[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(inventory));
    } catch (error) {
      console.error('Error saving inventory:', error);
      throw new Error('Failed to save inventory data');
    }
  }

  // Get all stock movements from localStorage
  private loadMovementsFromStorage(): StockMovement[] {
    try {
      const stored = localStorage.getItem(this.MOVEMENTS_KEY);
      if (!stored) return [];
      
      const movements = JSON.parse(stored);
      // Convert date strings back to Date objects
      return movements.map((movement: any) => ({
        ...movement,
        timestamp: new Date(movement.timestamp)
      }));
    } catch (error) {
      console.error('Error loading movements:', error);
      return [];
    }
  }

  // Save movements to localStorage
  private saveMovements(movements: StockMovement[]): void {
    try {
      localStorage.setItem(this.MOVEMENTS_KEY, JSON.stringify(movements));
    } catch (error) {
      console.error('Error saving movements:', error);
      throw new Error('Failed to save movement data');
    }
  }

  // Generate unique movement ID
  private generateMovementId(): string {
    return `movement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize inventory from sample products
  private initializeInventory(): void {
    const existingInventory = this.loadInventoryFromStorage();
    
    if (existingInventory.length === 0) {
      const initialInventory: InventoryItem[] = this.SAMPLE_PRODUCTS.map(product => ({
        productId: product.id,
        currentStock: product.stock,
        reservedStock: 0,
        reorderLevel: this.DEFAULT_REORDER_LEVEL,
        reorderQuantity: this.DEFAULT_REORDER_QUANTITY,
        movements: [],
        totalValue: product.stock * product.price,
        averageCost: product.price,
        lowStockAlerted: false
      }));

      this.saveInventory(initialInventory);
      console.log('Inventory initialized with sample products');
    }
  }

  constructor() {
    this.initializeInventory();
  }

  /**
   * Get current inventory item for a product
   */
  async getInventoryItem(productId: string): Promise<InventoryItem | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const inventory = this.loadInventoryFromStorage();
    return inventory.find(item => item.productId === productId) || null;
  }

  /**
   * Get all inventory items
   */
  async getAllInventory(): Promise<InventoryItem[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return this.loadInventoryFromStorage();
  }

  /**
   * Update stock with movement tracking
   */
  async updateStock(
    productId: string,
    quantity: number,
    type: StockMovementType,
    userId: string,
    reason?: string,
    transactionId?: string,
    notes?: string
  ): Promise<{ success: boolean; movement?: StockMovement; error?: string }> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));

      const inventory = this.loadInventoryFromStorage();
      const movements = this.loadMovementsFromStorage();
      
      const itemIndex = inventory.findIndex(item => item.productId === productId);
      if (itemIndex === -1) {
        return { success: false, error: 'Product not found in inventory' };
      }

      const item = inventory[itemIndex];
      const previousStock = item.currentStock;
      const newStock = previousStock + quantity;

      // Validate stock levels
      if (newStock < 0) {
        return { success: false, error: 'Insufficient stock for this operation' };
      }

      // Create movement record
      const movement: StockMovement = {
        id: this.generateMovementId(),
        productId,
        type,
        quantity,
        previousStock,
        newStock,
        reason,
        timestamp: new Date(),
        userId,
        transactionId,
        notes
      };

      // Update inventory item
      const updatedItem: InventoryItem = {
        ...item,
        currentStock: newStock,
        lastRestocked: type === 'restock' ? new Date() : item.lastRestocked,
        movements: [...item.movements, movement]
      };

      // Update arrays
      inventory[itemIndex] = updatedItem;
      movements.push(movement);

      // Save changes
      this.saveInventory(inventory);
      this.saveMovements(movements);

      return { success: true, movement };
    } catch (error) {
      console.error('Error updating stock:', error);
      return { success: false, error: 'Failed to update stock' };
    }
  }

  /**
   * Get low stock items (below reorder level)
   */
  async getLowStockItems(): Promise<LowStockAlert[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 120));
    
    const inventory = this.loadInventoryFromStorage();
    const lowStockAlerts: LowStockAlert[] = [];

    for (const item of inventory) {
      if (item.currentStock <= item.reorderLevel) {
        const shortage = item.reorderLevel - item.currentStock;
        const suggestedReorder = Math.max(shortage, item.reorderQuantity);
        
        let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (item.currentStock === 0) priority = 'critical';
        else if (shortage > item.reorderLevel * 0.5) priority = 'high';
        else if (shortage > item.reorderLevel * 0.2) priority = 'medium';

        lowStockAlerts.push({
          productId: item.productId,
          productName: `Product ${item.productId}`, // In real app, would fetch product name
          currentStock: item.currentStock,
          reorderLevel: item.reorderLevel,
          shortage,
          suggestedReorder,
          priority,
          lastAlerted: item.lowStockAlerted ? new Date() : undefined
        });
      }
    }

    return lowStockAlerts;
  }

  /**
   * Get stock movements with filtering
   */
  async getStockMovements(query: StockMovementQuery = {}): Promise<StockMovement[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 180));
    
    let movements = this.loadMovementsFromStorage();

    // Apply filters
    if (query.productId) {
      movements = movements.filter(m => m.productId === query.productId);
    }

    if (query.type) {
      movements = movements.filter(m => m.type === query.type);
    }

    if (query.userId) {
      movements = movements.filter(m => m.userId === query.userId);
    }

    if (query.startDate) {
      movements = movements.filter(m => m.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      movements = movements.filter(m => m.timestamp <= query.endDate!);
    }

    // Sort by timestamp (newest first)
    movements.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    return movements.slice(offset, offset + limit);
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStats(): Promise<InventoryStats> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const inventory = this.loadInventoryFromStorage();
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let totalValue = 0;
    let lowStockItems = 0;
    let criticalStockItems = 0;
    let outOfStockItems = 0;
    let totalStock = 0;

    for (const item of inventory) {
      totalValue += item.totalValue || 0;
      totalStock += item.currentStock;

      if (item.currentStock === 0) {
        outOfStockItems++;
      } else if (item.currentStock <= item.reorderLevel * 0.2) {
        criticalStockItems++;
        lowStockItems++;
      } else if (item.currentStock <= item.reorderLevel) {
        lowStockItems++;
      }
    }

    const movements = this.loadMovementsFromStorage();
    const recentMovements = movements.filter(m => m.timestamp >= yesterday).length;

    return {
      totalItems: inventory.length,
      totalValue,
      lowStockItems,
      criticalStockItems,
      outOfStockItems,
      recentMovements,
      averageStockLevel: inventory.length > 0 ? totalStock / inventory.length : 0
    };
  }

  /**
   * Batch update multiple products
   */
  async batchUpdateStock(updates: Array<{
    productId: string;
    quantity: number;
    type: StockMovementType;
    reason?: string;
    notes?: string;
  }>, userId: string, transactionId?: string): Promise<{
    success: boolean;
    results: Array<{ productId: string; success: boolean; movement?: StockMovement; error?: string }>;
  }> {
    try {
      // Simulate API delay for batch operation
      await new Promise(resolve => setTimeout(resolve, 500));

      const results = [];
      const inventory = this.loadInventoryFromStorage();
      const movements = this.loadMovementsFromStorage();

      for (const update of updates) {
        const itemIndex = inventory.findIndex(item => item.productId === update.productId);
        
        if (itemIndex === -1) {
          results.push({
            productId: update.productId,
            success: false,
            error: 'Product not found in inventory'
          });
          continue;
        }

        const item = inventory[itemIndex];
        const previousStock = item.currentStock;
        const newStock = previousStock + update.quantity;

        if (newStock < 0) {
          results.push({
            productId: update.productId,
            success: false,
            error: 'Insufficient stock for this operation'
          });
          continue;
        }

        const movement: StockMovement = {
          id: this.generateMovementId(),
          productId: update.productId,
          type: update.type,
          quantity: update.quantity,
          previousStock,
          newStock,
          reason: update.reason,
          timestamp: new Date(),
          userId,
          transactionId,
          notes: update.notes
        };

        // Update inventory item
        const updatedItem: InventoryItem = {
          ...item,
          currentStock: newStock,
          lastRestocked: update.type === 'restock' ? new Date() : item.lastRestocked,
          movements: [...item.movements, movement]
        };

        inventory[itemIndex] = updatedItem;
        movements.push(movement);

        results.push({
          productId: update.productId,
          success: true,
          movement
        });
      }

      // Save all changes
      this.saveInventory(inventory);
      this.saveMovements(movements);

      return { success: true, results };
    } catch (error) {
      console.error('Error in batch update:', error);
      return {
        success: false,
        results: updates.map(u => ({ productId: u.productId, success: false, error: 'Batch operation failed' }))
      };
    }
  }

  /**
   * Set reorder levels for a product
   */
  async setReorderLevel(
    productId: string,
    reorderLevel: number,
    reorderQuantity: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const inventory = this.loadInventoryFromStorage();
      const itemIndex = inventory.findIndex(item => item.productId === productId);
      
      if (itemIndex === -1) {
        return { success: false, error: 'Product not found in inventory' };
      }

      if (reorderLevel < 0 || reorderQuantity <= 0) {
        return { success: false, error: 'Invalid reorder level or quantity' };
      }

      inventory[itemIndex] = {
        ...inventory[itemIndex],
        reorderLevel,
        reorderQuantity
      };

      this.saveInventory(inventory);
      return { success: true };
    } catch (error) {
      console.error('Error setting reorder level:', error);
      return { success: false, error: 'Failed to set reorder level' };
    }
  }

  /**
   * Check if stock is available for a transaction
   */
  async checkStockAvailability(items: Array<{ productId: string; quantity: number }>): Promise<{
    available: boolean;
    issues: Array<{ productId: string; requested: number; available: number }>;
  }> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const inventory = this.loadInventoryFromStorage();
    const issues = [];

    for (const item of items) {
      const inventoryItem = inventory.find(inv => inv.productId === item.productId);
      const available = inventoryItem ? inventoryItem.currentStock - inventoryItem.reservedStock : 0;
      
      if (available < item.quantity) {
        issues.push({
          productId: item.productId,
          requested: item.quantity,
          available
        });
      }
    }

    return {
      available: issues.length === 0,
      issues
    };
  }

  /**
   * Reserve stock for a pending transaction
   */
  async reserveStock(
    items: Array<{ productId: string; quantity: number }>,
    // transactionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First check availability
      const availability = await this.checkStockAvailability(items);
      if (!availability.available) {
        return { success: false, error: 'Insufficient stock for reservation' };
      }

      await new Promise(resolve => setTimeout(resolve, 150));
      
      const inventory = this.loadInventoryFromStorage();

      for (const item of items) {
        const itemIndex = inventory.findIndex(inv => inv.productId === item.productId);
        if (itemIndex !== -1) {
          inventory[itemIndex] = {
            ...inventory[itemIndex],
            reservedStock: inventory[itemIndex].reservedStock + item.quantity
          };
        }
      }

      this.saveInventory(inventory);
      return { success: true };
    } catch (error) {
      console.error('Error reserving stock:', error);
      return { success: false, error: 'Failed to reserve stock' };
    }
  }

  /**
   * Release reserved stock (when transaction is cancelled)
   */
  async releaseReservedStock(
    items: Array<{ productId: string; quantity: number }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const inventory = this.loadInventoryFromStorage();

      for (const item of items) {
        const itemIndex = inventory.findIndex(inv => inv.productId === item.productId);
        if (itemIndex !== -1) {
          const currentReserved = inventory[itemIndex].reservedStock;
          inventory[itemIndex] = {
            ...inventory[itemIndex],
            reservedStock: Math.max(0, currentReserved - item.quantity)
          };
        }
      }

      this.saveInventory(inventory);
      return { success: true };
    } catch (error) {
      console.error('Error releasing reserved stock:', error);
      return { success: false, error: 'Failed to release reserved stock' };
    }
  }

  /**
   * Clear low stock alert flag for a product
   */
  async clearLowStockAlert(productId: string): Promise<void> {
    const inventory = this.loadInventoryFromStorage();
    const itemIndex = inventory.findIndex(item => item.productId === productId);
    
    if (itemIndex !== -1) {
      inventory[itemIndex] = {
        ...inventory[itemIndex],
        lowStockAlerted: false
      };
      this.saveInventory(inventory);
    }
  }

  /**
   * Export inventory data
   */
  async exportInventoryData(): Promise<string> {
    const inventory = this.loadInventoryFromStorage();
    const movements = this.loadMovementsFromStorage();
    
    return JSON.stringify({
      inventory,
      movements,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  /**
   * Import inventory data
   */
  async importInventoryData(jsonData: string): Promise<{ success: boolean; error?: string }> {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.inventory && Array.isArray(data.inventory)) {
        this.saveInventory(data.inventory);
      }
      
      if (data.movements && Array.isArray(data.movements)) {
        this.saveMovements(data.movements);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error importing inventory data:', error);
      return { success: false, error: 'Invalid data format' };
    }
  }
}

export const inventoryService = new InventoryService();