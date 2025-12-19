import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import isDev from 'electron-is-dev'
import DatabaseService from '../database/DatabaseService.js'
import PrinterService from '../shared/PrinterService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow
let databaseService
let printerService

const isSingleInstance = app.requestSingleInstanceLock()

if (!isSingleInstance) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  // Create mainWindow, load the rest of the app, etc.
  app.whenReady().then(createWindow)

  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../public/icon.png'),
    show: false // Don't show until ready-to-show
  })

  // Initialize services
  initializeServices()

  // Load the appropriate URL
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle window controls
  setupWindowControls()
  setupIpcHandlers()
}

async function initializeServices() {
  try {
    // Initialize database
    databaseService = new DatabaseService()
    await databaseService.init()
    
    // Initialize printer
    printerService = new PrinterService()
    await printerService.initialize()
    
    console.log('✅ Services initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize services:', error)
    await dialog.showErrorBox(
      'Initialization Error',
      `Failed to initialize application services: ${error.message}`
    )
    app.quit()
  }
}

function setupWindowControls() {
  // Window control handlers
  ipcMain.handle('window-minimize', () => {
    mainWindow.minimize()
  })

  ipcMain.handle('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.handle('window-close', () => {
    mainWindow.close()
  })

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow.isMaximized()
  })

  // Window state change listeners
  mainWindow.on('maximized', () => {
    mainWindow.webContents.send('window-maximized')
  })

  mainWindow.on('unmaximized', () => {
    mainWindow.webContents.send('window-unmaximized')
  })
}

function setupIpcHandlers() {
  // Database operations
  ipcMain.handle('database-init', async () => {
    try {
      await databaseService.init()
      return { success: true }
    } catch (error) {
      console.error('Database init error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('database-get-products', async (event, params) => {
    try {
      return await databaseService.getProducts(params)
    } catch (error) {
      console.error('Get products error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('database-search-product', async (event, searchTerm) => {
    try {
      return await databaseService.searchProduct(searchTerm)
    } catch (error) {
      console.error('Search product error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('database-create-transaction', async (event, transactionData) => {
    try {
      return await databaseService.createTransaction(transactionData)
    } catch (error) {
      console.error('Create transaction error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('database-get-transaction', async (event, transactionId) => {
    try {
      return await databaseService.getTransaction(transactionId)
    } catch (error) {
      console.error('Get transaction error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('database-sync-products', async (event, products) => {
    try {
      return await databaseService.syncProductsFromServer(products)
    } catch (error) {
      console.error('Sync products error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('database-get-unsynced-transactions', async () => {
    try {
      return await databaseService.getUnsyncedTransactions()
    } catch (error) {
      console.error('Get unsynced transactions error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('database-mark-transaction-synced', async (event, transactionId) => {
    try {
      return await databaseService.markTransactionAsSynced(transactionId)
    } catch (error) {
      console.error('Mark transaction synced error:', error)
      return { success: false, error: error.message }
    }
  })

  // Printer operations
  ipcMain.handle('printer-initialize', async () => {
    try {
      return await printerService.initialize()
    } catch (error) {
      console.error('Printer init error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('printer-print-receipt', async (event, transactionData, settings) => {
    try {
      return await printerService.printReceipt(transactionData, settings)
    } catch (error) {
      console.error('Print receipt error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('printer-get-printers', async () => {
    try {
      return await printerService.getAvailablePrinters()
    } catch (error) {
      console.error('Get printers error:', error)
      return [{ name: 'Default Printer', type: 'browser' }]
    }
  })

  ipcMain.handle('printer-test-print', async (event, printerName) => {
    try {
      return await printerService.testPrint(printerName)
    } catch (error) {
      console.error('Test print error:', error)
      return { success: false, error: error.message }
    }
  })

  // App info
  ipcMain.handle('app-get-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('app-get-name', () => {
    return app.getName()
  })

  ipcMain.handle('app-quit', () => {
    app.quit()
  })

  // File operations
  ipcMain.handle('file-show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options)
    return result
  })

  ipcMain.handle('file-show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options)
    return result
  })

  // System operations
  ipcMain.handle('system-get-platform', () => {
    return process.platform
  })

  ipcMain.handle('system-get-arch', () => {
    return process.arch
  })

  ipcMain.handle('system-show-message-box', async (event, options) => {
    const result = await dialog.showMessageBox(mainWindow, options)
    return result
  })

  ipcMain.handle('system-show-notification', async (event, options) => {
    new Notification(options).show()
    return { success: true }
  })

  // Check printer status
  ipcMain.handle('check-printer-status', async () => {
    try {
      // This would check if QZ Tray is running
      // For now, return false to use browser printing
      return { available: false }
    } catch (error) {
      console.error('Check printer status error:', error)
      return { available: false }
    }
  })

  // Print receipt handler for QZ Tray
  ipcMain.handle('print-receipt', async (event, printData) => {
    try {
      // This would handle actual printing with QZ Tray
      // For now, return success
      console.log('Print request received:', printData)
      return { success: true }
    } catch (error) {
      console.error('Print receipt error:', error)
      return { success: false, error: error.message }
    }
  })

  // Get printers for QZ Tray
  ipcMain.handle('get-printers', async () => {
    try {
      // This would get actual printers from QZ Tray
      // For now, return empty array
      return []
    } catch (error) {
      console.error('Get printers error:', error)
      return []
    }
  })

  // Test print handler
  ipcMain.handle('test-print', async (event, printData) => {
    try {
      console.log('Test print request:', printData)
      return { success: true }
    } catch (error) {
      console.error('Test print error:', error)
      return { success: false, error: error.message }
    }
  })
}