/**
 * Web API Service for PWA
 * Replaces Electron IPC calls with web-compatible implementations
 */

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  barcode?: string;
}

interface Transaction {
  id: string;
  items: any[];
  total: number;
  paymentMethod: string;
  timestamp: Date;
}

class WebAPIService {
  private baseUrl: string = 'http://localhost:3001/api'; // BMS API base URL
  private isOnline: boolean = navigator.onLine;

  constructor() {
    // Monitor online/offline status
    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
  }

  // Platform and version info
  getPlatformInfo() {
    return {
      platform: navigator.platform,
      versions: {
        node: process.versions?.node || 'N/A',
        chrome: navigator.userAgent.split('Chrome/')[1]?.split(' ')[0] || 'N/A',
      }
    };
  }

  // Product operations
  async getProducts(args?: { limit?: number; search?: string }) {
    try {
      if (!this.isOnline) {
        return this.getOfflineProducts(args);
      }

      const params = new URLSearchParams();
      if (args?.limit) params.append('limit', args.limit.toString());
      if (args?.search) params.append('search', args.search);

      const response = await fetch(`${this.baseUrl}/products?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data: data.products || data };
    } catch (error) {
      console.error('Error fetching products:', error);
      return this.getOfflineProducts(args);
    }
  }

  async searchProduct(searchTerm: string) {
    try {
      if (!this.isOnline) {
        return this.searchOfflineProducts(searchTerm);
      }

      const response = await fetch(`${this.baseUrl}/products/search?q=${encodeURIComponent(searchTerm)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data: data.products || data };
    } catch (error) {
      console.error('Error searching product:', error);
      return this.searchOfflineProducts(searchTerm);
    }
  }

  // Transaction operations
  async createTransaction(transactionData: any) {
    try {
      if (!this.isOnline) {
        return this.saveOfflineTransaction(transactionData);
      }

      const response = await fetch(`${this.baseUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return this.saveOfflineTransaction(transactionData);
    }
  }

  async getTransaction(transactionId: string) {
    try {
      if (!this.isOnline) {
        return this.getOfflineTransaction(transactionId);
      }

      const response = await fetch(`${this.baseUrl}/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error getting transaction:', error);
      return this.getOfflineTransaction(transactionId);
    }
  }

  // Printing operations (Web-based)
  async printReceipt(receiptData: any) {
    try {
      // Create a print-friendly window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for printing.');
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${receiptData.storeName || 'BMS POS'}</h2>
            <p>Date: ${new Date().toLocaleDateString()}</p>
            <p>Time: ${new Date().toLocaleTimeString()}</p>
          </div>
          
          ${receiptData.items?.map((item: any) => `
            <div class="item">
              <span>${item.name} x${item.quantity}</span>
              <span>$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('') || ''}
          
          <div class="total">
            <div class="item">
              <span>Subtotal:</span>
              <span>$${receiptData.subtotal?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="item">
              <span>Tax:</span>
              <span>$${receiptData.tax?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="item">
              <span>Total:</span>
              <span>$${receiptData.total?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <p>Thank you for your business!</p>
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      
      // Trigger print after content is loaded
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };

      return { success: true };
    } catch (error) {
      console.error('Error printing receipt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  async getPrinters() {
    try {
      // Web browsers don't have direct printer access for security reasons
      // We'll return a list of common printers as fallbacks
      return {
        success: true,
        data: [
          { name: 'Default Printer', isDefault: true },
          { name: 'PDF Printer', isDefault: false }
        ]
      };
    } catch (error) {
      console.error('Error getting printers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  // Offline storage methods using localStorage
  private getOfflineProducts(args?: { limit?: number; search?: string }) {
    try {
      const products = JSON.parse(localStorage.getItem('offline_products') || '[]');
      let filtered = products;

      if (args?.search) {
        const searchLower = args.search.toLowerCase();
        filtered = products.filter((p: Product) => 
          p.name.toLowerCase().includes(searchLower) ||
          p.barcode?.toLowerCase().includes(searchLower)
        );
      }

      if (args?.limit) {
        filtered = filtered.slice(0, args.limit);
      }

      return { success: true, data: filtered };
    } catch (error) {
      return { success: false, error: 'Failed to load offline products' };
    }
  }

  private searchOfflineProducts(searchTerm: string) {
    return this.getOfflineProducts({ search: searchTerm });
  }

  private saveOfflineTransaction(transactionData: any) {
    try {
      const transactions = JSON.parse(localStorage.getItem('offline_transactions') || '[]');
      const transaction = {
        ...transactionData,
        id: Date.now().toString(),
        offline: true,
        timestamp: new Date().toISOString()
      };
      transactions.push(transaction);
      localStorage.setItem('offline_transactions', JSON.stringify(transactions));
      
      return { success: true, data: transaction, offline: true };
    } catch (error) {
      return { success: false, error: 'Failed to save offline transaction' };
    }
  }

  private getOfflineTransaction(transactionId: string) {
    try {
      const transactions = JSON.parse(localStorage.getItem('offline_transactions') || '[]');
      const transaction = transactions.find((t: any) => t.id === transactionId);
      
      if (transaction) {
        return { success: true, data: transaction };
      } else {
        return { success: false, error: 'Transaction not found' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to load offline transaction' };
    }
  }
}

// Create and export singleton instance
const webAPIService = new WebAPIService();

// Expose to window for compatibility
if (typeof window !== 'undefined') {
  window.webAPI = {
    getProducts: (args) => webAPIService.getProducts(args),
    searchProduct: (searchTerm) => webAPIService.searchProduct(searchTerm),
    createTransaction: (transactionData) => webAPIService.createTransaction(transactionData),
    getTransaction: (transactionId) => webAPIService.getTransaction(transactionId),
    printReceipt: (receiptData) => webAPIService.printReceipt(receiptData),
    getPrinters: () => webAPIService.getPrinters(),
    ...webAPIService.getPlatformInfo()
  };
}

export default webAPIService;