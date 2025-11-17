// Receipt Generation Component with QZ Tray Integration
// Provides receipt generation with print/export functionality and QZ Tray thermal printing

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { Transaction, ReceiptData } from '@/lib/types/transaction';
import { 
  Printer, 
  Download, 
  Eye, 
  Settings, 
  FileText, 
  Share, 
  Mail,
  QrCode,
  Image as ImageIcon,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ReceiptGenerationProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onGenerate?: (format: 'pdf' | 'print' | 'email') => Promise<void>;
}

interface ReceiptTemplate {
  headerText: string;
  footerText: string;
  showLogo: boolean;
  showBranchAddress: boolean;
  showPaymentMethod: boolean;
  showItems: boolean;
  showCustomerInfo: boolean;
  showTaxBreakdown: boolean;
  paperSize: 'a4' | 'receipt' | 'a5';
  fontSize: 'small' | 'medium' | 'large';
  includeBarcode: boolean;
  includeQRCode: boolean;
  useQZTray: boolean;
}

export function ReceiptGeneration({ 
  transaction, 
  isOpen, 
  onClose, 
  onGenerate 
}: ReceiptGenerationProps) {
  const [template, setTemplate] = useState<ReceiptTemplate>({
    headerText: 'Thank you for your purchase!',
    footerText: 'Please come again',
    showLogo: true,
    showBranchAddress: true,
    showPaymentMethod: true,
    showItems: true,
    showCustomerInfo: true,
    showTaxBreakdown: true,
    paperSize: 'receipt',
    fontSize: 'medium',
    includeBarcode: false,
    includeQRCode: false,
    useQZTray: true,
  });
  const [activeTab, setActiveTab] = useState('preview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [email, setEmail] = useState('');
  const [qzTrayStatus, setQZTrayStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  // Check QZ Tray availability
  React.useEffect(() => {
    const checkQZTray = () => {
      if (typeof (window as any).qz !== 'undefined') {
        setQZTrayStatus('available');
      } else {
        setQZTrayStatus('unavailable');
      }
    };

    checkQZTray();
    // Check again after a short delay in case QZ Tray is loading
    setTimeout(checkQZTray, 1000);
  });

  // Initialize QZ Tray
  const initializeQZTray = async () => {
    const qz = (window as any).qz;
    
    if (!qz) {
      throw new Error('QZ Tray is not installed or not available');
    }

    try {
      // Connect to QZ Tray
      await qz.connect();
      return qz;
    } catch (error) {
      throw new Error('Failed to connect to QZ Tray: ' + error);
    }
  };

  // Print using QZ Tray (direct thermal printer)
  const printWithQZTray = async () => {
    if (!transaction) return;
    
    setIsGenerating(true);
    try {
      const qz = await initializeQZTray();
      
      // Generate raw print data for thermal printer
      const printData = generateThermalPrinterData(qz);
      
      // Get available printers
      const printers = await qz.findPrinter();
      
      if (printers.length === 0) {
        throw new Error('No printers found. Please check if your thermal printer is connected and QZ Tray is running.');
      }
      
      // Print to first available printer
      await qz.print(printers[0], printData);
      
      toast.success(`Receipt sent to thermal printer: ${printers[0]}`);
    } catch (error) {
      console.error('QZ Tray printing failed:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate thermal printer data (ESC/POS commands)
  const generateThermalPrinterData = (qz: any) => {
    if (!transaction) return [];
    
    const data = [];
    const encoding = 'Cp858'; // Common encoding for thermal printers
    
    // Initialize printer
    data.push(qz.createData(encoding, [0x1b, 0x40]));
    
    // Center alignment
    data.push(qz.createData(encoding, [0x1b, 0x61, 0x01]));
    
    // Company name (bold)
    data.push(qz.createData(encoding, [0x1b, 0x45, 0x01]));
    data.push(qz.createData(encoding, ['BMS STORE\n']));
    data.push(qz.createData(encoding, [0x1b, 0x45, 0x00]));
    
    // Address
    if (template.showBranchAddress) {
      data.push(qz.createData(encoding, [transaction.branch.address || 'Main Branch\n']));
      data.push(qz.createData(encoding, ['Phone: +62 21 1234 5678\n']));
    }
    
    data.push(qz.createData(encoding, ['\n']));
    
    // Transaction info (left alignment)
    data.push(qz.createData(encoding, [0x1b, 0x61, 0x00]));
    data.push(qz.createData(encoding, [`Transaction: ${transaction.transactionCode}\n`]));
    data.push(qz.createData(encoding, [`Date: ${formatDate(transaction.createdAt)}\n`]));
    data.push(qz.createData(encoding, [`Cashier: ${transaction.user.name}\n`]));
    
    if (template.showCustomerInfo) {
      data.push(qz.createData(encoding, [`Branch: ${transaction.branch.name}\n`]));
    }
    
    data.push(qz.createData(encoding, ['--------------------------------\n']));
    
    // Items
    if (template.showItems) {
      transaction.items.forEach(item => {
        data.push(qz.createData(encoding, [`${item.product.name}\n`]));
        data.push(qz.createData(encoding, [`${item.quantity} x ${formatCurrency(item.unitPrice)}\n`]));
        data.push(qz.createData(encoding, [formatCurrency(item.total) + '\n']));
      });
      data.push(qz.createData(encoding, ['--------------------------------\n']));
    }
    
    // Totals
    data.push(qz.createData(encoding, [`Subtotal: ${formatCurrency(transaction.totalAmount)}\n`]));
    
    if (transaction.discount > 0) {
      data.push(qz.createData(encoding, [`Discount: -${formatCurrency(transaction.discount)}\n`]));
    }
    
    if (template.showTaxBreakdown && transaction.tax > 0) {
      data.push(qz.createData(encoding, [`Tax: ${formatCurrency(transaction.tax)}\n`]));
    }
    
    // Total (bold)
    data.push(qz.createData(encoding, [0x1b, 0x45, 0x01]));
    data.push(qz.createData(encoding, [`TOTAL: ${formatCurrency(transaction.finalAmount)}\n`]));
    data.push(qz.createData(encoding, [0x1b, 0x45, 0x00]));
    
    // Payment info
    if (template.showPaymentMethod) {
      data.push(qz.createData(encoding, ['--------------------------------\n']));
      data.push(qz.createData(encoding, [`Payment: ${transaction.paymentMethod.replace('_', ' ')}\n`]));
      data.push(qz.createData(encoding, [`Paid: ${formatCurrency(transaction.amountPaid)}\n`]));
      
      if (transaction.change > 0) {
        data.push(qz.createData(encoding, [`Change: ${formatCurrency(transaction.change)}\n`]));
      }
    }
    
    // Barcode/QR Code
    if (template.includeBarcode) {
      data.push(qz.createData(encoding, ['\n\n']));
      data.push(qz.createData(encoding, [`*${transaction.transactionCode}*\n`]));
    }
    
    if (template.includeQRCode) {
      data.push(qz.createData(encoding, ['\n[QR CODE]\n']));
    }
    
    // Footer
    if (template.headerText || template.footerText) {
      data.push(qz.createData(encoding, ['--------------------------------\n']));
      data.push(qz.createData(encoding, [0x1b, 0x61, 0x01])); // Center alignment
      
      if (template.headerText) {
        data.push(qz.createData(encoding, [template.headerText + '\n']));
      }
      
      if (template.footerText) {
        data.push(qz.createData(encoding, [template.footerText + '\n']));
      }
    }
    
    // Cut paper
    data.push(qz.createData(encoding, [0x1d, 0x56, 0x42, 0x10]));
    
    return data;
  };

  // Fallback browser print
  const printWithBrowser = async () => {
    setIsGenerating(true);
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt - ${transaction?.transactionCode}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 0; 
                  padding: 20px; 
                  font-size: ${template.fontSize === 'small' ? '12px' : template.fontSize === 'large' ? '16px' : '14px'};
                }
                .receipt { 
                  max-width: 300px; 
                  margin: 0 auto; 
                  background: white;
                }
                .header { 
                  text-align: center; 
                  margin-bottom: 20px; 
                  border-bottom: 2px solid #000; 
                  padding-bottom: 10px; 
                }
                .logo { 
                  width: 80px; 
                  height: 80px; 
                  margin: 0 auto 10px; 
                  background: #f0f0f0; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center;
                  font-size: 12px;
                }
                .company-name { 
                  font-size: 18px; 
                  font-weight: bold; 
                  margin-bottom: 5px; 
                }
                .address { 
                  font-size: 12px; 
                  margin-bottom: 5px; 
                }
                .transaction-info { 
                  margin: 15px 0; 
                }
                .transaction-info div { 
                  margin: 2px 0; 
                }
                .items { 
                  margin: 15px 0; 
                }
                .item { 
                  display: flex; 
                  justify-content: space-between; 
                  margin: 5px 0; 
                }
                .total { 
                  border-top: 1px solid #000; 
                  padding-top: 10px; 
                  font-weight: bold; 
                }
                .footer { 
                  text-align: center; 
                  margin-top: 20px; 
                  border-top: 1px solid #000; 
                  padding-top: 10px; 
                }
                @media print { 
                  body { margin: 0; padding: 0; } 
                  .receipt { margin: 0; max-width: none; }
                }
              </style>
            </head>
            <body>
              <div class="receipt">
                ${generateReceiptHTML()}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        
        // Auto-print after a short delay
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
      
      toast.success('Receipt opened for browser printing');
    } catch (error) {
      console.error('Browser printing failed:', error);
      toast.error('Failed to generate print receipt');
    } finally {
      setIsGenerating(false);
    }
  };

  // Main print handler
  const handlePrint = async () => {
    if (!transaction) return;
    
    // Try QZ Tray first if enabled, fallback to browser print
    if (template.useQZTray && qzTrayStatus === 'available') {
      try {
        await printWithQZTray();
      } catch (error) {
        console.warn('QZ Tray failed, falling back to browser print:', error);
        toast.warning('QZ Tray printing failed, using browser print as fallback');
        await printWithBrowser();
      }
    } else {
      await printWithBrowser();
    }
  };

  // Generate receipt HTML for preview and print
  const generateReceiptHTML = () => {
    if (!transaction) return '';
    
    return `
      <div class="header">
        ${template.showLogo ? '<div class="logo">LOGO</div>' : ''}
        <div class="company-name">BMS Store</div>
        ${template.showBranchAddress ? `
          <div class="address">
            ${transaction.branch.address || 'Main Branch'}<br>
            Phone: +62 21 1234 5678
          </div>
        ` : ''}
        <div><strong>RECEIPT</strong></div>
      </div>
      
      <div class="transaction-info">
        <div><strong>Transaction:</strong> ${transaction.transactionCode}</div>
        <div><strong>Date:</strong> ${formatDate(transaction.createdAt)}</div>
        <div><strong>Cashier:</strong> ${transaction.user.name}</div>
        ${template.showCustomerInfo ? `
          <div><strong>Branch:</strong> ${transaction.branch.name}</div>
        ` : ''}
      </div>
      
      ${template.showItems ? `
        <div class="items">
          ${transaction.items.map(item => `
            <div class="item">
              <div>
                ${item.product.name}<br>
                <small>${item.quantity} x ${formatCurrency(item.unitPrice)}</small>
              </div>
              <div>${formatCurrency(item.total)}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div class="total">
        <div class="item">
          <div>Subtotal:</div>
          <div>${formatCurrency(transaction.totalAmount)}</div>
        </div>
        ${transaction.discount > 0 ? `
          <div class="item">
            <div>Discount:</div>
            <div>-${formatCurrency(transaction.discount)}</div>
          </div>
        ` : ''}
        ${template.showTaxBreakdown && transaction.tax > 0 ? `
          <div class="item">
            <div>Tax:</div>
            <div>${formatCurrency(transaction.tax)}</div>
          </div>
        ` : ''}
        <div class="item" style="font-size: 1.2em; margin-top: 10px;">
          <div><strong>TOTAL:</strong></div>
          <div><strong>${formatCurrency(transaction.finalAmount)}</strong></div>
        </div>
      </div>
      
      ${template.showPaymentMethod ? `
        <div class="transaction-info">
          <div><strong>Payment Method:</strong> ${transaction.paymentMethod.replace('_', ' ')}</div>
          <div><strong>Amount Paid:</strong> ${formatCurrency(transaction.amountPaid)}</div>
          ${transaction.change > 0 ? `
            <div><strong>Change:</strong> ${formatCurrency(transaction.change)}</div>
          ` : ''}
        </div>
      ` : ''}
      
      ${template.includeBarcode ? `
        <div style="text-align: center; margin: 20px 0;">
          <div style="background: #f0f0f0; height: 40px; display: flex; align-items: center; justify-content: center;">
            [BARCODE]
          </div>
          <div style="font-size: 10px;">${transaction.transactionCode}</div>
        </div>
      ` : ''}
      
      ${template.includeQRCode ? `
        <div style="text-align: center; margin: 20px 0;">
          <div style="background: #f0f0f0; height: 80px; width: 80px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
            <QrCode class="w-8 h-8" />
          </div>
        </div>
      ` : ''}
      
      <div class="footer">
        ${template.headerText ? `<div style="margin-bottom: 10px;">${template.headerText}</div>` : ''}
        <div>${template.footerText}</div>
        <div style="margin-top: 10px; font-size: 10px;">
          Transaction ID: ${transaction.id}
        </div>
      </div>
    `;
  };

  // Handle PDF generation
  const handlePDF = async () => {
    if (!transaction) return;
    
    setIsGenerating(true);
    try {
      // In a real implementation, this would call an API to generate PDF
      const response = await fetch(`/api/transactions/${transaction.id}/receipt/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ template }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `receipt-${transaction.transactionCode}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success('PDF receipt generated successfully');
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF receipt');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle email
  const handleEmail = async () => {
    if (!transaction || !email) {
      toast.error('Please provide a valid email address');
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/transactions/${transaction.id}/receipt/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          template,
          subject: `Receipt for Transaction ${transaction.transactionCode}`,
        }),
      });
      
      if (response.ok) {
        toast.success('Receipt sent via email successfully');
        onClose();
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error('Failed to send receipt via email');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receipt Generation</DialogTitle>
          <DialogDescription>
            Generate and customize receipts for transaction {transaction.transactionCode}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Receipt Preview</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{template.paperSize.toUpperCase()}</Badge>
                    {template.useQZTray && qzTrayStatus === 'available' && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <Zap className="w-3 h-3 mr-1" />
                        QZ Tray
                      </Badge>
                    )}
                    {template.useQZTray && qzTrayStatus === 'unavailable' && (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        QZ Tray Offline
                      </Badge>
                    )}
                  </div>
                </CardTitle>
                <CardDescription>
                  This is how your receipt will look
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div 
                    className={`mx-auto bg-white shadow-lg ${
                      template.paperSize === 'a4' ? 'max-w-2xl' : 
                      template.paperSize === 'a5' ? 'max-w-sm' : 'max-w-sm'
                    }`}
                    style={{ 
                      fontSize: template.fontSize === 'small' ? '12px' : 
                                template.fontSize === 'large' ? '16px' : '14px'
                    }}
                  >
                    <div 
                      className="p-6"
                      dangerouslySetInnerHTML={{ __html: generateReceiptHTML() }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="template" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Receipt Template Settings</CardTitle>
                <CardDescription>
                  Customize how your receipt looks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* QZ Tray Settings */}
                <div className="space-y-3">
                  <Label>Print Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useQZTray"
                        checked={template.useQZTray}
                        onCheckedChange={(checked) => 
                          setTemplate(prev => ({ ...prev, useQZTray: checked as boolean }))
                        }
                      />
                      <Label htmlFor="useQZTray" className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Use QZ Tray (Thermal Printer)
                      </Label>
                    </div>
                  </div>
                  {template.useQZTray && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        {qzTrayStatus === 'checking' && (
                          <>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-blue-700">Checking QZ Tray status...</span>
                          </>
                        )}
                        {qzTrayStatus === 'available' && (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-green-700">QZ Tray is available and ready</span>
                          </>
                        )}
                        {qzTrayStatus === 'unavailable' && (
                          <>
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-sm text-red-700">QZ Tray not found. Please install QZ Tray or disable this option.</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <hr className="border-t border-gray-200" />

                {/* Header and Footer */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="headerText">Header Message</Label>
                    <Input
                      id="headerText"
                      value={template.headerText}
                      onChange={(e) => setTemplate(prev => ({ ...prev, headerText: e.target.value }))}
                      placeholder="Thank you for your purchase!"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="footerText">Footer Message</Label>
                    <Input
                      id="footerText"
                      value={template.footerText}
                      onChange={(e) => setTemplate(prev => ({ ...prev, footerText: e.target.value }))}
                      placeholder="Please come again"
                    />
                  </div>
                </div>

                <hr className="border-t border-gray-200" />

                {/* Display Options */}
                <div className="space-y-3">
                  <Label>Display Options</Label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showLogo"
                        checked={template.showLogo}
                        onCheckedChange={(checked) => 
                          setTemplate(prev => ({ ...prev, showLogo: checked as boolean }))
                        }
                      />
                      <Label htmlFor="showLogo">Show Logo</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showBranchAddress"
                        checked={template.showBranchAddress}
                        onCheckedChange={(checked) => 
                          setTemplate(prev => ({ ...prev, showBranchAddress: checked as boolean }))
                        }
                      />
                      <Label htmlFor="showBranchAddress">Show Branch Address</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showCustomerInfo"
                        checked={template.showCustomerInfo}
                        onCheckedChange={(checked) => 
                          setTemplate(prev => ({ ...prev, showCustomerInfo: checked as boolean }))
                        }
                      />
                      <Label htmlFor="showCustomerInfo">Show Customer Info</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showItems"
                        checked={template.showItems}
                        onCheckedChange={(checked) => 
                          setTemplate(prev => ({ ...prev, showItems: checked as boolean }))
                        }
                      />
                      <Label htmlFor="showItems">Show Items</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showPaymentMethod"
                        checked={template.showPaymentMethod}
                        onCheckedChange={(checked) => 
                          setTemplate(prev => ({ ...prev, showPaymentMethod: checked as boolean }))
                        }
                      />
                      <Label htmlFor="showPaymentMethod">Show Payment Method</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showTaxBreakdown"
                        checked={template.showTaxBreakdown}
                        onCheckedChange={(checked) => 
                          setTemplate(prev => ({ ...prev, showTaxBreakdown: checked as boolean }))
                        }
                      />
                      <Label htmlFor="showTaxBreakdown">Show Tax Breakdown</Label>
                    </div>
                  </div>
                </div>

                <hr className="border-t border-gray-200" />

                {/* Format Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paperSize">Paper Size</Label>
                    <Select 
                      value={template.paperSize} 
                      onValueChange={(value: any) => setTemplate(prev => ({ ...prev, paperSize: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receipt">Receipt (80mm)</SelectItem>
                        <SelectItem value="a5">A5</SelectItem>
                        <SelectItem value="a4">A4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="fontSize">Font Size</Label>
                    <Select 
                      value={template.fontSize} 
                      onValueChange={(value: any) => setTemplate(prev => ({ ...prev, fontSize: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Additional Features */}
                <div className="space-y-3">
                  <Label>Additional Features</Label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeBarcode"
                        checked={template.includeBarcode}
                        onCheckedChange={(checked) => 
                          setTemplate(prev => ({ ...prev, includeBarcode: checked as boolean }))
                        }
                      />
                      <Label htmlFor="includeBarcode">Include Barcode</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeQRCode"
                        checked={template.includeQRCode}
                        onCheckedChange={(checked) => 
                          setTemplate(prev => ({ ...prev, includeQRCode: checked as boolean }))
                        }
                      />
                      <Label htmlFor="includeQRCode">Include QR Code</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* QZ Tray Print Options */}
              {template.useQZTray && qzTrayStatus === 'available' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-green-600" />
                      Thermal Printer (QZ Tray)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      onClick={handlePrint} 
                      disabled={isGenerating}
                      className="w-full"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Print to Thermal Printer
                    </Button>
                    
                    <div className="text-sm text-muted-foreground">
                      <p>• Direct thermal printer output</p>
                      <p>• Optimized for receipt paper</p>
                      <p>• Fast and reliable printing</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Browser Print Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="w-5 h-5" />
                    Browser Print
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={printWithBrowser} 
                    disabled={isGenerating}
                    className="w-full"
                    variant="outline"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print via Browser
                  </Button>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>• Uses browser print dialog</p>
                    <p>• Works on any printer</p>
                    <p>• Manual printer selection</p>
                  </div>
                </CardContent>
              </Card>

              {/* PDF Export */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    PDF Export
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handlePDF} 
                    disabled={isGenerating}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>• High-quality PDF output</p>
                    <p>• Optimized for email sharing</p>
                    <p>• Archival format</p>
                  </div>
                </CardContent>
              </Card>

              {/* Email */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Receipt
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="customer@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleEmail} 
                    disabled={isGenerating || !email}
                    className="w-full"
                  >
                    <Share className="w-4 h-4 mr-2" />
                    Send via Email
                  </Button>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>• Email receipt to customer</p>
                    <p>• PDF attachment included</p>
                    <p>• Professional email template</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} disabled={isGenerating}>
            <Zap className="w-4 h-4 mr-2" />
            Quick Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}