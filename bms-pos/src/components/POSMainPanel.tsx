import React from 'react';
import SearchPanel from './SearchPanel';
import CartTable from './CartTable';
import InventoryOverview from './inventory/InventoryOverview';
import StockAdjustment from './inventory/StockAdjustment';

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

interface POSMainPanelProps {
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

const POSMainPanel: React.FC<POSMainPanelProps> = ({
  activeView,
  cart,
  onAddToCart,
  onUpdateCartItem,
  onUpdateCartDiscount,
  onRemoveFromCart,
  onClearCart,
  onStockAlert
}) => {
  // Render different views based on activeView
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

  // Default POS view
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

export default POSMainPanel;