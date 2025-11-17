const Database = require('better-sqlite3');
const path = require('path');

class DatabaseService {
  constructor() {
    this.db = null;
  }

  async init() {
    try {
      const dbPath = path.join(__dirname, '../../pos.db');
      this.db = new Database(dbPath);
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Create tables if they don't exist
      await this.createTables();
      
      console.log('✅ SQLite database initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async createTables() {
    const tables = {
      // Cache of products from main server
      products: `
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          sku TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          cost REAL NOT NULL,
          stock INTEGER DEFAULT 0,
          unit TEXT DEFAULT 'pcs',
          barcode TEXT,
          is_active BOOLEAN DEFAULT 1,
          last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `,
      
      // Local transactions
      transactions: `
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          transaction_code TEXT UNIQUE NOT NULL,
          total_amount REAL NOT NULL,
          discount REAL DEFAULT 0,
          final_amount REAL NOT NULL,
          payment_method TEXT NOT NULL,
          amount_paid REAL NOT NULL,
          change REAL NOT NULL,
          status TEXT DEFAULT 'COMPLETED',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          synced BOOLEAN DEFAULT 0
        )
      `,
      
      transaction_items: `
        CREATE TABLE IF NOT EXISTS transaction_items (
          id TEXT PRIMARY KEY,
          transaction_id TEXT NOT NULL,
          product_id TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          discount REAL DEFAULT 0,
          total REAL NOT NULL,
          FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE
        )
      `,
      
      // Sync log
      sync_log: `
        CREATE TABLE IF NOT EXISTS sync_log (
          id TEXT PRIMARY KEY,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          synced BOOLEAN DEFAULT 0
        )
      `
    };

    for (const [tableName, sql] of Object.entries(tables)) {
      this.db.exec(sql);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)',
      'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_code ON transactions(transaction_code)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at)',
    ];

    for (const index of indexes) {
      this.db.exec(index);
    }
  }

  // Product operations
  async getProducts({ search = '', limit = 100, offset = 0 } = {}) {
    try {
      let query = 'SELECT * FROM products WHERE is_active = 1';
      const params = [];

      if (search) {
        query += ' AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY name LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = this.db.prepare(query);
      const products = stmt.all(...params);

      return { success: true, data: products };
    } catch (error) {
      console.error('Error getting products:', error);
      return { success: false, error: error.message };
    }
  }

  async searchProduct(searchTerm) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM products 
        WHERE is_active = 1 
        AND (name LIKE ? OR sku LIKE ? OR barcode = ?)
        LIMIT 1
      `);
      
      const product = stmt.get(`%${searchTerm}%`, `%${searchTerm}%`, searchTerm);
      
      if (product) {
        return { success: true, data: product };
      } else {
        return { success: false, error: 'Product not found' };
      }
    } catch (error) {
      console.error('Error searching product:', error);
      return { success: false, error: error.message };
    }
  }

  async getProductById(id) {
    try {
      const stmt = this.db.prepare('SELECT * FROM products WHERE id = ?');
      const product = stmt.get(id);
      
      if (product) {
        return { success: true, data: product };
      } else {
        return { success: false, error: 'Product not found' };
      }
    } catch (error) {
      console.error('Error getting product by ID:', error);
      return { success: false, error: error.message };
    }
  }

  // Transaction operations
  async createTransaction(transactionData) {
    try {
      const { id, transactionCode, items, totalAmount, discount, finalAmount, paymentMethod, amountPaid, change } = transactionData;
      
      this.db.transaction(() => {
        // Insert transaction
        const transactionStmt = this.db.prepare(`
          INSERT INTO transactions (id, transaction_code, total_amount, discount, final_amount, payment_method, amount_paid, change)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        transactionStmt.run(id, transactionCode, totalAmount, discount, finalAmount, paymentMethod, amountPaid, change);

        // Insert transaction items
        const itemStmt = this.db.prepare(`
          INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price, discount, total)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        items.forEach(item => {
          itemStmt.run(
            `${id}_${item.productId}`,
            id,
            item.productId,
            item.quantity,
            item.unitPrice,
            item.discount,
            item.total
          );
        });
      });

      return { success: true, data: { id, transactionCode } };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return { success: false, error: error.message };
    }
  }

  async getTransaction(transactionId) {
    try {
      // Get transaction
      const transactionStmt = this.db.prepare('SELECT * FROM transactions WHERE id = ?');
      const transaction = transactionStmt.get(transactionId);
      
      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      // Get transaction items
      const itemsStmt = this.db.prepare(`
        SELECT ti.*, p.name as product_name, p.sku as product_sku
        FROM transaction_items ti
        JOIN products p ON ti.product_id = p.id
        WHERE ti.transaction_id = ?
      `);
      const items = itemsStmt.all(transactionId);

      return { 
        success: true, 
        data: { 
          ...transaction,
          items 
        } 
      };
    } catch (error) {
      console.error('Error getting transaction:', error);
      return { success: false, error: error.message };
    }
  }

  // Sync operations
  async syncProductsFromServer(products) {
    try {
      this.db.transaction(() => {
        const upsertStmt = this.db.prepare(`
          INSERT OR REPLACE INTO products (id, sku, name, price, cost, stock, unit, barcode, is_active, last_sync)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        products.forEach(product => {
          upsertStmt.run(
            product.id,
            product.sku,
            product.name,
            product.price,
            product.cost,
            product.stock,
            product.unit || 'pcs',
            product.barcode,
            product.is_active ? 1 : 0
          );
        });
      });

      console.log(`✅ Synced ${products.length} products from server`);
      return { success: true };
    } catch (error) {
      console.error('Error syncing products:', error);
      return { success: false, error: error.message };
    }
  }

  async getUnsyncedTransactions() {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM transactions WHERE synced = 0 ORDER BY created_at
      `);
      const transactions = stmt.all();
      
      return { success: true, data: transactions };
    } catch (error) {
      console.error('Error getting unsynced transactions:', error);
      return { success: false, error: error.message };
    }
  }

  async markTransactionAsSynced(transactionId) {
    try {
      const stmt = this.db.prepare('UPDATE transactions SET synced = 1 WHERE id = ?');
      const result = stmt.run(transactionId);
      
      return { success: result.changes > 0 };
    } catch (error) {
      console.error('Error marking transaction as synced:', error);
      return { success: false, error: error.message };
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('✅ Database connection closed');
    }
  }
}

module.exports = DatabaseService;
export default DatabaseService;