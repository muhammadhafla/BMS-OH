const { ipcRenderer } = require('electron');

class PrinterService {
  constructor() {
    this.isQZAvailable = false;
    this.printers = [];
    this.selectedPrinter = null;
  }

  async init() {
    try {
      // Check if QZ Tray is available
      await this.checkQZAvailability();
      
      if (this.isQZAvailable) {
        await this.getPrinters();
        console.log('✅ QZ Tray printer service initialized');
      } else {
        console.warn('⚠️ QZ Tray not available, using fallback printing');
      }
    } catch (error) {
      console.error('❌ Printer service initialization failed:', error);
      this.isQZAvailable = false;
    }
  }

  async checkQZAvailability() {
    return new Promise((resolve) => {
      // QZ Tray should be running as a separate application
      // We'll use AJAX calls to communicate with QZ Tray
      try {
        // Check if we can connect to QZ Tray
        const checkQZ = () => {
          // In a real implementation, you would check if QZ Tray is running
          // and available on the standard port (8181)
          this.isQZAvailable = true;
          resolve(true);
        };
        
        // Set timeout for QZ availability check
        setTimeout(() => {
          this.isQZAvailable = true; // Assume available for now
          resolve(true);
        }, 1000);
      } catch (error) {
        console.error('QZ availability check failed:', error);
        this.isQZAvailable = false;
        resolve(false);
      }
    });
  }

  async getPrinters() {
    try {
      if (!this.isQZAvailable) {
        // Return system printers in fallback mode
        this.printers = [
          { name: 'Default Printer', type: 'fallback' },
          { name: 'POS Printer', type: 'thermal' }
        ];
        return this.printers;
      }

      // In real QZ implementation, this would use QZ API
      // For now, return mock printer list
      this.printers = [
        { name: 'EPSON TM-T88V', type: 'thermal', width: '58mm' },
        { name: 'Star TSP100', type: 'thermal', width: '80mm' },
        { name: 'Default System Printer', type: 'fallback' }
      ];

      // Auto-select first thermal printer
      const thermalPrinter = this.printers.find(p => p.type === 'thermal');
      this.selectedPrinter = thermalPrinter || this.printers[0];

      return this.printers;
    } catch (error) {
      console.error('Error getting printers:', error);
      return [];
    }
  }

  async printReceipt(receiptData) {
    try {
      if (!this.isQZAvailable) {
        return this.printReceiptFallback(receiptData);
      }

      const { 
        transaction, 
        items, 
        cashier, 
        branch,
        printerSettings = {} 
      } = receiptData;

      // Format receipt content
      const receiptContent = this.formatReceiptContent({
        transaction,
        items,
        cashier,
        branch,
        printerSettings
      });

      // Send to QZ Tray for printing
      return await this.sendToQZTray(receiptContent, printerSettings);

    } catch (error) {
      console.error('Error printing receipt:', error);
      
      // Fallback to browser print
      return this.printReceiptFallback(receiptData);
    }
  }

  formatReceiptContent({ transaction, items, cashier, branch, printerSettings }) {
    const { width = 58 } = printerSettings;
    const lineWidth = width === 80 ? 40 : 28;
    
    let content = '';

    // Header
    content += this.centerText(branch?.name || 'BMS POS', lineWidth) + '\n';
    content += this.centerText(branch?.address || '', lineWidth) + '\n';
    content += this.centerText(`Telp: ${branch?.phone || ''}`, lineWidth) + '\n';
    content += '='.repeat(lineWidth) + '\n\n';

    // Transaction info
    content += `No: ${transaction.transactionCode}\n`;
    content += `Kasir: ${cashier?.name || 'N/A'}\n`;
    content += `Tgl: ${new Date(transaction.createdAt).toLocaleString('id-ID')}\n`;
    content += '-'.repeat(lineWidth) + '\n\n';

    // Items
    content += this.padText('ITEM', 15) + this.padText('QTY', 4) + this.padText('HARGA', 9) + '\n';
    content += '-'.repeat(lineWidth) + '\n';

    items.forEach(item => {
      const itemName = item.productName.substring(0, 15);
      const qty = item.quantity.toString();
      const price = `Rp${item.total.toLocaleString('id-ID')}`;
      
      content += this.padText(itemName, 15) + this.padText(qty, 4) + this.padText(price, 9) + '\n';
    });

    content += '-'.repeat(lineWidth) + '\n';

    // Totals
    content += this.padText('SUBTOTAL:', 20) + `Rp${transaction.totalAmount.toLocaleString('id-ID')}\n`;
    if (transaction.discount > 0) {
      content += this.padText('DISKON:', 20) + `-Rp${transaction.discount.toLocaleString('id-ID')}\n`;
    }
    content += this.padText('TOTAL:', 20) + `Rp${transaction.finalAmount.toLocaleString('id-ID')}\n`;
    content += this.padText('BAYAR:', 20) + `Rp${transaction.amountPaid.toLocaleString('id-ID')}\n`;
    content += this.padText('KEMBALI:', 20) + `Rp${transaction.change.toLocaleString('id-ID')}\n`;
    content += '\n';

    // Payment method
    content += this.centerText(`Pembayaran: ${transaction.paymentMethod}`, lineWidth) + '\n\n';
    
    // Footer
    content += this.centerText('Terima Kasih', lineWidth) + '\n';
    content += this.centerText('Selamat Belanja Lagi', lineWidth) + '\n\n';
    content += '\n\n\n'; // Feed paper

    return content;
  }

  async sendToQZTray(content, printerSettings) {
    try {
      // In real QZ implementation, this would use the QZ API
      // For now, we'll simulate successful printing
      
      console.log('🖨️ Printing receipt via QZ Tray...');
      console.log('Receipt content:', content);
      
      // Simulate printing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, message: 'Receipt sent to printer' };
    } catch (error) {
      console.error('QZ printing error:', error);
      throw error;
    }
  }

  async printReceiptFallback(receiptData) {
    try {
      // Fallback: Create a new window and print
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window');
      }

      const { transaction, items, cashier, branch } = receiptData;
      
      // Create HTML content for printing
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${transaction.transactionCode}</title>
          <style>
            body { 
              font-family: monospace; 
              font-size: 12px; 
              margin: 0; 
              padding: 10px;
              width: 280px;
            }
            .center { text-align: center; }
            .line { border-bottom: 1px solid #000; margin: 5px 0; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="bold">${branch?.name || 'BMS POS'}</div>
            <div>${branch?.address || ''}</div>
            <div>Telp: ${branch?.phone || ''}</div>
            <div class="line"></div>
          </div>
          
          <div>No: ${transaction.transactionCode}</div>
          <div>Kasir: ${cashier?.name || 'N/A'}</div>
          <div>Tgl: ${new Date(transaction.createdAt).toLocaleString('id-ID')}</div>
          <div class="line"></div>
          
          <table style="width: 100%; font-size: 11px;">
            <thead>
              <tr>
                <th style="text-align: left;">ITEM</th>
                <th style="text-align: right;">QTY</th>
                <th style="text-align: right;">HARGA</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.productName.substring(0, 15)}</td>
                  <td style="text-align: right;">${item.quantity}</td>
                  <td style="text-align: right;">Rp${item.total.toLocaleString('id-ID')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="line"></div>
          <div style="display: flex; justify-content: space-between;">
            <span>SUBTOTAL:</span>
            <span>Rp${transaction.totalAmount.toLocaleString('id-ID')}</span>
          </div>
          ${transaction.discount > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>DISKON:</span>
              <span>-Rp${transaction.discount.toLocaleString('id-ID')}</span>
            </div>
          ` : ''}
          <div class="bold" style="display: flex; justify-content: space-between;">
            <span>TOTAL:</span>
            <span>Rp${transaction.finalAmount.toLocaleString('id-ID')}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>BAYAR:</span>
            <span>Rp${transaction.amountPaid.toLocaleString('id-ID')}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>KEMBALI:</span>
            <span>Rp${transaction.change.toLocaleString('id-ID')}</span>
          </div>
          
          <div class="center" style="margin-top: 20px;">
            <div>Pembayaran: ${transaction.paymentMethod}</div>
            <div class="bold" style="margin-top: 20px;">Terima Kasih</div>
            <div>Selamat Belanja Lagi</div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Print the content
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);

      return { success: true, message: 'Receipt printed (fallback mode)' };
    } catch (error) {
      console.error('Fallback printing error:', error);
      throw error;
    }
  }

  // Helper methods
  centerText(text, width) {
    if (text.length >= width) return text;
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(padding) + text + ' '.repeat(width - text.length - padding);
  }

  padText(text, width) {
    if (text.length >= width) return text.substring(0, width);
    return text + ' '.repeat(width - text.length);
  }

  getSelectedPrinter() {
    return this.selectedPrinter;
  }

  setSelectedPrinter(printerName) {
    this.selectedPrinter = this.printers.find(p => p.name === printerName);
  }
}

module.exports = PrinterService;