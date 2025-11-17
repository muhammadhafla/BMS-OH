import React, { useState, useEffect } from 'react';
import { formatCurrency, generateTransactionCode } from '../lib/utils';
import { inventoryService } from '../services/InventoryService';
import { authService } from '../services/AuthService';
import { useToast } from '../hooks/useToast';
import { syncService } from '../services/SyncService';

// Components
import SearchPanel from './SearchPanel';
import CartTable from './CartTable';
import PaymentModal from './PaymentModal';
import Receipt from './Receipt';
import StockAlerts from './inventory/StockAlerts';
import InventoryOverview from './inventory/InventoryOverview';
import StockAdjustment from './inventory/StockAdjustment';

import { Button } from './ui/button';
import {
  User,
  LogOut,
  Package,
  AlertTriangle,
  Settings,
  Wifi,
  Clock,
  Store,
  CreditCard,
  Scan,
  ChevronDown,
  Bell,
  RefreshCw,
  CloudOff,
  Database
} from 'lucide-react';

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

interface HeaderSectionProps {
  cashier: { name: string; id: string; role: string; lastLogin?: string };
  branch: { name: string; address: string; phone: string };
  onLogout: () => void;
  activeView: 'pos' | 'inventory' | 'adjustment' | 'alerts';
  onViewChange: (view: 'pos' | 'inventory' | 'adjustment' | 'alerts') => void;
  showStockAlerts: boolean;
  connectionStatus: 'online' | 'offline';
  isInventoryDropdownOpen: boolean;
  setIsInventoryDropdownOpen: (open: boolean) => void;
  setIsAlertsModalOpen: (open: boolean) => void;
  syncStatus: any;
  onSync: () => void;
}

const HeaderSection: React.FC<HeaderSectionProps> = ({
  cashier,
  branch,
  onLogout,
  activeView,
  onViewChange,
  showStockAlerts,
  connectionStatus,
  isInventoryDropdownOpen,
  setIsInventoryDropdownOpen,
  setIsAlertsModalOpen,
  syncStatus,
  onSync
}) => {
  return (
    <div className="bg-white border-b shadow-sm">
      {/* Top Bar */}
      <div className="px-6 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-center">
          {/* Left - Branding & Store Info */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">BMS POS</h1>
                <p className="text-sm text-gray-600">{branch.name}</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>{branch.address}</p>
              <p>{branch.phone}</p>
            </div>
          </div>

          {/* Right - System Controls */}
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {connectionStatus === 'online' ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <CloudOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm text-gray-600">
                {connectionStatus === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Sync Status */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSync}
                disabled={syncStatus.isSyncing}
                className="text-xs"
              >
                {syncStatus.isSyncing ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : syncStatus.isOnline ? (
                  <Database className="h-3 w-3" />
                ) : (
                  <CloudOff className="h-3 w-3 text-red-500" />
                )}
                {syncStatus.pendingTransactions > 0 && (
                  <span className="ml-1 text-xs bg-orange-100 text-orange-800 px-1 rounded">
                    {syncStatus.pendingTransactions}
                  </span>
                )}
              </Button>
            </div>

            {/* Alerts Icon */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAlertsModalOpen(true)}
              className="relative text-gray-600 hover:text-gray-900"
            >
              <Bell className="h-4 w-4" />
              {showStockAlerts && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </Button>

            {/* Time Display */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{new Date().toLocaleString('id-ID')}</span>
            </div>

            {/* Cashier Info */}
            <div className="flex items-center space-x-2 text-sm">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-900">{cashier.name}</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {cashier.role}
              </span>
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 py-3">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <Button
            variant={activeView === 'pos' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('pos')}
            className="text-sm font-medium"
          >
            <Scan className="h-4 w-4 mr-2" />
            POS
          </Button>

          {/* Inventory Dropdown */}
          <div className="relative">
            <Button
              variant={activeView === 'inventory' || activeView === 'adjustment' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setIsInventoryDropdownOpen(!isInventoryDropdownOpen)}
              className="text-sm font-medium"
            >
              <Package className="h-4 w-4 mr-2" />
              Inventory
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>

            {/* Dropdown Menu */}
            {isInventoryDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <Button
                  variant={activeView === 'inventory' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    onViewChange('inventory');
                    setIsInventoryDropdownOpen(false);
                  }}
                  className="w-full justify-start text-sm font-normal rounded-none border-0"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Overview
                </Button>
                <Button
                  variant={activeView === 'adjustment' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    onViewChange('adjustment');
                    setIsInventoryDropdownOpen(false);
                  }}
                  className="w-full justify-start text-sm font-normal rounded-none border-0"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Adjust Stock
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay for dropdown */}
      {isInventoryDropdownOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsInventoryDropdownOpen(false)}
        />
      )}
    </div>
  );
};

interface MainPanelProps {
  activeView: 'pos' | 'inventory' | 'adjustment' | 'alerts';
  cart: CartItem[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onUpdateCartItem: (productId: string, quantity: number) => void;
  onUpdateCartDiscount: (productId: string, discount: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onStockAlert: () => void;
  onPayment: () => void;
}

const MainPanel: React.FC<MainPanelProps> = ({
  activeView,
  cart,
  onAddToCart,
  onUpdateCartItem,
  onUpdateCartDiscount,
  onRemoveFromCart,
  onClearCart,
  onStockAlert
}) => {
  if (activeView === 'inventory') {
    return (
      <div className="h-full bg-white">
        <InventoryOverview
          onProductSelect={(productId) => console.log('Selected:', productId)}
          onProductEdit={(productId) => console.log('Edit:', productId)}
        />
      </div>
    );
  }

  if (activeView === 'adjustment') {
    return (
      <div className="h-full bg-white">
        <StockAdjustment
          onSuccess={(adjustment) => {
            console.log('Stock adjusted:', adjustment);
            onStockAlert();
          }}
          onClose={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6">
      {/* Product Search Section */}
      <div className="flex-shrink-0 h-48 mb-4">
        <SearchPanel
          onAddToCart={onAddToCart}
          onStockAlert={onStockAlert}
        />
      </div>

      {/* Cart Table Section */}
      <div className="flex-1 min-h-0">
        <CartTable
          items={cart}
          onUpdateQuantity={onUpdateCartItem}
          onUpdateDiscount={onUpdateCartDiscount}
          onRemoveItem={onRemoveFromCart}
          onClearAll={onClearCart}
        />
      </div>
    </div>
  );
};

interface SidePanelProps {
  cart: CartItem[];
  onPayment: () => void;
  onClearCart: () => void;
  totalAmount: number;
  onPaymentSubmit: (paymentData: {
    paymentMethod: string;
    amountPaid: number;
    discount: number;
  }) => void;
}

const SidePanel: React.FC<SidePanelProps> = ({
  cart,
  onPayment,
  onClearCart,
  totalAmount
}) => {
  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalDiscount = () => {
    return cart.reduce((total, item) => total + item.discount, 0);
  };

  return (
    <div className="w-[380px] bg-white border-l shadow-lg flex flex-col">
      {/* Payment Summary */}
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
          Payment Summary
        </h3>
        
        {/* Summary Cards */}
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Items</div>
            <div className="text-xl font-bold text-gray-900">{getTotalItems()}</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Subtotal</div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(totalAmount)}
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Discount</div>
            <div className="text-xl font-bold text-red-600">
              -{formatCurrency(getTotalDiscount())}
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-4">
            <div className="text-sm opacity-90">Total</div>
            <div className="text-2xl font-bold">
              {formatCurrency(totalAmount - getTotalDiscount())}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 space-y-4">
        <Button
          onClick={onPayment}
          disabled={cart.length === 0}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
          size="lg"
        >
          <CreditCard className="h-5 w-5 mr-2" />
          Pay Now
        </Button>
        
        <Button
          variant="outline"
          onClick={onClearCart}
          disabled={cart.length === 0}
          className="w-full border-red-300 text-red-600 hover:bg-red-50 py-3"
          size="lg"
        >
          Clear All Items
        </Button>
      </div>

      {/* Quick Payment Options */}
      <div className="px-6 pb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={cart.length === 0}
          >
            Cash
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={cart.length === 0}
          >
            Card
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={cart.length === 0}
          >
            QRIS
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={cart.length === 0}
          >
            Split
          </Button>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-auto p-6 border-t bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          <p className="mb-1">System Status: Ready</p>
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
};

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
  const [syncStatus, setSyncStatus] = useState<any>({
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
      const availability = await inventoryService.checkStockAvailability([
        { productId: product.id, quantity: requestedQuantity }
      ]);
      
      if (!availability.available) {
        const issue = availability.issues.find(i => i.productId === product.id);
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
        type: 'sale' as const,
        reason: `Sale transaction ${transactionId}`,
        notes: `Sold ${item.quantity} units`
      }));

      const result = await inventoryService.batchUpdateStock(stockUpdates, currentUser.id, transactionId);
      
      if (result.success) {
        const successCount = result.results.filter(r => r.success).length;
        if (successCount === cartItems.length) {
          showSuccess(`Stock updated for ${successCount} items`);
          return true;
        } else {
          showWarning(`Stock updated for ${successCount}/${cartItems.length} items`);
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
    if (!window.electronAPI) {
      showError('Electron API not available');
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
      const result = await window.electronAPI.createTransaction(transactionData);

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
            type: 'adjustment' as const,
            reason: `Transaction rollback ${transactionId}`,
            notes: `Rolled back ${item.quantity} units`
          }));
          
          if (currentUser) {
            await inventoryService.batchUpdateStock(rollbackUpdates, currentUser.id, transactionId);
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
    if (!currentTransaction || !window.electronAPI) return;

    try {
      const receiptData = {
        transaction: currentTransaction,
        items: cart,
        cashier,
        branch
      };

      await window.electronAPI.printReceipt(receiptData);
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
      <HeaderSection
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

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Panel - Search + Transaction Table */}
        <MainPanel
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
          <SidePanel
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

      {/* Keyboard Shortcuts Help (can be shown/hidden) */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-500 bg-white p-2 rounded shadow opacity-60 hover:opacity-100 transition-opacity">
        F2: Pay | F3: Clear | F4: Switch View | F5: Refresh | F11: Logout
      </div>
    </div>
  );
};

export default POSLayout;