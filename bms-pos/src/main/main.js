const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Database = require('./database/DatabaseService');
const PrinterService = require('./shared/PrinterService');

let mainWindow;
let database;
let printerService;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false
  });

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeServices() {
  try {
    // Initialize database
    database = new Database();
    await database.init();

    // Initialize printer service with QZ Tray
    printerService = new PrinterService();
    await printerService.init();

    console.log('✅ POS Services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
  }
}

// IPC Handlers
ipcMain.handle('database-get-products', async (event, args) => {
  try {
    return await database.getProducts(args);
  } catch (error) {
    console.error('Error getting products:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('database-search-product', async (event, searchTerm) => {
  try {
    return await database.searchProduct(searchTerm);
  } catch (error) {
    console.error('Error searching product:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('database-create-transaction', async (event, transactionData) => {
  try {
    return await database.createTransaction(transactionData);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('database-get-transaction', async (event, transactionId) => {
  try {
    return await database.getTransaction(transactionId);
  } catch (error) {
    console.error('Error getting transaction:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('printer-print-receipt', async (event, receiptData) => {
  try {
    await printerService.printReceipt(receiptData);
    return { success: true };
  } catch (error) {
    console.error('Error printing receipt:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('printer-get-printers', async () => {
  try {
    const printers = await printerService.getPrinters();
    return { success: true, data: printers };
  } catch (error) {
    console.error('Error getting printers:', error);
    return { success: false, error: error.message };
  }
});

// App event handlers
app.whenReady().then(async () => {
  await initializeServices();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on app quit
app.on('before-quit', () => {
  if (database) {
    database.close();
  }
});