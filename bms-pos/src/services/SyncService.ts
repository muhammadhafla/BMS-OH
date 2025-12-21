import { apiService } from './ApiService'
import { Logger } from '../utils/logger'

// PRODUCTION OFFLINE-FIRST MODE (Uncomment these lines for Electron/offline mode)
import DatabaseService from '../database/DatabaseService'

export interface SyncStatus {
  lastSync: Date | null;
  isOnline: boolean;
  isSyncing: boolean;
  pendingTransactions: number;
  pendingProducts: number;
  syncErrors: string[];
}

export interface SyncResult {
  success: boolean;
  productsSynced?: number;
  transactionsSynced?: number;
  errors?: string[];
  message?: string;
}

class SyncService {
  // PRODUCTION OFFLINE-FIRST MODE: Uncomment for Electron
  private dbService: DatabaseService
  
  private syncStatus: SyncStatus = {
    lastSync: null,
    isOnline: false,
    isSyncing: false,
    pendingTransactions: 0,
    pendingProducts: 0,
    syncErrors: [],
  }

  private syncInterval: NodeJS.Timeout | null = null
  private syncInProgress = false

  constructor() {
    // PRODUCTION OFFLINE-FIRST MODE: Uncomment for Electron
    this.dbService = new DatabaseService()
    void this.initializeDatabase()
    this.setupOnlineListener()
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // PRODUCTION OFFLINE-FIRST MODE: Uncomment for Electron
      await this.dbService.init()
      Logger.syncSuccess('SyncService initialized - Offline-first mode with SQLite')
    } catch (error) {
      Logger.syncError('Failed to initialize sync service:', error)
    }
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true
      void this.autoSync()
    })

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false
    })

    // Initial online status
    this.syncStatus.isOnline = navigator.onLine
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync(intervalMinutes: number = 5): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = setInterval(() => {
      void this.autoSync()
    }, intervalMinutes * 60 * 1000)

    Logger.syncStart(`Auto-sync started with ${intervalMinutes} minute interval`)
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      Logger.info('⏹️ Auto-sync stopped')
    }
  }

  /**
   * Automatic sync when online
   */
  private async autoSync(): Promise<void> {
    if (!this.syncStatus.isOnline || this.syncInProgress) {
      return
    }

    Logger.syncStart('Starting automatic sync...')
    await this.performFullSync()
  }

  /**
   * Perform full synchronization
   */
  async performFullSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        message: 'Sync already in progress',
      }
    }

    this.syncInProgress = true
    this.syncStatus.isSyncing = true
    this.syncStatus.syncErrors = []

    try {
      Logger.syncStart('Starting full synchronization...')

      // 1. Sync products from server to local (API mode - direct server)
      const productSyncResult = await this.syncProducts()
      
      // 2. Sync transactions from local to server (API mode - direct server)
      const transactionSyncResult = await this.syncTransactions()

      // 3. Update sync status
      this.syncStatus.lastSync = new Date()
      await this.updatePendingCounts()

      const result: SyncResult = {
        success: true,
        productsSynced: productSyncResult,
        transactionsSynced: transactionSyncResult,
        message: 'Full sync completed successfully',
      }

      Logger.syncSuccess('Full synchronization completed:', result)
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'
      this.syncStatus.syncErrors.push(errorMessage)
      
      Logger.syncError('Full synchronization failed:', error)
      
      return {
        success: false,
        errors: [errorMessage],
        message: 'Sync failed',
      }

    } finally {
      this.syncStatus.isSyncing = false
      this.syncInProgress = false
    }
  }

  /**
   * Sync products from server (API mode)
   */
  private async syncProducts(): Promise<number> {
    try {
      Logger.syncStart('Syncing products from server...')
      
      const response = await apiService.getProducts({ limit: 1000 })
      
      if (!response.success || !response.data?.products) {
        throw new Error(response.error ?? 'Failed to fetch products from server')
      }

      const {products} = response.data
      
      // PRODUCTION OFFLINE-FIRST MODE: For local storage, uncomment and replace below
      const syncResult = await this.dbService.syncProductsFromServer(products)
      
      if (syncResult.success) {
        Logger.syncSuccess(`Retrieved ${products.length} products from server and synced to local database`)
        return products.length
      } else {
        throw new Error(syncResult.error ?? 'Failed to sync products to local database')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Product sync failed'
      this.syncStatus.syncErrors.push(errorMessage)
      Logger.syncError('Product sync failed:', error)
      throw error
    }
  }

  /**
   * Sync transactions to server (API mode)
   */
  private async syncTransactions(): Promise<number> {
    try {
      Logger.syncStart('Syncing transactions to server...')
      
      // PRODUCTION OFFLINE-FIRST MODE: For local storage, uncomment and replace below
      // Get unsynced transactions from local database
      const unsyncedResult = await this.dbService.getUnsyncedTransactions()
      
      if (!unsyncedResult.success || !unsyncedResult.data) {
        throw new Error('Failed to get unsynced transactions')
      }

      const unsyncedTransactions = unsyncedResult.data
      let syncedCount = 0

      for (const transaction of unsyncedTransactions) {
        try {
          // PRODUCTION OFFLINE-FIRST MODE: Uncomment for local storage
          // Get transaction items
          const transactionResult = await this.dbService.getTransaction(transaction.id)
          
          if (!transactionResult.success || !transactionResult.data) {
            Logger.syncWarning(`Failed to get transaction ${transaction.id} items`)
            continue
          }

          const transactionData = transactionResult.data

          // Prepare transaction data for server
          const serverTransactionData = {
            items: transactionData.items.map((item: { product_id: string; quantity: number; unit_price: number; discount: number; total: number }) => ({
              productId: item.product_id,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              discount: item.discount,
              total: item.total,
            })),
            totalAmount: transaction.total_amount,
            discount: transaction.discount,
            finalAmount: transaction.final_amount,
            paymentMethod: transaction.payment_method,
            amountPaid: transaction.amount_paid,
            change: transaction.change,
            notes: `Synced from POS - ${transaction.transaction_code}`,
          }

          // Send to server
          const serverResponse = await apiService.createTransaction(serverTransactionData)
          
          if (serverResponse.success) {
            // Mark as synced in local database
            await this.dbService.markTransactionAsSynced(transaction.id)
            syncedCount++
            Logger.syncSuccess(`Synced transaction ${transaction.transaction_code}`)
          } else {
            Logger.syncError(`Failed to sync transaction ${transaction.transaction_code}:`, serverResponse.error)
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown transaction sync error'
          Logger.syncError(`Transaction ${transaction.id} sync failed:`, error)
          this.syncStatus.syncErrors.push(errorMessage)
        }
      }

      Logger.syncSuccess(`Synced ${syncedCount}/${unsyncedTransactions.length} transactions to server (API mode)`)
      return syncedCount

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transaction sync failed'
      this.syncStatus.syncErrors.push(errorMessage)
      Logger.syncError('Transaction sync failed:', error)
      throw error
    }
  }

  /**
   * Update pending counts
   */
  private async updatePendingCounts(): Promise<void> {
    try {
      // PRODUCTION OFFLINE-FIRST MODE: For local storage, uncomment below
      // Get pending transactions count
      const unsyncedResult = await this.dbService.getUnsyncedTransactions()
      this.syncStatus.pendingTransactions = unsyncedResult.success ? (unsyncedResult.data?.length ?? 0) : 0

      // Get pending products count (products that need to be synced from server)
      // This is a simplified approach - in reality, you might want to track this more precisely
      this.syncStatus.pendingProducts = 0

    } catch (error) {
      Logger.syncError('Failed to update pending counts:', error)
    }
  }

  /**
   * Manual sync trigger
   */
  async syncNow(): Promise<SyncResult> {
    Logger.syncStart('Manual sync triggered')
    return await this.performFullSync()
  }

  /**
   * Force sync products only
   */
  async syncProductsOnly(): Promise<number> {
    return await this.syncProducts()
  }

  /**
   * Force sync transactions only
   */
  async syncTransactionsOnly(): Promise<number> {
    return await this.syncTransactions()
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  /**
   * Check if system is ready for sync
   */
  isReadyForSync(): boolean {
    return this.syncStatus.isOnline && !this.syncInProgress
  }

  /**
   * Get connection status
   */
  async checkConnection(): Promise<boolean> {
    const isConnected = await apiService.checkHealth()
    this.syncStatus.isOnline = isConnected
    return isConnected
  }

  /**
   * Export data for backup
   */
  async exportData(): Promise<string> {
    try {
      // PRODUCTION OFFLINE-FIRST MODE: For local storage, uncomment below
      const productsResult = await this.dbService.getProducts()
      const transactionsResult = await this.dbService.getUnsyncedTransactions()

      const exportData = {
        products: productsResult.success ? productsResult.data : [],
        unsyncedTransactions: transactionsResult.success ? transactionsResult.data : [],
        exportedAt: new Date().toISOString(),
        version: '1.0',
      }

      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      Logger.syncError('Failed to export data:', error)
      throw error
    }
  }

  /**
   * Import data from backup
   */
  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData)
      
      if (data.products && Array.isArray(data.products)) {
        // PRODUCTION OFFLINE-FIRST MODE: For local storage, uncomment below
        await this.dbService.syncProductsFromServer(data.products)
        Logger.syncSuccess('Products imported and stored in local database')
      }

      // Note: Importing transactions would require more complex logic
      // to avoid duplicates and handle dependencies

      Logger.syncSuccess('Data imported successfully')
    } catch (error) {
      Logger.syncError('Failed to import data:', error)
      throw error
    }
  }

  /**
   * Clear all sync errors
   */
  clearSyncErrors(): void {
    this.syncStatus.syncErrors = []
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopAutoSync()
    // PRODUCTION OFFLINE-FIRST MODE: Uncomment for Electron
    if (this.dbService) {
      this.dbService.close()
    }
  }
}

export const syncService = new SyncService()