/**
 * Printer Service for PWA
 * Browser-compatible printer service using native Web APIs
 */

const PrinterSettings = {
  paperSize: '',
  orientation: 'portrait',
  margins: { top: 0, right: 0, bottom: 0, left: 0 },
}

const TransactionData = {
  transaction: {
    id: '',
    transactionCode: '',
    totalAmount: 0,
    discount: 0,
    tax: 0,
    finalAmount: 0,
    paymentMethod: '',
    amountPaid: 0,
    change: 0,
    createdAt: '',
    cashierName: '',
  },
  items: [{
    productName: '',
    quantity: 0,
    unitPrice: 0,
    discount: 0,
    total: 0,
  }],
  customer: {
    name: '',
    phone: '',
  },
}

const PrinterInfo = {
  name: '',
  type: '',
  description: '',
  id: '',
}

class PrinterService {
  constructor() {
    this.isElectronAvailable = false
    this.printerSettings = null
    this.checkElectron()
  }

  checkElectron() {
    // Check if we're running in Electron (for hybrid scenarios)
    this.isElectronAvailable = typeof window !== 'undefined' && 
                               window.process && 
                               window.process.type === 'renderer'
  }

  async initialize() {
    try {
      console.log('ℹ️ Using browser printing service (PWA mode)')
      console.log('💡 Tip: For better printing results, use Chrome or Edge browsers')
      
      return { 
        success: true, 
        method: 'browser',
        message: 'Browser printing service initialized for PWA',
      }
    } catch (error) {
      console.error('❌ Printer service initialization failed:', error)
      return { 
        success: false, 
        error: error.message, 
        method: 'browser', 
      }
    }
  }

  async printReceipt(transactionData, printerSettings = {}) {
    try {
      return await this.printReceiptFallback(transactionData, printerSettings)
    } catch (error) {
      console.error('❌ Receipt printing failed:', error)
      throw error
    }
  }

  async printReceiptFallback(transactionData, printerSettings = {}) {
    try {
      const receiptHTML = this.generateReceiptHTML(transactionData)
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=400,height=600')
      
      if (!printWindow) {
        // Fallback: Print directly to main window (not ideal but works)
        const printContent = window.open('', '_self')
        if (printContent) {
          printContent.document.write(receiptHTML)
          printContent.document.close()
          printContent.onload = () => {
            printContent.print()
          }
        }
        return { success: true, method: 'browser-direct' }
      }
      
      // Write content to the new window
      printWindow.document.write(receiptHTML)
      printWindow.document.close()
      
      // Wait for content to load then print
      printWindow.onload = () => {
        // Add a small delay to ensure styles are applied
        setTimeout(() => {
          printWindow.print()
          // Close the window after printing (some browsers require user interaction)
          setTimeout(() => {
            printWindow.close()
          }, 100)
        }, 500)
      }

      console.log('✅ Receipt printed via browser (PWA mode)')
      return { success: true, method: 'browser' }
    } catch (error) {
      console.error('❌ Browser printing failed:', error)
      
      // Last resort: show receipt in main window
      this.showReceiptInModal(transactionData)
      return { 
        success: true, 
        method: 'modal-fallback',
        message: 'Receipt shown in modal - please print manually',
      }
    }
  }

  showReceiptInModal(transactionData) {
    // Create a modal with the receipt for manual printing
    const receiptHTML = this.generateReceiptHTML(transactionData)
    
    // Create modal overlay
    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `
    
    // Create modal content
    const modal = document.createElement('div')
    modal.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 400px;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
    `
    
    // Add close button
    const closeBtn = document.createElement('button')
    closeBtn.textContent = '✕'
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      border: none;
      background: #f0f0f0;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      cursor: pointer;
      font-size: 16px;
    `
    
    // Add print button
    const printBtn = document.createElement('button')
    printBtn.textContent = '🖨️ Print Receipt'
    printBtn.style.cssText = `
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin: 10px 0;
      font-size: 14px;
    `
    
    // Add receipt content
    const receiptContainer = document.createElement('div')
    receiptContainer.innerHTML = receiptHTML
    receiptContainer.style.cssText = 'font-family: monospace; font-size: 12px;'
    
    // Assemble modal
    modal.appendChild(closeBtn)
    modal.appendChild(printBtn)
    modal.appendChild(receiptContainer)
    overlay.appendChild(modal)
    document.body.appendChild(overlay)
    
    // Event handlers
    closeBtn.onclick = () => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay)
      }
    }
    
    printBtn.onclick = () => {
      const printFrame = document.createElement('iframe')
      printFrame.style.position = 'absolute'
      printFrame.style.left = '-9999px'
      document.body.appendChild(printFrame)
      
      printFrame.onload = () => {
        if (printFrame.contentWindow) {
          printFrame.contentWindow.print()
          setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame)
            }
          }, 100)
        }
      }
      
      if (printFrame.contentDocument) {
        printFrame.contentDocument.write(receiptHTML)
        printFrame.contentDocument.close()
      }
    }
    
    overlay.onclick = (e) => {
      if (e.target === overlay && document.body.contains(overlay)) {
        document.body.removeChild(overlay)
      }
    }
  }

  generateReceiptHTML(transactionData) {
    const { transaction, items, customer } = transactionData
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${transaction.transactionCode || transaction.id}</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            max-width: 300px; 
            margin: 0 auto; 
            padding: 20px;
            font-size: 12px;
            line-height: 1.4;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px dashed #000; 
            padding-bottom: 10px; 
            margin-bottom: 15px; 
          }
          .item { 
            display: flex; 
            justify-content: space-between; 
            margin: 5px 0; 
            font-size: 11px;
          }
          .item-details {
            flex: 1;
          }
          .item-price {
            text-align: right;
            min-width: 60px;
          }
          .total { 
            border-top: 2px dashed #000; 
            padding-top: 10px; 
            margin-top: 15px; 
            font-weight: bold; 
          }
          .footer { 
            text-align: center; 
            border-top: 1px dashed #000; 
            padding-top: 10px; 
            margin-top: 15px; 
            font-size: 10px;
          }
          .customer-info {
            font-size: 11px;
            margin: 10px 0;
          }
          .separator {
            border-bottom: 1px dotted #ccc;
            margin: 5px 0;
          }
          @media print { 
            body { margin: 0; padding: 10px; } 
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0; font-size: 16px;">🏪 BMS POS</h2>
          <p style="margin: 5px 0; font-size: 10px;">
            Your Store Address<br>
            Phone: +1234567890
          </p>
          <div class="separator"></div>
          <p style="margin: 5px 0; font-size: 11px;">
            <strong>Receipt:</strong> ${transaction.transactionCode || transaction.id}<br>
            <strong>Date:</strong> ${new Date(transaction.createdAt || Date.now()).toLocaleString()}<br>
            <strong>Cashier:</strong> ${transaction.cashierName || 'System'}
          </p>
        </div>
        
        ${customer ? `
          <div class="customer-info">
            <strong>Customer:</strong> ${customer.name || 'N/A'}<br>
            ${customer.phone ? `<strong>Phone:</strong> ${customer.phone}` : ''}
          </div>
          <div class="separator"></div>
        ` : ''}
        
        <div class="items">
          ${items.map(item => `
            <div class="item">
              <div class="item-details">
                <div>${item.productName || 'Product'}</div>
                <div style="font-size: 10px; color: #666;">
                  ${item.quantity} × $${(item.unitPrice || 0).toFixed(2)}
                  ${(item.discount || 0) > 0 ? `<br><span style="color: red;">(-$${(item.discount || 0).toFixed(2)} discount)</span>` : ''}
                </div>
              </div>
              <div class="item-price">
                $${(item.total || 0).toFixed(2)}
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="separator"></div>
        
        <div class="total">
          <div class="item">
            <span>Subtotal:</span>
            <span>$${(transaction.totalAmount || 0).toFixed(2)}</span>
          </div>
          ${(transaction.discount || 0) > 0 ? `
            <div class="item" style="color: red;">
              <span>Discount:</span>
              <span>-$${(transaction.discount || 0).toFixed(2)}</span>
            </div>
          ` : ''}
          ${(transaction.tax || 0) > 0 ? `
            <div class="item">
              <span>Tax:</span>
              <span>$${(transaction.tax || 0).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="item" style="font-size: 13px;">
            <span><strong>TOTAL:</strong></span>
            <span><strong>$${(transaction.finalAmount || 0).toFixed(2)}</strong></span>
          </div>
          <div class="separator"></div>
          <div class="item">
            <span>Paid (${transaction.paymentMethod || 'CASH'}):</span>
            <span>$${(transaction.amountPaid || 0).toFixed(2)}</span>
          </div>
          <div class="item">
            <span>Change:</span>
            <span>$${(transaction.change || 0).toFixed(2)}</span>
          </div>
        </div>
        
        <div class="footer">
          <p style="margin: 10px 0;">🙏 Thank you for your business!</p>
          <p style="margin: 5px 0; font-size: 9px;">www.bms-pos.com</p>
          <p style="margin: 5px 0; font-size: 9px; color: #666;">
            Powered by BMS POS PWA
          </p>
        </div>
      </body>
      </html>
    `
  }

  async getAvailablePrinters() {
    try {
      // In PWA, we only have browser printing
      return [{ 
        name: 'Default Printer', 
        type: 'browser',
        description: 'Browser default printer',
      }]
    } catch (error) {
      console.error('Failed to get available printers:', error)
      return [{ 
        name: 'Default Printer', 
        type: 'browser',
        description: 'Browser default printer',
      }]
    }
  }

  async testPrint(printerName = 'Default') {
    try {
      const testData = {
        type: 'test',
        content: 'Test print from BMS POS PWA',
        timestamp: new Date().toISOString(),
      }

      // Browser test print
      const printWindow = window.open('', '_blank', 'width=400,height=600')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Test Print - BMS POS</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                padding: 20px; 
                text-align: center;
              }
              .test-content {
                border: 2px dashed #000;
                padding: 20px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <h1>🧪 Test Print</h1>
            <div class="test-content">
              <h2>BMS POS PWA</h2>
              <p>This is a test print from the BMS POS Progressive Web Application.</p>
              <p><strong>Timestamp:</strong> ${testData.timestamp}</p>
              <p><strong>Printer:</strong> ${printerName}</p>
              <p>✅ Printer service is working correctly!</p>
            </div>
            <p style="font-size: 12px; color: #666;">
              If you can see this message, the PWA printing functionality is working.
            </p>
          </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
            setTimeout(() => {
              printWindow.close()
            }, 100)
          }, 500)
        }
      }
      
      return { 
        success: true, 
        method: 'browser',
        message: 'Test print sent to browser',
      }
    } catch (error) {
      console.error('Test print failed:', error)
      throw error
    }
  }
}

export default PrinterService