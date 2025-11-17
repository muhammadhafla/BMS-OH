const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  getProducts: (args) => ipcRenderer.invoke('database-get-products', args),
  searchProduct: (searchTerm) => ipcRenderer.invoke('database-search-product', searchTerm),
  createTransaction: (transactionData) => ipcRenderer.invoke('database-create-transaction', transactionData),
  getTransaction: (transactionId) => ipcRenderer.invoke('database-get-transaction', transactionId),

  // Printer operations
  printReceipt: (receiptData) => ipcRenderer.invoke('printer-print-receipt', receiptData),
  getPrinters: () => ipcRenderer.invoke('printer-get-printers'),

  // Platform info
  platform: process.platform,

  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});

// Remove this if you don't need it
console.log('Preload script loaded successfully');