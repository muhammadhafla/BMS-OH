import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  database: {
    init: () => ipcRenderer.invoke('database-init'),
    getProducts: (params) => ipcRenderer.invoke('database-get-products', params),
    searchProduct: (searchTerm) => ipcRenderer.invoke('database-search-product', searchTerm),
    createTransaction: (transactionData) => ipcRenderer.invoke('database-create-transaction', transactionData),
    getTransaction: (transactionId) => ipcRenderer.invoke('database-get-transaction', transactionId),
    syncProducts: (products) => ipcRenderer.invoke('database-sync-products', products),
    getUnsyncedTransactions: () => ipcRenderer.invoke('database-get-unsynced-transactions'),
    markTransactionSynced: (transactionId) => ipcRenderer.invoke('database-mark-transaction-synced', transactionId),
  },

  // Printer operations
  printer: {
    initialize: () => ipcRenderer.invoke('printer-initialize'),
    printReceipt: (transactionData, settings) => ipcRenderer.invoke('printer-print-receipt', transactionData, settings),
    getPrinters: () => ipcRenderer.invoke('printer-get-printers'),
    testPrint: (printerName) => ipcRenderer.invoke('printer-test-print', printerName),
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app-get-version'),
    getName: () => ipcRenderer.invoke('app-get-name'),
    quit: () => ipcRenderer.invoke('app-quit'),
  },

  // File operations
  file: {
    showSaveDialog: (options) => ipcRenderer.invoke('file-show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('file-show-open-dialog', options),
    writeFile: (filePath, data) => ipcRenderer.invoke('file-write-file', filePath, data),
    readFile: (filePath) => ipcRenderer.invoke('file-read-file', filePath),
  },

  // System operations
  system: {
    getPlatform: () => ipcRenderer.invoke('system-get-platform'),
    getArch: () => ipcRenderer.invoke('system-get-arch'),
    showMessageBox: (options) => ipcRenderer.invoke('system-show-message-box', options),
    showNotification: (options) => ipcRenderer.invoke('system-show-notification', options),
  },

  // Event listeners
  onDatabaseReady: (callback) => {
    ipcRenderer.on('database-ready', callback)
  },
  
  onDatabaseError: (callback) => {
    ipcRenderer.on('database-error', callback)
  },

  onPrinterStatusChanged: (callback) => {
    ipcRenderer.on('printer-status-changed', callback)
  },

  onWindowMaximized: (callback) => {
    ipcRenderer.on('window-maximized', callback)
  },

  onWindowUnmaximized: (callback) => {
    ipcRenderer.on('window-unmaximized', callback)
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})