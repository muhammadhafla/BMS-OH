import React, { useState, useEffect } from 'react';
import { authService } from '../services/AuthService';
import { useToast } from '../hooks/useToast';
import { syncService, SyncStatus } from '../services/SyncService';
import { inventoryService } from '../services/InventoryService';
import { formatCurrency, generateTransactionCode } from '../lib/utils';

// Components
import POSHeader from './POSHeader';
import POSMainPanel from './POSMainPanel';
import POSSidePanel from './POSSidePanel';
import PaymentModal from './PaymentModal';
import Receipt from './Receipt';
import StockAlerts from './inventory/StockAlerts';
import SyncStatusHeader from './SyncStatusHeader';
import SyncNotifications from './SyncNotifications';
import SyncStatusModal from './SyncStatusModal';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  barcode?: string;
}

interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface Transaction {
  id: string;
  transactionCode: string;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  status: string;
  createdAt: string;
}

interface POSLayoutProps {
  user?: { username: string; id: string; role: string; lastLogin?: string };
  onLogout?: () => void;
}

const POSLayout: React.FC<POSLayoutProps> = ({ user: propUser }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [activeView, setActiveView] = useState<'pos' | 'inventory' | 'adjustment' | 'alerts'>('pos');
  const [showStockAlerts, setShowStockAlerts] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const [isInventoryDropdownOpen, setIsInventoryDropdownOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isSyncStatusModalOpen, setIsSyncStatusModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: null,
    isOnline: false,
    isSyncing: false,
    pendingTransactions: 0,
    pendingProducts: 0,
    syncErrors: []
  });
  const { showSuccess, showError, showWarning } = useToast();
  
  const currentUser = propUser || authService.getCurrentUser();
  
  const cashier = {
    name: currentUser?.username || 'Admin',
    id: currentUser?.id || '1',
    role: currentUser?.role || 'admin',
    lastLogin: currentUser?.lastLogin
  };
  
  const branch = {
    name: 'BMS Store',
    address: 'Jl. Example No. 123',
    phone: '(021) 1234567'
  };

  // Stock validation before adding to cart
  const validateStockAvailability = async (product: Product, requestedQuantity: number): Promise<{
    available: boolean;
    availableStock: number;
    error?: string;
  }> => {
    try {
      const result = await inventoryService.checkStockAvailability([
        { productId: product.id, quantity: requestedQuantity }
      ]);
      
      if (result.success && result.data && !result.data.available) {
        const issue = result.data.issues.find(i => i.productId === product.id);
        return {
          available: false,
          availableStock: issue?.available || 0,
          error: issue ? `Only ${issue.available} units available` : 'Insufficient stock'
        };
      }
      
      return {
        available: true,
        availableStock: requestedQuantity
      };
    } catch (error) {
      console.error('Error validating stock:', error);
      return {
        available: false,
        availableStock: 0,
        error: 'Error checking stock availability'
      };
    }
  };

  const addToCart = async (product: Product, quantity: number = 1) => {
    // Validate stock availability first
    const validation = await validateStockAvailability(product, quantity);
    
    if (!validation.available) {
      showError(validation.error || 'Insufficient stock');
      setShowStockAlerts(true);
      return;
    }
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);

      if (existingItem) {
        return prevCart.map(item =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                total: (item.quantity + quantity) * item.unitPrice
              }
            : item
        );
      } else {
        return [...prevCart, {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity,
          unitPrice: product.price,
          discount: 0,
          total: product.price * quantity
        }];
      }
    });
    
    showSuccess(`Added ${quantity} ${product.name} to cart`);
  };

  const updateCartItem = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.productId === productId
          ? {
              ...item,
              quantity,
              total: quantity * item.unitPrice
            }
          : item
      )
    );
  };

  const updateCartDiscount = (productId: string, discount: number) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.productId === productId
          ? {
              ...item,
              discount,
              total: (item.quantity * item.unitPrice) - discount
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalAmount = () => {
    return cart.reduce((_total, item) => item.total, 0);
  };

  // Real-time stock update during sales
  const updateInventoryForSale = async (cartItems: CartItem[], transactionId: string): Promise<boolean> => {
    if (!currentUser) {
      showError('User not authenticated');
      return false;
    }

    try {
      const stockUpdates = cartItems.map(item => ({
        productId: item.productId,
        quantity: -item.quantity, // Negative for sales (stock reduction)
        type: 'OUT' as const,
        notes: `Sale transaction ${transactionId}`,
        reference: `Sale-${transactionId}`
      }));

      const result = await inventoryService.bulkAdjustStock(stockUpdates);
      
      if (result.success && result.data) {
        const { successful, failed } = result.data.summary;
        if (failed === 0) {
          showSuccess(`Stock updated for ${successful} items`);
          return true;
        } else {
          showWarning(`Stock updated for ${successful}/${cartItems.length} items`);
          return true; // Partial success is still acceptable
        }
      } else {
        showError('Failed to update inventory');
        return false;
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      showError('Error updating inventory');
      return false;
    }
  };

  const handlePayment = async (paymentData: {
    paymentMethod: string;
    amountPaid: number;
    discount: number;
  }) => {
    if (!window.webAPI) {
      showError('Web API not available');
      return;
    }

    const totalAmount = getTotalAmount();
    const finalAmount = totalAmount - paymentData.discount;
    const change = paymentData.amountPaid - finalAmount;
    const transactionId = Date.now().toString();

    const transactionData = {
      id: transactionId,
      transactionCode: generateTransactionCode(),
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: item.total
      })),
      totalAmount,
      discount: paymentData.discount,
      finalAmount,
      paymentMethod: paymentData.paymentMethod,
      amountPaid: paymentData.amountPaid,
      change
    };

    try {
      // First, update inventory for the sale
      const inventoryUpdated = await updateInventoryForSale(cart, transactionId);
      
      if (!inventoryUpdated) {
        showError('Cannot complete sale due to inventory update failure');
        return;
      }

      // Then create the transaction
      const result = await window.webAPI.createTransaction(transactionData);

      if (result.success) {
        const transaction: Transaction = {
          ...transactionData,
          status: 'COMPLETED',
          createdAt: new Date().toISOString()
        };

        setCurrentTransaction(transaction);
        setIsPaymentModalOpen(false);
        clearCart();
        
        // Show success notification
        showSuccess('Sale completed and inventory updated');
        
        // Refresh ProductSearch to show updated stock levels
        window.location.reload(); // Simple refresh for demo
      } else {
        // Rollback inventory if transaction failed
        try {
          const rollbackUpdates = cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity, // Positive for rollback
            type: 'ADJUSTMENT' as const,
            notes: `Transaction rollback ${transactionId}`,
            reference: `Rollback-${transactionId}`
          }));
          
          if (currentUser) {
            const rollbackResult = await inventoryService.bulkAdjustStock(rollbackUpdates);
            if (!rollbackResult.success) {
              console.error('Rollback failed:', rollbackResult.error);
            }
          }
          showWarning('Sale cancelled - inventory rolled back');
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
          showError('Sale failed and rollback incomplete - manual correction required');
        }
        
        alert('Failed to create transaction: ' + result.error);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    }
  };

  const printReceipt = async () => {
    if (!currentTransaction || !window.webAPI) return;

    try {
      const receiptData = {
        transaction: currentTransaction,
        items: cart,
        cashier,
        branch
      };

      await window.webAPI.printReceipt(receiptData);
    } catch (error) {
      console.error('Print error:', error);
      alert('Failed to print receipt');
    }
  };

  const handleLogout = () => {
    // This will be handled by the parent component
    window.dispatchEvent(new CustomEvent('pos-logout'));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts if not typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'F2':
          event.preventDefault();
          setIsPaymentModalOpen(true);
          break;
        case 'F3':
          event.preventDefault();
          clearCart();
          break;
        case 'F4':
          event.preventDefault();
          setActiveView(activeView === 'pos' ? 'inventory' : 'pos');
          break;
        case 'F5':
          event.preventDefault();
          window.location.reload();
          break;
        case 'F11':
          event.preventDefault();
          handleLogout();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeView]);

  // Connection status monitoring and sync setup
  useEffect(() => {
    const checkConnection = () => {
      setConnectionStatus(navigator.onLine ? 'online' : 'offline');
    };

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    
    checkConnection(); // Initial check

    // Start sync service
    syncService.startAutoSync(5); // 5 minute intervals
    const updateSyncStatus = () => {
      setSyncStatus(syncService.getSyncStatus());
    };

    // Update sync status every 30 seconds
    const statusInterval = setInterval(updateSyncStatus, 30000);

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
      clearInterval(statusInterval);
      syncService.stopAutoSync();
    };
  }, []);

  const handleSync = async () => {
    showSuccess('Starting synchronization...');
    try {
      const result = await syncService.syncNow();
      if (result.success) {
        showSuccess(result.message || 'Sync completed successfully');
        setSyncStatus(syncService.getSyncStatus());
      } else {
        showError('Sync failed: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      showError('Sync failed: ' + (error as Error).message);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header Section */}
      <POSHeader
        cashier={cashier}
        branch={branch}
        onLogout={handleLogout}
        activeView={activeView}
        onViewChange={setActiveView}
        showStockAlerts={showStockAlerts}
        connectionStatus={connectionStatus}
        isInventoryDropdownOpen={isInventoryDropdownOpen}
        setIsInventoryDropdownOpen={setIsInventoryDropdownOpen}
        setIsAlertsModalOpen={setIsAlertsModalOpen}
        syncStatus={syncStatus}
        onSync={handleSync}
      />

      {/* Sync Status Header */}
      <SyncStatusHeader
        syncStatus={syncStatus}
        onSync={handleSync}
        onViewDetails={() => setIsSyncStatusModalOpen(true)}
        compact={true}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Panel - Search + Transaction Table */}
        <POSMainPanel
          activeView={activeView}
          cart={cart}
          onAddToCart={addToCart}
          onUpdateCartItem={updateCartItem}
          onUpdateCartDiscount={updateCartDiscount}
          onRemoveFromCart={removeFromCart}
          onClearCart={clearCart}
          onStockAlert={() => setShowStockAlerts(true)}
          onPayment={() => setIsPaymentModalOpen(true)}
        />

        {/* Side Panel - Payment Summary (380px fixed width) - Only show on POS page */}
        {activeView === 'pos' && (
          <POSSidePanel
            cart={cart}
            onPayment={() => setIsPaymentModalOpen(true)}
            onClearCart={clearCart}
            totalAmount={getTotalAmount()}
            onPaymentSubmit={handlePayment}
          />
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        totalAmount={getTotalAmount()}
        onPayment={handlePayment}
      />

      {/* Receipt Modal */}
      {currentTransaction && (
        <Receipt
          transaction={currentTransaction}
          items={cart}
          cashier={cashier}
          branch={branch}
          onPrint={printReceipt}
          onClose={() => setCurrentTransaction(null)}
        />
      )}

      {/* Alerts Modal */}
      {isAlertsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="h-6 w-6 mr-2 text-orange-500" />
                Stock Alerts
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAlertsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <StockAlerts
                onRestock={(productId, quantity) => {
                  console.log('Restock:', productId, quantity);
                  setShowStockAlerts(false);
                  setIsAlertsModalOpen(false);
                }}
                onViewDetails={(productId) => {
                  console.log('View details:', productId);
                  setIsAlertsModalOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-500 bg-white p-2 rounded shadow opacity-60 hover:opacity-100 transition-opacity">
        F2: Pay | F3: Clear | F4: Switch View | F5: Refresh | F11: Logout
      </div>

      {/* Sync Notifications */}
      <SyncNotifications
        syncStatus={syncStatus}
        onSync={handleSync}
      />

      {/* Sync Status Modal */}
      <SyncStatusModal
        isOpen={isSyncStatusModalOpen}
        onClose={() => setIsSyncStatusModalOpen(false)}
        syncStatus={syncStatus}
        onSync={handleSync}
      />
    </div>
  );
};

export default POSLayout;