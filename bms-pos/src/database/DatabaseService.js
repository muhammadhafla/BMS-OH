/**
 * Database Service for PWA
 * Browser-compatible database service using IndexedDB for offline storage
 */

export const Product = {
  id: '',
  sku: '',
  name: '',
  price: 0,
  cost: 0,
  stock: 0,
  unit: '',
  barcode: '',
  is_active: true,
  last_sync: '',
}

export const Transaction = {
  id: '',
  transaction_code: '',
  total_amount: 0,
  discount: 0,
  final_amount: 0,
  payment_method: '',
  amount_paid: 0,
  change: 0,
  status: '',
  created_at: '',
  synced: false,
}

export const TransactionItem = {
  id: '',
  transaction_id: '',
  product_id: '',
  quantity: 0,
  unit_price: 0,
  discount: 0,
  total: 0,
}

export const SyncLog = {
  id: '',
  table_name: '',
  record_id: '',
  operation: '',
  timestamp: '',
  synced: false,
}

class DatabaseService {
  constructor() {
    this.db = null
    this.dbName = 'BMSPOSDatabase'
    this.dbVersion = 1
  }

  async init() {
    try {
      this.db = await this.openDatabase()
      await this.createTables()
      console.log('✅ IndexedDB database initialized')
    } catch (error) {
      console.error('❌ Database initialization failed:', error)
      throw error
    }
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        reject(new Error('Failed to open database'))
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        // Create object stores (tables)
        if (!db.objectStoreNames.contains('products')) {
          const productsStore = db.createObjectStore('products', { keyPath: 'id' })
          productsStore.createIndex('sku', 'sku', { unique: true })
          productsStore.createIndex('name', 'name', { unique: false })
          productsStore.createIndex('barcode', 'barcode', { unique: false })
        }

        if (!db.objectStoreNames.contains('transactions')) {
          const transactionsStore = db.createObjectStore('transactions', { keyPath: 'id' })
          transactionsStore.createIndex('transaction_code', 'transaction_code', { unique: true })
          transactionsStore.createIndex('created_at', 'created_at', { unique: false })
          transactionsStore.createIndex('synced', 'synced', { unique: false })
        }

        if (!db.objectStoreNames.contains('transaction_items')) {
          const itemsStore = db.createObjectStore('transaction_items', { keyPath: 'id' })
          itemsStore.createIndex('transaction_id', 'transaction_id', { unique: false })
        }

        if (!db.objectStoreNames.contains('sync_log')) {
          const syncStore = db.createObjectStore('sync_log', { keyPath: 'id' })
          syncStore.createIndex('table_name', 'table_name', { unique: false })
          syncStore.createIndex('synced', 'synced', { unique: false })
        }
      }
    })
  }

  async createTables() {
    // Tables are created in the onupgradeneeded handler
    // This method is kept for compatibility with the original API
  }

  // Product operations
  async getProducts(options = {}) {
    try {
      if (!this.db) throw new Error('Database not initialized')

      const { search = '', limit = 100, offset = 0 } = options
      const transaction = this.db.transaction(['products'], 'readonly')
      const store = transaction.objectStore('products')
      
      let products = []

      if (search) {
        // Search by name, sku, or barcode
        const searchTerm = search.toLowerCase()
        const request = store.getAll()
        
        const result = await this.promisifyRequest(request)
        products = result.filter(product => 
          product.name.toLowerCase().includes(searchTerm) ||
          product.sku.toLowerCase().includes(searchTerm) ||
          (product.barcode && product.barcode.toLowerCase().includes(searchTerm)),
        )
      } else {
        const request = store.getAll()
        products = await this.promisifyRequest(request)
      }

      // Filter active products and apply pagination
      const activeProducts = products.filter(product => product.is_active)
      const paginatedProducts = activeProducts.slice(offset, offset + limit)

      return { success: true, data: paginatedProducts }
    } catch (error) {
      console.error('Error getting products:', error)
      return { success: false, error: error.message }
    }
  }

  async searchProduct(searchTerm) {
    try {
      if (!this.db) throw new Error('Database not initialized')

      const transaction = this.db.transaction(['products'], 'readonly')
      const store = transaction.objectStore('products')
      const request = store.getAll()
      
      const products = await this.promisifyRequest(request)
      const searchLower = searchTerm.toLowerCase()
      
      const product = products.find(p => 
        p.is_active && (
          p.name.toLowerCase().includes(searchLower) ||
          p.sku.toLowerCase().includes(searchLower) ||
          (p.barcode && p.barcode.toLowerCase().includes(searchLower))
        ),
      )

      if (product) {
        return { success: true, data: product }
      } else {
        return { success: false, error: 'Product not found' }
      }
    } catch (error) {
      console.error('Error searching product:', error)
      return { success: false, error: error.message }
    }
  }

  async getProductById(id) {
    try {
      if (!this.db) throw new Error('Database not initialized')

      const transaction = this.db.transaction(['products'], 'readonly')
      const store = transaction.objectStore('products')
      const request = store.get(id)
      
      const product = await this.promisifyRequest(request)

      if (product) {
        return { success: true, data: product }
      } else {
        return { success: false, error: 'Product not found' }
      }
    } catch (error) {
      console.error('Error getting product by ID:', error)
      return { success: false, error: error.message }
    }
  }

  // Transaction operations
  async createTransaction(transactionData) {
    try {
      if (!this.db) throw new Error('Database not initialized')

      const { 
        id, 
        transactionCode, 
        items, 
        totalAmount, 
        discount, 
        finalAmount, 
        paymentMethod, 
        amountPaid, 
        change, 
      } = transactionData
      
      const transaction = this.db.transaction(['transactions', 'transaction_items'], 'readwrite')
      
      // Insert transaction
      const transactionStore = transaction.objectStore('transactions')
      const transactionRecord = {
        id,
        transaction_code: transactionCode,
        total_amount: totalAmount,
        discount,
        final_amount: finalAmount,
        payment_method: paymentMethod,
        amount_paid: amountPaid,
        change,
        status: 'COMPLETED',
        created_at: new Date().toISOString(),
        synced: false,
      }
      
      await this.promisifyRequest(transactionStore.add(transactionRecord))

      // Insert transaction items
      const itemsStore = transaction.objectStore('transaction_items')
      for (const item of items) {
        const itemRecord = {
          id: `${id}_${item.productId}`,
          transaction_id: id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: item.discount,
          total: item.total,
        }
        
        await this.promisifyRequest(itemsStore.add(itemRecord))
      }

      return { success: true, data: { id, transactionCode } }
    } catch (error) {
      console.error('Error creating transaction:', error)
      return { success: false, error: error.message }
    }
  }

  async getTransaction(transactionId) {
    try {
      if (!this.db) throw new Error('Database not initialized')

      // Get transaction
      const transaction = this.db.transaction(['transactions', 'transaction_items'], 'readonly')
      const transactionStore = transaction.objectStore('transactions')
      const transactionRequest = transactionStore.get(transactionId)
      
      const transactionRecord = await this.promisifyRequest(transactionRequest)
      
      if (!transactionRecord) {
        return { success: false, error: 'Transaction not found' }
      }

      // Get transaction items
      const itemsStore = transaction.objectStore('transaction_items')
      const index = itemsStore.index('transaction_id')
      const itemsRequest = index.getAll(transactionId)
      const items = await this.promisifyRequest(itemsRequest)

      return { 
        success: true, 
        data: { 
          ...transactionRecord,
          items, 
        }, 
      }
    } catch (error) {
      console.error('Error getting transaction:', error)
      return { success: false, error: error.message }
    }
  }

  // Sync operations
  async syncProductsFromServer(products) {
    try {
      if (!this.db) throw new Error('Database not initialized')

      const transaction = this.db.transaction(['products'], 'readwrite')
      const store = transaction.objectStore('products')

      for (const product of products) {
        const updatedProduct = {
          ...product,
          last_sync: new Date().toISOString(),
        }
        await this.promisifyRequest(store.put(updatedProduct))
      }

      console.log(`✅ Synced ${products.length} products from server`)
      return { success: true }
    } catch (error) {
      console.error('Error syncing products:', error)
      return { success: false, error: error.message }
    }
  }

  async getUnsyncedTransactions() {
    try {
      if (!this.db) throw new Error('Database not initialized')

      const transaction = this.db.transaction(['transactions'], 'readonly')
      const store = transaction.objectStore('transactions')
      const index = store.index('synced')
      const request = index.getAll(IDBKeyRange.only(false)) // Get all unsynced transactions
      
      const transactions = await this.promisifyRequest(request)
      
      return { success: true, data: transactions }
    } catch (error) {
      console.error('Error getting unsynced transactions:', error)
      return { success: false, error: error.message }
    }
  }

  async markTransactionAsSynced(transactionId) {
    try {
      if (!this.db) throw new Error('Database not initialized')

      const transaction = this.db.transaction(['transactions'], 'readwrite')
      const store = transaction.objectStore('transactions')
      
      const getRequest = store.get(transactionId)
      const record = await this.promisifyRequest(getRequest)
      
      if (record) {
        record.synced = true
        await this.promisifyRequest(store.put(record))
        return { success: true }
      }
      
      return { success: false }
    } catch (error) {
      console.error('Error marking transaction as synced:', error)
      return { success: false }
    }
  }

  // Utility method to promisify IDB requests
  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
      console.log('✅ Database connection closed')
    }
  }

  // Clear all data (useful for testing or reset)
  async clearAllData() {
    if (!this.db) throw new Error('Database not initialized')

    const storeNames = ['products', 'transactions', 'transaction_items', 'sync_log']
    const transaction = this.db.transaction(storeNames, 'readwrite')

    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName)
      await this.promisifyRequest(store.clear())
    }
  }
}

export const databaseService = new DatabaseService()
export default databaseService