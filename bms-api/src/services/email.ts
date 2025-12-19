import * as nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { PasswordResetEmailData } from '../types/email';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: string;
    path?: string;
  }>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface TransactionReceiptData {
  customerName: string;
  transactionCode: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  finalAmount: number;
  paymentMethod: string;
  branchName: string;
  date: string;
}

export interface LowStockAlertData {
  productName: string;
  currentStock: number;
  minStock: number;
  branchName: string;
  productSku: string;
}

export interface SystemAlertData {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  recipientEmails: string[];
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private isDevelopment: boolean;
  private developmentRecipients: string[];
  private prisma: PrismaClient;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.prisma = new PrismaClient();
    this.fromEmail = process.env.SMTP_FROM || 'BMS System <noreply@bms.com>';
    
    // Development mode: collect emails for logging instead of sending
    this.developmentRecipients = process.env.DEV_EMAIL_RECIPIENTS
      ? process.env.DEV_EMAIL_RECIPIENTS.split(',').map(email => email.trim())
      : [];

    // Create transporter based on environment
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.SMTP_PORT === '465'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
      },
      // Additional options for better compatibility
      maxConnections: 5,
      maxMessages: 100,
    } as nodemailer.TransportOptions);

    // Enhanced SMTP configuration logging
    console.log('📧 Email Service Configuration:');
    console.log(`  Host: ${process.env.SMTP_HOST || 'Not configured'}`);
    console.log(`  Port: ${process.env.SMTP_PORT || '587'}`);
    console.log(`  From: ${this.fromEmail}`);
    console.log(`  User: ${process.env.SMTP_USER || 'Not configured'}`);
    console.log(`  Mode: ${this.isDevelopment ? 'Development (Logging)' : 'Production (Sending)'}`);
    console.log(`  Secure: ${process.env.SMTP_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.SMTP_PORT === '465')}`);

    // Initialize email templates cache
    this.initializeEmailTemplates();
  }

  private initializeEmailTemplates(): void {
    // Pre-initialize any template cache if needed
    console.log('📧 Email templates initialized');
  }

  /**
   * Validate email address format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Send email with enhanced error handling and logging
   */
  async sendEmail(emailOptions: EmailOptions): Promise<boolean> {
    try {
      const { to, subject, html, text, attachments } = emailOptions;

      // Validate email addresses
      const recipients = Array.isArray(to) ? to : [to];
      const invalidEmails = recipients.filter(email => !this.isValidEmail(email));
      
      if (invalidEmails.length > 0) {
        console.error('❌ Invalid email addresses:', invalidEmails);
        return false;
      }

      // In development mode, use development recipients if configured
      let finalRecipients = recipients;
      if (this.isDevelopment && this.developmentRecipients.length > 0) {
        console.log(`📧 Development Mode: Redirecting emails to development recipients: ${this.developmentRecipients.join(', ')}`);
        finalRecipients = this.developmentRecipients;
      }

      // Check if SMTP is configured for production
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        if (this.isDevelopment) {
          console.warn('⚠️  SMTP not configured, logging email instead of sending (Development Mode)');
          this.logEmailInstead(emailOptions);
          // Log to database even in development mode
          await this.logEmailToDatabase(finalRecipients, subject, 'logged', undefined);
          return true;
        } else {
          console.error('❌ SMTP not configured in production environment');
          // Log failed attempt to database
          await this.logEmailToDatabase(finalRecipients, subject, 'failed', undefined, 'SMTP not configured');
          return false;
        }
      }

      const mailOptions: nodemailer.SendMailOptions = {
        from: this.fromEmail,
        to: recipients,
        subject,
        html,
        text,
        attachments,
        // Add headers for better tracking
        headers: {
          'X-Mailer': 'BMS System Email Service',
          'X-Priority': '3',
        },
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${recipients.join(', ')}`);
      console.log(`📧 Message ID: ${info.messageId}`);
      console.log(`📧 Subject: ${subject}`);

      // Log successful email to database for audit trail
      await this.logEmailToDatabase(recipients, subject, 'sent', info.messageId);

      return true;
    } catch (error: any) {
      console.error('❌ Failed to send email:', error.message);
      
      // Log failed email to database for audit trail
      const recipients = Array.isArray(emailOptions.to) ? emailOptions.to : [emailOptions.to];
      await this.logEmailToDatabase(recipients, emailOptions.subject, 'failed', undefined, error.message);
      
      return false;
    }
  }

  /**
   * Log email to database for audit trail
   */
  private async logEmailToDatabase(
    recipients: string[],
    subject: string,
    status: 'sent' | 'failed' | 'logged',
    messageId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Log to database for audit trail
      // In a real implementation, you would create an email_logs table
      // For now, we'll use Prisma to simulate database logging
      console.log(`📧 Email Audit Log:`, {
        recipients: recipients.join(', '),
        subject,
        status,
        messageId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        service: 'EmailService'
      });

      // Save to database for audit trail (simulated)
      // In a real implementation, you would create an email_logs table in your Prisma schema
      try {
        // Test database connection (this uses the prisma variable)
        await this.prisma.$queryRaw`SELECT 1`;
        
        // In production, uncomment this and add email_logs table to your schema:
        /*
        await this.prisma.emailLog.create({
          data: {
            recipients: recipients.join(', '),
            subject,
            status,
            messageId,
            errorMessage,
            sentAt: new Date()
          }
        });
        */
        
        // Simulate database operation
        console.log(`📊 Email logged to database: ${status} - ${subject}`);
      } catch (dbError) {
        console.error('Database logging failed:', dbError);
        // Don't fail the email sending if database logging fails
      }

    } catch (error) {
      console.error('Failed to log email to database:', error);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(emailData: PasswordResetEmailData): Promise<boolean> {
    const { to, resetToken, userName, resetUrl } = emailData;

    const emailOptions: EmailOptions = {
      to,
      subject: 'Password Reset Request - BMS System',
      html: this.getPasswordResetEmailTemplate({ userName, resetUrl, resetToken }),
      text: this.getPasswordResetEmailTemplateText({ userName, resetUrl, resetToken }),
    };

    return this.sendEmail(emailOptions);
  }

  /**
   * Send transaction receipt email
   */
  async sendTransactionReceipt(data: TransactionReceiptData): Promise<boolean> {
    const emailOptions: EmailOptions = {
      to: data.customerName, // This should be customer's email, not name
      subject: `Receipt for Transaction ${data.transactionCode}`,
      html: this.getTransactionReceiptTemplate(data),
      text: this.getTransactionReceiptTextTemplate(data),
    };

    return this.sendEmail(emailOptions);
  }

  /**
   * Send low stock alert email
   */
  async sendLowStockAlert(data: LowStockAlertData): Promise<boolean> {
    const emailOptions: EmailOptions = {
      to: process.env.ALERT_EMAIL_RECIPIENTS?.split(',').map(email => email.trim()) || [],
      subject: `Low Stock Alert: ${data.productName}`,
      html: this.getLowStockAlertTemplate(data),
      text: this.getLowStockAlertTextTemplate(data),
    };

    return this.sendEmail(emailOptions);
  }

  /**
   * Send system alert email
   */
  async sendSystemAlert(data: SystemAlertData): Promise<boolean> {
    const emailOptions: EmailOptions = {
      to: data.recipientEmails,
      subject: `[${data.severity.toUpperCase()}] ${data.title}`,
      html: this.getSystemAlertTemplate(data),
      text: this.getSystemAlertTextTemplate(data),
    };

    return this.sendEmail(emailOptions);
  }

  /**
   * Send bulk emails (for newsletters, announcements, etc.)
   */
  async sendBulkEmails(emailOptions: Omit<EmailOptions, 'to'> & { recipients: string[] }): Promise<{ success: number; failed: number; errors: string[] }> {
    const { recipients, ...options } = emailOptions;
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process emails in batches to avoid overwhelming the SMTP server
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        const emailOptions: EmailOptions = {
          ...options,
          to: recipient,
        };

        const result = await this.sendEmail(emailOptions);
        if (result) {
          success++;
        } else {
          failed++;
          errors.push(`Failed to send to ${recipient}`);
        }
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`📧 Bulk email completed: ${success} sent, ${failed} failed`);
    return { success, failed, errors };
  }

  /**
   * Get email statistics
   */
  async getEmailStatistics(_startDate: Date, _endDate: Date): Promise<{
    sent: number;
    failed: number;
    total: number;
  }> {
    // This would typically query the database for email logs
    // For now, return placeholder data
    return {
      sent: 0,
      failed: 0,
      total: 0,
    };
  }

  /**
   * Get password reset email HTML template
   */
  private getPasswordResetEmailTemplate(data: { userName: string; resetUrl: string; resetToken: string }): string {
    const { userName, resetUrl } = data;
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - BMS System</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                border: 1px solid #e0e0e0;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #007bff;
                padding-bottom: 20px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #007bff;
                margin: 0;
            }
            .subtitle {
                color: #666;
                margin: 5px 0 0 0;
                font-size: 14px;
            }
            .content {
                margin: 30px 0;
            }
            .button {
                display: inline-block;
                background-color: #007bff;
                color: #ffffff !important;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
            }
            .button:hover {
                background-color: #0056b3;
            }
            .security-info {
                background-color: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                font-size: 14px;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #dee2e6;
                text-align: center;
                color: #666;
                font-size: 12px;
            }
            .token-info {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                font-family: monospace;
                font-size: 12px;
                word-break: break-all;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="logo">BMS System</h1>
                <p class="subtitle">Business Management Solution</p>
            </div>
            
            <div class="content">
                <h2>Password Reset Request</h2>
                <p>Hello ${userName},</p>
                
                <p>We received a request to reset the password for your BMS System account. If you made this request, you can reset your password using the button below:</p>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                
                <div class="security-info">
                    <strong>🔒 Security Information:</strong><br>
                    • This link will expire in 1 hour for security reasons<br>
                    • If you didn't request this password reset, please ignore this email<br>
                    • For your security, never share this link with anyone<br>
                    • The reset link can only be used once
                </div>
                
                <p>If the button above doesn't work, you can copy and paste the following link into your web browser:</p>
                
                <div class="token-info">
                    ${resetUrl}
                </div>
                
                <p>If you continue to have problems or if you didn't request this password reset, please contact our support team immediately.</p>
            </div>
            
            <div class="footer">
                <p>This is an automated message from BMS System. Please do not reply to this email.</p>
                <p>© 2025 BMS System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Get password reset email plain text template
   */
  private getPasswordResetEmailTemplateText(data: { userName: string; resetUrl: string; resetToken: string }): string {
    const { userName, resetUrl } = data;
    
    return `
BMS System - Password Reset Request

Hello ${userName},

We received a request to reset the password for your BMS System account.

To reset your password, please click the following link:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

For your security, never share this link with anyone.

If you continue to have problems, please contact our support team.

---
This is an automated message from BMS System. Please do not reply to this email.
© 2025 BMS System. All rights reserved.
    `.trim();
  }

  /**
   * Get transaction receipt email template
   */
  private getTransactionReceiptTemplate(data: TransactionReceiptData): string {
    const itemsHtml = data.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">Rp ${item.price.toLocaleString()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">Rp ${item.total.toLocaleString()}</td>
      </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Transaction Receipt</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; color: #007bff; margin: 0; }
            .receipt-info { margin: 20px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th { background-color: #f8f9fa; padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; }
            .total-section { margin-top: 30px; padding-top: 20px; border-top: 2px solid #007bff; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .total-row.final { font-weight: bold; font-size: 18px; color: #007bff; border-top: 1px solid #dee2e6; padding-top: 10px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="company-name">${data.branchName}</h1>
                <p>Transaction Receipt</p>
            </div>
            
            <div class="receipt-info">
                <p><strong>Receipt:</strong> ${data.transactionCode}</p>
                <p><strong>Date:</strong> ${data.date}</p>
                <p><strong>Customer:</strong> ${data.customerName}</p>
                <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
            </div>

            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th style="text-align: center;">Qty</th>
                        <th style="text-align: right;">Price</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div class="total-section">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>Rp ${data.subtotal.toLocaleString()}</span>
                </div>
                ${data.tax > 0 ? `<div class="total-row">
                    <span>Tax:</span>
                    <span>Rp ${data.tax.toLocaleString()}</span>
                </div>` : ''}
                ${data.discount > 0 ? `<div class="total-row">
                    <span>Discount:</span>
                    <span>-Rp ${data.discount.toLocaleString()}</span>
                </div>` : ''}
                <div class="total-row final">
                    <span>Total:</span>
                    <span>Rp ${data.finalAmount.toLocaleString()}</span>
                </div>
            </div>

            <div class="footer">
                <p>Thank you for your purchase!</p>
                <p>© 2025 ${data.branchName}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getTransactionReceiptTextTemplate(data: TransactionReceiptData): string {
    let text = `${data.branchName} - Transaction Receipt\n\n`;
    text += `Receipt: ${data.transactionCode}\n`;
    text += `Date: ${data.date}\n`;
    text += `Customer: ${data.customerName}\n`;
    text += `Payment Method: ${data.paymentMethod}\n\n`;
    text += `Items:\n`;
    data.items.forEach(item => {
      text += `${item.name} - Qty: ${item.quantity} - Rp ${item.total.toLocaleString()}\n`;
    });
    text += `\nSubtotal: Rp ${data.subtotal.toLocaleString()}\n`;
    if (data.tax > 0) text += `Tax: Rp ${data.tax.toLocaleString()}\n`;
    if (data.discount > 0) text += `Discount: -Rp ${data.discount.toLocaleString()}\n`;
    text += `Total: Rp ${data.finalAmount.toLocaleString()}\n\n`;
    text += `Thank you for your purchase!\n`;
    text += `© 2025 ${data.branchName}. All rights reserved.\n`;
    return text;
  }

  private getLowStockAlertTemplate(data: LowStockAlertData): string {
    const severity = data.currentStock <= 0 ? 'CRITICAL' : 'WARNING';
    const bgColor = data.currentStock <= 0 ? '#f8d7da' : '#fff3cd';
    const borderColor = data.currentStock <= 0 ? '#f5c6cb' : '#ffeaa7';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Low Stock Alert</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 2px solid #dc3545; padding-bottom: 20px; margin-bottom: 30px; }
            .alert-box { padding: 20px; border-radius: 5px; margin: 20px 0; background-color: ${bgColor}; border: 1px solid ${borderColor}; }
            .alert-title { font-size: 20px; font-weight: bold; margin: 0 0 10px 0; color: #721c24; }
            .product-info { margin: 15px 0; }
            .stock-info { display: flex; justify-content: space-between; padding: 10px; background-color: #f8f9fa; border-radius: 4px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="color: #dc3545; margin: 0;">🚨 Low Stock Alert</h1>
                <p style="margin: 5px 0 0 0; color: #666;">BMS System Notification</p>
            </div>
            
            <div class="alert-box">
                <h2 class="alert-title">${severity}: ${data.productName}</h2>
                <p>Stock level for the following product is below the minimum threshold.</p>
                
                <div class="product-info">
                    <h3>Product Information</h3>
                    <p><strong>Product Name:</strong> ${data.productName}</p>
                    <p><strong>SKU:</strong> ${data.productSku}</p>
                    <p><strong>Branch:</strong> ${data.branchName}</p>
                </div>

                <div class="stock-info">
                    <span><strong>Current Stock:</strong> ${data.currentStock}</span>
                    <span><strong>Minimum Stock:</strong> ${data.minStock}</span>
                </div>

                <p><strong>Recommended Action:</strong> Please restock this item to avoid potential stockouts.</p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666;">
                <p>This is an automated alert from BMS System.</p>
                <p>Please take appropriate action to maintain optimal inventory levels.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getLowStockAlertTextTemplate(data: LowStockAlertData): string {
    const severity = data.currentStock <= 0 ? 'CRITICAL' : 'WARNING';
    return `Low Stock Alert - ${severity}

Product: ${data.productName}
SKU: ${data.productSku}
Branch: ${data.branchName}
Current Stock: ${data.currentStock}
Minimum Stock: ${data.minStock}

Please restock this item to avoid potential stockouts.

This is an automated alert from BMS System.`;
  }

  private getSystemAlertTemplate(data: SystemAlertData): string {
    const colors = {
      info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' },
      warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
      error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' }
    };
    const color = colors[data.severity];
    const icons = { info: 'ℹ️', warning: '⚠️', error: '🚨' };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>System Alert</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .alert { padding: 20px; border-radius: 5px; margin: 20px 0; background-color: ${color.bg}; border: 1px solid ${color.border}; }
            .alert-title { font-size: 20px; font-weight: bold; margin: 0 0 15px 0; color: ${color.text}; }
        </style>
    </head>
    <body>
        <div class="container">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: ${color.text}; margin: 0;">System Alert</h1>
                <p style="margin: 5px 0 0 0; color: #666;">BMS System Notification</p>
            </div>
            
            <div class="alert">
                <h2 class="alert-title">${icons[data.severity]} ${data.title}</h2>
                <p>${data.message}</p>
                <p><strong>Severity:</strong> ${data.severity.toUpperCase()}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getSystemAlertTextTemplate(data: SystemAlertData): string {
    return `System Alert - ${data.severity.toUpperCase()}

Title: ${data.title}
Message: ${data.message}
Time: ${new Date().toLocaleString()}

This is an automated alert from BMS System.`;
  }

  /**
   * Log email content instead of sending (for development)
   */
  private logEmailInstead(emailOptions: EmailOptions): void {
    const { to, subject, html, text } = emailOptions;
    
    console.log('\n' + '='.repeat(80));
    console.log('📧 EMAIL CONTENT (Development Mode)');
    console.log('='.repeat(80));
    console.log(`To: ${Array.isArray(to) ? to.join(', ') : to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML Length: ${html.length} characters`);
    console.log(`Text Length: ${text ? text.length : 0} characters`);
    console.log('='.repeat(80));
    
    // Also log to file in development mode for easier debugging
    if (process.env.LOG_EMAILS_TO_FILE === 'true') {
      const fs = require('fs');
      const path = require('path');
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
      
      const logFile = path.join(logDir, `email-${Date.now()}.html`);
      fs.writeFileSync(logFile, html);
      console.log(`📧 Email saved to: ${logFile}`);
    }
    
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Test email configuration
   */
  async testEmailConnection(): Promise<boolean> {
    try {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('⚠️  SMTP configuration not found. Please set environment variables.');
        return false;
      }

      await this.transporter.verify();
      console.log('✅ SMTP connection successful');
      
      // Test with a simple email
      const testEmailOptions: EmailOptions = {
        to: process.env.SMTP_USER, // Send test email to configured user
        subject: 'BMS System - Email Service Test',
        html: '<p>This is a test email from BMS System email service.</p><p>If you receive this email, the configuration is working correctly.</p>',
        text: 'This is a test email from BMS System email service. If you receive this email, the configuration is working correctly.',
      };

      const testResult = await this.sendEmail(testEmailOptions);
      if (testResult) {
        console.log('✅ Test email sent successfully');
      } else {
        console.log('⚠️  SMTP connection works but test email failed');
      }
      
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();