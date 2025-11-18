// Real-time events system for BMS
import { UserRole } from '@prisma/client';

// Core event types
export type EventType = 
  | 'inventory:updated'
  | 'product:updated'
  | 'transaction:created'
  | 'system:notification'
  | 'user:updated'
  | 'branch:updated'
  | 'sync:status'
  | 'low-stock:alert'
  | 'transaction:status-changed'
  | 'user:login'
  | 'user:logout'
  | 'stock:adjustment'
  | 'category:updated'
  | 'dashboard:refresh';

// Base event interface
export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  branchId: string;
  userId?: string;
  data: any;
}

// Product updated event
export interface ProductUpdatedEvent extends BaseEvent {
  type: 'product:updated';
  data: {
    productId: string;
    product: {
      id: string;
      sku: string;
      name: string;
      price: number;
      cost: number;
      stock: number;
      minStock: number;
      maxStock: number;
      categoryId?: string;
      isActive: boolean;
    };
    action: 'created' | 'updated' | 'deleted' | 'restored';
    changes?: Partial<{
      name: string;
      price: number;
      cost: number;
      stock: number;
      categoryId: string;
      isActive: boolean;
    }>;
  };
}

// Inventory updated event
export interface InventoryUpdatedEvent extends BaseEvent {
  type: 'inventory:updated';
  data: {
    productId: string;
    productSku: string;
    productName: string;
    previousStock: number;
    newStock: number;
    adjustment: number;
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    reason: string;
    userId: string;
    userName: string;
  };
}

// Transaction created event
export interface TransactionCreatedEvent extends BaseEvent {
  type: 'transaction:created';
  data: {
    transactionId: string;
    transactionCode: string;
    finalAmount: number;
    paymentMethod: string;
    userId: string;
    userName: string;
    items: Array<{
      productId: string;
      productName: string;
      productSku: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
  };
}

// Transaction status changed event
export interface TransactionStatusChangedEvent extends BaseEvent {
  type: 'transaction:status-changed';
  data: {
    transactionId: string;
    transactionCode: string;
    previousStatus: string;
    newStatus: string;
    userId: string;
    userName: string;
    notes?: string;
  };
}

// System notification event
export interface SystemNotificationEvent extends BaseEvent {
  type: 'system:notification';
  data: {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    category: 'system' | 'inventory' | 'transaction' | 'user' | 'security';
    actionRequired?: boolean;
    actionUrl?: string;
  };
}

// User updated event
export interface UserUpdatedEvent extends BaseEvent {
  type: 'user:updated';
  data: {
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      branchId?: string;
      isActive: boolean;
    };
    action: 'created' | 'updated' | 'deactivated' | 'activated';
  };
}

// Branch updated event
export interface BranchUpdatedEvent extends BaseEvent {
  type: 'branch:updated';
  data: {
    branchId: string;
    branch: {
      id: string;
      name: string;
      address?: string;
      phone?: string;
      isActive: boolean;
    };
    action: 'created' | 'updated' | 'deactivated' | 'activated';
  };
}

// Low stock alert event
export interface LowStockAlertEvent extends BaseEvent {
  type: 'low-stock:alert';
  data: {
    productId: string;
    productSku: string;
    productName: string;
    currentStock: number;
    minStock: number;
    urgency: 'warning' | 'critical';
    branchId: string;
  };
}

// Sync status event
export interface SyncStatusEvent extends BaseEvent {
  type: 'sync:status';
  data: {
    syncType: 'products' | 'transactions' | 'inventory' | 'full';
    status: 'started' | 'progress' | 'completed' | 'error';
    progress?: number;
    total?: number;
    processed?: number;
    message?: string;
    error?: string;
  };
}

// Stock adjustment event
export interface StockAdjustmentEvent extends BaseEvent {
  type: 'stock:adjustment';
  data: {
    productId: string;
    productSku: string;
    productName: string;
    previousStock: number;
    newStock: number;
    adjustment: number;
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    reason: string;
    userId: string;
    userName: string;
    notes?: string;
  };
}

// Category updated event
export interface CategoryUpdatedEvent extends BaseEvent {
  type: 'category:updated';
  data: {
    categoryId: string;
    category: {
      id: string;
      name: string;
      code: string;
      description?: string;
      parentId?: string;
      isActive: boolean;
    };
    action: 'created' | 'updated' | 'deleted';
  };
}

// Dashboard refresh event
export interface DashboardRefreshEvent extends BaseEvent {
  type: 'dashboard:refresh';
  data: {
    reason: 'transaction-created' | 'inventory-updated' | 'manual';
    scope: 'global' | 'branch' | 'user';
    refreshType: 'overview' | 'stats' | 'notifications' | 'all';
  };
}

// Union type of all events
export type BMSWebSocketEvent = 
  | ProductUpdatedEvent
  | InventoryUpdatedEvent
  | TransactionCreatedEvent
  | TransactionStatusChangedEvent
  | SystemNotificationEvent
  | UserUpdatedEvent
  | BranchUpdatedEvent
  | LowStockAlertEvent
  | SyncStatusEvent
  | StockAdjustmentEvent
  | CategoryUpdatedEvent
  | DashboardRefreshEvent;

// Event emitter utility
export class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: EventType, callback: (event: BMSWebSocketEvent) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: EventType, callback: Function): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: BMSWebSocketEvent): void {
    const callbacks = this.events.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => callback(event));
    }
  }

  removeAllListeners(event?: EventType): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

// Event factory functions
export const createEvent = <T extends BMSWebSocketEvent['data']>(
  type: EventType,
  data: T,
  branchId: string,
  userId?: string
): BMSWebSocketEvent => ({
  id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type,
  timestamp: new Date(),
  branchId,
  userId,
  data
} as BMSWebSocketEvent);

// Common event creators
export const createProductUpdatedEvent = (
  productData: any,
  action: 'created' | 'updated' | 'deleted' | 'restored',
  branchId: string,
  userId?: string,
  changes?: any
) => createEvent('product:updated', {
  productId: productData.id,
  product: productData,
  action,
  changes
}, branchId, userId);

export const createInventoryUpdatedEvent = (
  productData: any,
  previousStock: number,
  adjustment: number,
  type: 'IN' | 'OUT' | 'ADJUSTMENT',
  reason: string,
  branchId: string,
  userId: string,
  userName: string
) => createEvent('inventory:updated', {
  productId: productData.id,
  productSku: productData.sku,
  productName: productData.name,
  previousStock,
  newStock: productData.stock,
  adjustment,
  type,
  reason,
  userId,
  userName
}, branchId, userId);

export const createTransactionCreatedEvent = (
  transactionData: any,
  branchId: string,
  userId: string
) => createEvent('transaction:created', {
  transactionId: transactionData.id,
  transactionCode: transactionData.transactionCode,
  finalAmount: transactionData.finalAmount,
  paymentMethod: transactionData.paymentMethod,
  userId: transactionData.userId,
  userName: transactionData.user?.name || 'Unknown User',
  items: transactionData.items?.map((item: any) => ({
    productId: item.productId,
    productName: item.product?.name || 'Unknown Product',
    productSku: item.product?.sku || 'Unknown SKU',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total
  })) || []
}, branchId, userId);

export const createSystemNotificationEvent = (
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'error' | 'success',
  category: 'system' | 'inventory' | 'transaction' | 'user' | 'security',
  branchId: string,
  userId?: string,
  actionRequired?: boolean,
  actionUrl?: string
) => createEvent('system:notification', {
  title,
  message,
  severity,
  category,
  actionRequired,
  actionUrl
}, branchId, userId);

export const createLowStockAlertEvent = (
  productData: any,
  branchId: string
) => {
  const urgency = productData.stock <= 0 ? 'critical' : 'warning';
  return createEvent('low-stock:alert', {
    productId: productData.id,
    productSku: productData.sku,
    productName: productData.name,
    currentStock: productData.stock,
    minStock: productData.minStock,
    urgency,
    branchId
  }, branchId);
};

// Event validation
export const validateEvent = (event: any): event is BMSWebSocketEvent => {
  return (
    typeof event === 'object' &&
    typeof event.id === 'string' &&
    typeof event.type === 'string' &&
    event.timestamp instanceof Date &&
    typeof event.branchId === 'string' &&
    typeof event.data === 'object'
  );
};