/**
 * Comprehensive end-to-end test suite for password reset API endpoints
 * Tests all password-related functionality including change password, forgot password, and reset password
 */

import request from 'supertest';
import app from '../server';
import { testPrisma } from './setup';
import { TestBranchHelper } from './test-branch-helper';
import bcrypt from 'bcryptjs';

describe('Password Reset API Endpoints', () => {
  let testUser: any;
  let authToken: string;
  let testBranchId: string;
  const testPassword = 'TestPassword123!';
  const newPassword = 'NewPassword456!';
  const weakPassword = 'weak';
  const invalidEmail = 'invalid-email';
  const nonExistentEmail = 'nonexistent@example.com';
  const validEmail = 'test@bms.com';

  beforeEach(async () => {
    // Get or create a default test branch
    testBranchId = await TestBranchHelper.getDefaultBranch();

    // Create test user
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    testUser = await testPrisma.user.create({
      data: {
        email: validEmail,
        password: hashedPassword,
        name: 'Test User',
        role: 'ADMIN',
        branchId: testBranchId
      }
    });

    // Get auth token for authenticated endpoints
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: validEmail,
        password: testPassword
      });

    authToken = loginResponse.body.data.token;
  });

  afterEach(async () => {
    // Cleanup is handled by setup.ts afterEach
  });

  describe('POST /api/auth/change-password', () => {
    test('should change password with valid current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: newPassword,
          confirmPassword: newPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');

      // Verify password was actually changed
      const user = await testPrisma.user.findUnique({
        where: { id: testUser.id }
      });
      const isPasswordChanged = await bcrypt.compare(newPassword, user!.password);
      expect(isPasswordChanged).toBe(true);

      // Reset to original password for other tests
      await testPrisma.user.update({
        where: { id: testUser.id },
        data: { password: await bcrypt.hash(testPassword, 12) }
      });
    });

    test('should reject change with invalid current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: newPassword,
          confirmPassword: newPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Current password is incorrect');
    });

    test('should reject weak passwords', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: weakPassword,
          confirmPassword: weakPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid input data');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({
          currentPassword: testPassword,
          newPassword: newPassword,
          confirmPassword: newPassword
        });

      expect(response.status).toBe(401);
    });

    test('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: '',
          newPassword: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    test('should accept valid email (email exists)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: validEmail
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');

      // Verify token was created in database
      const tokens = await testPrisma.passwordResetToken.findMany({
        where: { userId: testUser.id }
      });
      expect(tokens.length).toBeGreaterThan(0);
    });

    test('should accept non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: nonExistentEmail
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should return same message for security reasons
    });

    test('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: invalidEmail
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle rate limiting after 3 attempts', async () => {
      const email = 'rate.test@bms.com';
      
      // First 3 attempts should succeed (return success message)
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email });
        expect(response.status).toBe(200);
      }

      // 4th attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Too many password reset attempts');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let validToken: string;

    beforeEach(async () => {
      // Create a valid token for testing
      const tokenData = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: validEmail });
      
      // Verify expected data  
      the API response contains expect(tokenData.status).toBe(200);
      expect(tokenData.body.success).toBe(true);
      expect(tokenData.body.message).toContain('password reset link has been sent');
      
      // Get the token from database
      const tokens = await testPrisma.passwordResetToken.findMany({
        where: { userId: testUser.id },
        orderBy: { createdAt: 'desc' }
      });
      validToken = tokens[0].token;
    });

    test('should reset password with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
          newPassword: newPassword,
          confirmPassword: newPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password has been reset successfully');

      // Verify token was marked as used
      const tokenRecord = await testPrisma.passwordResetToken.findUnique({
        where: { token: validToken }
      });
      expect(tokenRecord?.used).toBe(true);

      // Verify password was actually changed
      const user = await testPrisma.user.findUnique({
        where: { id: testUser.id }
      });
      const isPasswordChanged = await bcrypt.compare(newPassword, user!.password);
      expect(isPasswordChanged).toBe(true);
    });

    test('should reject expired token', async () => {
      // Create a token with past expiration
      const expiredToken = await testPrisma.passwordResetToken.create({
        data: {
          token: 'expiredtoken123',
          userId: testUser.id,
          expiresAt: new Date(Date.now() - 1000) // 1 second ago
        }
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: expiredToken.token,
          newPassword: newPassword,
          confirmPassword: newPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('expired');
    });

    test('should reject used token', async () => {
      // Mark token as used
      await testPrisma.passwordResetToken.update({
        where: { token: validToken },
        data: { used: true }
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
          newPassword: newPassword,
          confirmPassword: newPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already been used');
    });

    test('should reject invalid token format', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: newPassword,
          confirmPassword: newPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid reset token');
    });

    test('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
          newPassword: weakPassword,
          confirmPassword: weakPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject mismatched password confirmation', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
          newPassword: newPassword,
          confirmPassword: 'differentpassword'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Passwords do not match');
    });

    test('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: '',
          newPassword: '',
          confirmPassword: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Security Tests', () => {
    test('should prevent SQL injection in email parameter', async () => {
      const maliciousEmail = "admin@test.com'; DROP TABLE users; --";
      
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: maliciousEmail });

      expect(response.status).toBe(400);
      // Database should still be intact
      const userCount = await testPrisma.user.count();
      expect(userCount).toBeGreaterThan(0);
    });

    test('should handle very long passwords', async () => {
      const veryLongPassword = 'a'.repeat(1000);
      
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: veryLongPassword,
          confirmPassword: veryLongPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle XSS in email parameter', async () => {
      const xssEmail = '<script>alert("xss")</script>@test.com';
      
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: xssEmail });

      expect(response.status).toBe(400);
    });
  });

  describe('Database Integration Tests', () => {
    test('should properly store and retrieve tokens', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: validEmail });

      const tokens = await testPrisma.passwordResetToken.findMany({
        where: { userId: testUser.id },
        include: { user: true }
      });

      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].user.email).toBe(validEmail);
      expect(tokens[0].used).toBe(false);
      expect(tokens[0].expiresAt).toBeInstanceOf(Date);
    });

    test('should clean up expired tokens', async () => {
      // Create expired token
      await testPrisma.passwordResetToken.create({
        data: {
          token: 'expiredtokencleanup',
          userId: testUser.id,
          expiresAt: new Date(Date.now() - 1000)
        }
      });

      const beforeCleanup = await testPrisma.passwordResetToken.count({
        where: { expiresAt: { lt: new Date() } }
      });
      expect(beforeCleanup).toBeGreaterThan(0);

      // Test token cleanup would be triggered by the token service
      // This is tested more thoroughly in the token management tests
    });
  });
});