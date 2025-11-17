class DatabaseService {
  constructor();
  
  // Basic methods
  getProducts(options?: { limit?: number; category?: string }): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }>;
  
  // Sync-related methods
  init(): Promise<void>;
  syncProductsFromServer(products: any[]): Promise<any>;
  getUnsyncedTransactions(): Promise<any>;
  getTransaction(id: string): Promise<any>;
  markTransactionAsSynced(id: string): Promise<void>;
  close(): void;
  
  // Add other methods as needed
}

export default DatabaseService;