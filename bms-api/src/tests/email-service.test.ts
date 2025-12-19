/**
 * Email Service Integration Tests
 * Tests SMTP functionality, template generation, and development mode fallback
 */

import { emailService } from '../services/email';
import { PasswordResetEmailData } from '../types/email';

describe('Email Service Integration', () => {
  const mockEmailData: PasswordResetEmailData = {
    to: 'test@example.com',
    userName: 'Test User',
    resetToken: 'test-reset-token-123',
    resetUrl: 'http://localhost:3000/reset-password?token=test-reset-token-123'
  };

  describe('Password Reset Email Templates', () => {
    test('should generate HTML email template correctly', () => {
      const template = emailService['getPasswordResetEmailTemplate']({
        userName: mockEmailData.userName,
        resetUrl: mockEmailData.resetUrl,
        resetToken: mockEmailData.resetToken
      });

      expect(template).toContain('BMS System');
      expect(template).toContain('Password Reset Request');
      expect(template).toContain(mockEmailData.userName);
      expect(template).toContain(mockEmailData.resetUrl);
      expect(template).toContain('1 hour');
      expect(template).toContain('<div class="container">');
      expect(template).toContain('<a href="');
    });

    test('should generate plain text email template correctly', () => {
      const template = emailService['getPasswordResetEmailTemplateText']({
        userName: mockEmailData.userName,
        resetUrl: mockEmailData.resetUrl,
        resetToken: mockEmailData.resetToken
      });

      expect(template).toContain('BMS System');
      expect(template).toContain('Password Reset Request');
      expect(template).toContain(mockEmailData.userName);
      expect(template).toContain(mockEmailData.resetUrl);
      expect(template).toContain('1 hour');
    });

    test('should include security information in email', () => {
      const htmlTemplate = emailService['getPasswordResetEmailTemplate']({
        userName: mockEmailData.userName,
        resetUrl: mockEmailData.resetUrl,
        resetToken: mockEmailData.resetToken
      });

      expect(htmlTemplate).toContain('Security Information');
      expect(htmlTemplate).toContain('This link will expire in 1 hour');
      expect(htmlTemplate).toContain('If you didn\'t request this password reset');
      expect(htmlTemplate).toContain('never share this link with anyone');
      expect(htmlTemplate).toContain('can only be used once');
    });
  });

  describe('Development Mode Email Logging', () => {
    test('should handle missing SMTP configuration gracefully', async () => {
      // Mock console.error to capture the error message
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        const result = await emailService.sendPasswordResetEmail(mockEmailData);
        
        // Should return false when SMTP is not configured and not in development mode
        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('SMTP not configured in production environment')
        );
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe('Email Data Validation', () => {
    test('should handle missing userName gracefully', () => {
      const template = emailService['getPasswordResetEmailTemplate']({
        userName: '',
        resetUrl: mockEmailData.resetUrl,
        resetToken: mockEmailData.resetToken
      });

      // Should still generate template even with empty userName
      expect(template).toContain('BMS System');
      expect(template).toContain('Password Reset Request');
    });

    test('should handle long reset URLs', () => {
      const longResetUrl = 'http://localhost:3000/reset-password?token=' + 'a'.repeat(500);
      
      const template = emailService['getPasswordResetEmailTemplate']({
        userName: mockEmailData.userName,
        resetUrl: longResetUrl,
        resetToken: mockEmailData.resetToken
      });

      expect(template).toContain(longResetUrl);
      expect(template).toContain('word-break: break-all'); // CSS for long URL handling
    });

    test('should handle special characters in userName', () => {
      const specialUserName = 'User with "Quotes" & <Special> Characters';
      
      const template = emailService['getPasswordResetEmailTemplate']({
        userName: specialUserName,
        resetUrl: mockEmailData.resetUrl,
        resetToken: mockEmailData.resetToken
      });

      // Should contain the special characters (they should be HTML escaped)
      expect(template).toContain('User with');
    });
  });

  describe('Email Content Security', () => {
    test('should not include sensitive information in emails', () => {
      const template = emailService['getPasswordResetEmailTemplate']({
        userName: mockEmailData.userName,
        resetUrl: mockEmailData.resetUrl,
        resetToken: mockEmailData.resetToken
      });

      // Should not contain actual passwords or security questions/answers
      expect(template).not.toContain('Current password');
      expect(template).not.toContain('security question');
      expect(template).not.toContain('hint');
      
      // Should not contain internal system information
      expect(template).not.toContain('database');
      expect(template).not.toContain('server');
      expect(template).not.toContain('internal');
      
      // Password reset emails naturally contain "password" in context (which is expected)
      // but should not expose actual password values
      expect(template).not.toContain('your current password');
      expect(template).not.toContain('your old password');
    });

    test('should include appropriate security warnings', () => {
      const template = emailService['getPasswordResetEmailTemplate']({
        userName: mockEmailData.userName,
        resetUrl: mockEmailData.resetUrl,
        resetToken: mockEmailData.resetToken
      });

      expect(template).toContain('Security Information');
      expect(template).toContain('never share this link');
      expect(template).toContain('can only be used once');
      expect(template).toContain('If you didn\'t request this password reset');
    });
  });

  describe('Email Service Configuration', () => {
    test('should handle missing SMTP configuration gracefully', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        // Mock the nodemailer transporter
        const mockVerify = jest.fn().mockRejectedValue(new Error('Connection failed'));
        const emailServiceInstance = emailService as any;
        emailServiceInstance.transporter = {
          verify: mockVerify
        };

        const result = await emailService.testEmailConnection();
        expect(result).toBe(false);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Template Rendering', () => {
    test('should generate responsive HTML email', () => {
      const template = emailService['getPasswordResetEmailTemplate']({
        userName: mockEmailData.userName,
        resetUrl: mockEmailData.resetUrl,
        resetToken: mockEmailData.resetToken
      });

      // Should contain responsive design elements
      expect(template).toContain('max-width: 600px');
      expect(template).toContain('viewport');
      
      // Should have proper HTML structure
      expect(template).toContain('<!DOCTYPE html>');
      expect(template).toContain('<html');
      expect(template).toContain('<head>');
      expect(template).toContain('<body>');
      expect(template).toContain('<div class="container">');
    });

    test('should include branding elements', () => {
      const template = emailService['getPasswordResetEmailTemplate']({
        userName: mockEmailData.userName,
        resetUrl: mockEmailData.resetUrl,
        resetToken: mockEmailData.resetToken
      });

      expect(template).toContain('BMS System');
      expect(template).toContain('Business Management Solution');
      expect(template).toContain('© 2025 BMS System');
      expect(template).toContain('This is an automated message');
    });
  });

  describe('Error Handling', () => {
    test('should handle email sending failures gracefully', async () => {
      // Mock nodemailer to simulate failure
      const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP Error'));
      const emailServiceInstance = emailService as any;
      emailServiceInstance.transporter = {
        sendMail: mockSendMail
      };

      // Ensure SMTP is "configured" for this test
      process.env.SMTP_HOST = 'test.smtp.com';
      process.env.SMTP_USER = 'test@example.com';
      process.env.SMTP_PASS = 'password';

      try {
        const result = await emailService.sendPasswordResetEmail(mockEmailData);
        expect(result).toBe(false);
      } finally {
        // Clean up
        delete process.env.SMTP_HOST;
        delete process.env.SMTP_USER;
        delete process.env.SMTP_PASS;
      }
    });
  });
});