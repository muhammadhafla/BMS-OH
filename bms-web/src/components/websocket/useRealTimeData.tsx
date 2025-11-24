import { useState, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { BMSWebSocketEvent } from '@/lib/websocket';
import { useSWRConfig } from 'swr';

interface UseRealTimeDataOptions {
  refreshKeys?: string[];
  enableInventoryUpdates?: boolean;
  enableProductUpdates?: boolean;
  enableTransactionUpdates?: boolean;
}

/**
 * Hook for real-time data updates that integrates with SWR
 * Automatically refreshes cached data when updates are received
 */
export const useRealTimeData = (options: UseRealTimeDataOptions = {}) => {
  const { 
    refreshKeys = [],
    enableInventoryUpdates = true,
    enableProductUpdates = true,
    enableTransactionUpdates = true 
  } = options;

  const { mutate } = useSWRConfig();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { subscribe } = useWebSocket({
    autoConnect: true,
    namespace: 'main',
    eventHandlers: {
      ...(enableInventoryUpdates && {
        'inventory:updated': (event: BMSWebSocketEvent) => {
          console.log('🔄 Inventory update received:', event.data);
          setLastUpdate(new Date());
          
          // Refresh related SWR keys
          const keysToRefresh = [
            ...refreshKeys,
            '/api/inventory',
            '/api/products',
            '/api/dashboard/stats',
            '/api/inventory/low-stock'
          ];
          
          keysToRefresh.forEach(key => {
            mutate(key);
          });
        }
      }),
      
      ...(enableProductUpdates && {
        'product:updated': (event: BMSWebSocketEvent) => {
          console.log('🔄 Product update received:', event.data);
          setLastUpdate(new Date());
          
          // Refresh product-related keys
          const keysToRefresh = [
            ...refreshKeys,
            '/api/products',
            '/api/categories',
            '/api/dashboard/stats',
            `/api/products/${event.data.productId}`
          ];
          
          keysToRefresh.forEach(key => {
            mutate(key);
          });
        }
      }),
      
      ...(enableTransactionUpdates && {
        'transaction:created': (event: BMSWebSocketEvent) => {
          console.log('🔄 Transaction update received:', event.data);
          setLastUpdate(new Date());
          
          // Refresh transaction-related keys
          const keysToRefresh = [
            ...refreshKeys,
            '/api/transactions',
            '/api/dashboard/stats',
            '/api/inventory' // Inventory may have changed
          ];
          
          keysToRefresh.forEach(key => {
            mutate(key);
          });
        }
      })
    }
  });

  // Force refresh all data
  const refreshAllData = useCallback(async () => {
    console.log('🔄 Forcing refresh of all real-time data...');
    
    const keysToRefresh = [
      ...refreshKeys,
      '/api/products',
      '/api/inventory',
      '/api/transactions',
      '/api/categories',
      '/api/dashboard/stats',
      '/api/users',
      '/api/suppliers'
    ];
    
    keysToRefresh.forEach(key => {
      mutate(key);
    });
    
    setLastUpdate(new Date());
  }, [refreshKeys, mutate]);

  // Get time since last update
  const getTimeSinceLastUpdate = () => {
    if (!lastUpdate) return null;
    return Date.now() - lastUpdate.getTime();
  };

  return {
    lastUpdate,
    refreshAllData,
    getTimeSinceLastUpdate,
    subscribe
  };
};

/**
 * Hook specifically for dashboard real-time updates
 */
export const useDashboardRealTime = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { subscribe } = useWebSocket({
    autoConnect: true,
    namespace: 'main',
    eventHandlers: {
      'inventory:updated': () => {
        console.log('📊 Dashboard: Inventory update');
        // Could update specific dashboard metrics
      },
      
      'transaction:created': () => {
        console.log('📊 Dashboard: New transaction');
        // Could update sales metrics, transaction counts, etc.
      },
      
      'product:updated': () => {
        console.log('📊 Dashboard: Product update');
        // Could update product metrics
      }
    }
  });

  return {
    dashboardData,
    setDashboardData,
    isLoading,
    setIsLoading,
    subscribe
  };
};

/**
 * Hook for inventory management real-time updates
 */
export const useInventoryRealTime = () => {
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { subscribe } = useWebSocket({
    autoConnect: true,
    namespace: 'main',
    eventHandlers: {
      'inventory:updated': (event: BMSWebSocketEvent) => {
        console.log('📦 Inventory: Stock level changed');
        const { productId, productName, currentStock, minStock } = event.data as {
          productId: string;
          productName: string;
          currentStock: number;
          minStock: number;
        };
        
        // Update local state if needed
        setInventoryData(prev => 
          prev.map(item => 
            item.id === productId 
              ? { ...item, currentStock, updatedAt: new Date() }
              : item
          )
        );
        
        // Update low stock items
        if (currentStock <= minStock) {
          setLowStockItems(prev => {
            const existing = prev.find(item => item.id === productId);
            if (existing) {
              return prev.map(item => 
                item.id === productId 
                  ? { ...item, currentStock }
                  : item
              );
            } else {
              return [...prev, { 
                id: productId, 
                name: productName, 
                currentStock, 
                minStock 
              }];
            }
          });
        } else {
          setLowStockItems(prev => prev.filter(item => item.id !== productId));
        }
      },
      
      'low-stock:alert': (event: BMSWebSocketEvent) => {
        console.log('⚠️ Inventory: Low stock alert');
        const { productId, productName, currentStock, minStock } = event.data as {
          productId: string;
          productName: string;
          currentStock: number;
          minStock: number;
        };
        
        setLowStockItems(prev => {
          const existing = prev.find(item => item.id === productId);
          if (existing) {
            return prev.map(item => 
              item.id === productId 
                ? { ...item, currentStock }
                : item
            );
          } else {
            return [...prev, { 
              id: productId, 
              name: productName, 
              currentStock, 
              minStock 
            }];
          }
        });
      }
    }
  });

  return {
    inventoryData,
    setInventoryData,
    lowStockItems,
    setLowStockItems,
    isLoading,
    setIsLoading,
    subscribe
  };
};

/**
 * Hook for product management real-time updates
 */
export const useProductRealTime = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { subscribe } = useWebSocket({
    autoConnect: true,
    namespace: 'main',
    eventHandlers: {
      'product:updated': (event: BMSWebSocketEvent) => {
        console.log('🏷️ Products: Product updated');
        const { productId, changes } = event.data as {
          productId: string;
          changes: Record<string, any>;
        };
        
        setProducts(prev => 
          prev.map(product => 
            product.id === productId 
              ? { ...product, ...changes, updatedAt: new Date() }
              : product
          )
        );
      },
      
      'product:created': (event: BMSWebSocketEvent) => {
        console.log('🏷️ Products: New product created');
        const { product } = event.data as { product: any };
        
        setProducts(prev => [product, ...prev]);
      },
      
      'product:deleted': (event: BMSWebSocketEvent) => {
        console.log('🏷️ Products: Product deleted');
        const { productId } = event.data as { productId: string };
        
        setProducts(prev => prev.filter(product => product.id !== productId));
      }
    }
  });

  return {
    products,
    setProducts,
    categories,
    setCategories,
    isLoading,
    setIsLoading,
    subscribe
  };
};

/**
 * Hook for transaction real-time updates
 */
export const useTransactionRealTime = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState<any>(null);

  const { subscribe } = useWebSocket({
    autoConnect: true,
    namespace: 'main',
    eventHandlers: {
      'transaction:created': (event: BMSWebSocketEvent) => {
        console.log('💳 Transactions: New transaction');
        const { transaction } = event.data as { transaction: any };
        
        // Add new transaction
        setTransactions(prev => [transaction, ...prev]);
        
        // Update today's stats
        if (todayStats) {
          setTodayStats((prev: any) => ({
            ...prev,
            totalTransactions: (prev?.totalTransactions || 0) + 1,
            totalRevenue: (prev?.totalRevenue || 0) + transaction.totalAmount
          }));
        }
      },
      
      'transaction:updated': (event: BMSWebSocketEvent) => {
        console.log('💳 Transactions: Transaction updated');
        const { transactionId, changes } = event.data as {
          transactionId: string;
          changes: Record<string, any>;
        };
        
        setTransactions(prev => 
          prev.map(transaction => 
            transaction.id === transactionId 
              ? { ...transaction, ...changes, updatedAt: new Date() }
              : transaction
          )
        );
      }
    }
  });

  return {
    transactions,
    setTransactions,
    todayStats,
    setTodayStats,
    subscribe
  };
};