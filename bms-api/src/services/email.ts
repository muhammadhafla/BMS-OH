import nodemailer from 'nodemailer';
import { PasswordResetEmailData } from '../types/email';

class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.SMTP_FROM || 'BMS System <noreply@bms.com>';
    
    // Create transporter based on environment
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.NODE_ENV === 'production', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });

    // Log SMTP configuration status (without sensitive data)
    console.log('📧 Email Service Configuration:');
    console.log(`  Host: ${process.env.SMTP_HOST || 'Not configured'}`);
    console.log(`  Port: ${process.env.SMTP_PORT || '587'}`);
    console.log(`  From: ${this.fromEmail}`);
    console.log(`  User: ${process.env.SMTP_USER || 'Not configured'}`);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(emailData: PasswordResetEmailData): Promise<boolean> {
    try {
      const { to, resetToken, userName, resetUrl } = emailData;

      // Check if SMTP is configured
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️  SMTP not configured, logging email instead of sending');
        this.logEmailInstead(emailData);
        return true; // Return true for development mode
      }

      const mailOptions = {
        from: this.fromEmail,
        to,
        subject: 'Password Reset Request - BMS System',
        html: this.getPasswordResetEmailTemplate({
          userName,
          resetUrl,
          resetToken,
        }),
        text: this.getPasswordResetEmailTemplateText({
          userName,
          resetUrl,
          resetToken,
        }),
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent successfully to ${to}`);
      console.log(`📧 Message ID: ${info.messageId}`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Get password reset email HTML template
   */
  private getPasswordResetEmailTemplate(data: {
    userName: string;
    resetUrl: string;
    resetToken: string;
  }): string {
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
  private getPasswordResetEmailTemplateText(data: {
    userName: string;
    resetUrl: string;
    resetToken: string;
  }): string {
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
   * Log email content instead of sending (for development)
   */
  private logEmailInstead(emailData: PasswordResetEmailData): void {
    const { to, resetToken, userName, resetUrl } = emailData;
    
    console.log('\n' + '='.repeat(80));
    console.log('📧 EMAIL CONTENT (Development Mode)');
    console.log('='.repeat(80));
    console.log(`To: ${to}`);
    console.log(`Subject: Password Reset Request - BMS System`);
    console.log(`User: ${userName}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Reset Token: ${resetToken}`);
    console.log(`Expires: 1 hour from now`);
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
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();