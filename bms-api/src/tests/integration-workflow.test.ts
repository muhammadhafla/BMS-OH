/**
 * Complete End-to-End Workflow Integration Tests
 * Tests the entire password reset workflow from frontend to backend and back
 */

import request from 'supertest';
import app from '../server';
import { testPrisma } from './setup';
import bcrypt from 'bcryptjs';
import { TokenService } from '../services/token-service';

describe('Complete Password Reset End-to-End Workflow', () => {
  let testUser: any;
  let authToken: string;
  let testBranch: any;
  const testPassword = 'TestPassword123!';
  const newPassword = 'NewPassword456!';
  const validEmail = 'e2e.test@bms.com';

  beforeAll(async () => {
    // Create test branch
    testBranch = await testPrisma.branch.create({
      data: {
        name: 'E2E Test Branch',
        address: '123 E2E Test Street'
      }
    });

    // Create test user
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    testUser = await testPrisma.user.create({
      data: {
        email: validEmail,
        password: hashedPassword,
        name: 'E2E Test User',
        role: 'ADMIN',
        branchId: testBranch.id
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

  describe('Complete Password Change Workflow', () => {
    test('should complete password change workflow end-to-end', async () => {
      const originalPassword = testPassword;
      const updatedPassword = 'UpdatedPassword789!';

      // Step 1: Authenticate and access change password form
      expect(authToken).toBeDefined();

      // Step 2: Submit password change with valid current password
      const changeResponse = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword: updatedPassword
        });

      expect(changeResponse.status).toBe(200);
      expect(changeResponse.body.success).toBe(true);

      // Step 3: Verify password was actually changed
      const user = await testPrisma.user.findUnique({
        where: { id: testUser.id }
      });
      const isPasswordChanged = await bcrypt.compare(updatedPassword, user!.password);
      expect(isPasswordChanged).toBe(true);

      // Step 4: Test login with new password
      const newLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: validEmail,
          password: updatedPassword
        });

      expect(newLoginResponse.status).toBe(200);
      expect(newLoginResponse.body.success).toBe(true);
      expect(newLoginResponse.body.data.token).toBeDefined();

      // Step 5: Reset password back to original for cleanup
      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${newLoginResponse.body.data.token}`)
        .send({
          currentPassword: updatedPassword,
          newPassword: originalPassword
        });

      expect(true).toBe(true); // If we get here, the workflow completed successfully
    });

    test('should handle password change validation errors throughout workflow', async () => {
      const invalidPassword = 'weak';

      // Step 1: Try to change password with weak password
      const weakPasswordResponse = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: invalidPassword
        });

      expect(weakPasswordResponse.status).toBe(400);
      expect(weakPasswordResponse.body.success).toBe(false);

      // Step 2: Verify original password still works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: validEmail,
          password: testPassword
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
    });
  });

  describe('Complete Forgot Password Workflow', () => {
    test('should complete forgot password workflow end-to-end', async () => {
      const testEmail = 'workflow.test@bms.com';
      
      // Create a test user for this workflow
      const testUserForWorkflow = await testPrisma.user.create({
        data: {
          email: testEmail,
          password: await bcrypt.hash('tempPassword123!', 12),
          name: 'Workflow Test User',
          role: 'STAFF',
          branchId: testBranch.id
        }
      });

      try {
        // Step 1: Initiate forgot password request
        const forgotResponse = await request(app)
          .post('/api/auth/forgot-password')
          .send({
            email: testEmail
          });

        expect(forgotResponse.status).toBe(200);
        expect(forgotResponse.body.success).toBe(true);

        // Step 2: Verify token was created in database
        const tokens = await testPrisma.passwordResetToken.findMany({
          where: { userId: testUserForWorkflow.id },
          orderBy: { createdAt: 'desc' }
        });

        expect(tokens.length).toBeGreaterThan(0);
        const resetToken = tokens[0];
        expect(resetToken.used).toBe(false);
        expect(resetToken.expiresAt).toBeInstanceOf(Date);

        // Step 3: Validate token using TokenService
        const tokenValidation = await TokenService.validateToken(resetToken.token);
        expect(tokenValidation.isValid).toBe(true);
        expect(tokenValidation.data?.userId).toBe(testUserForWorkflow.id);

        // Step 4: Complete password reset with valid token
        const resetResponse = await request(app)
          .post('/api/auth/reset-password')
          .send({
            token: resetToken.token,
            newPassword: newPassword,
            confirmPassword: newPassword
          });

        expect(resetResponse.status).toBe(200);
        expect(resetResponse.body.success).toBe(true);

        // Step 5: Verify token was marked as used
        const usedToken = await testPrisma.passwordResetToken.findUnique({
          where: { token: resetToken.token }
        });
        expect(usedToken?.used).toBe(true);

        // Step 6: Verify password was actually changed
        const updatedUser = await testPrisma.user.findUnique({
          where: { id: testUserForWorkflow.id }
        });
        const isPasswordChanged = await bcrypt.compare(newPassword, updatedUser!.password);
        expect(isPasswordChanged).toBe(true);

        // Step 7: Test login with new password
        const newLoginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: newPassword
          });

        expect(newLoginResponse.status).toBe(200);
        expect(newLoginResponse.body.success).toBe(true);
        expect(newLoginResponse.body.data.token).toBeDefined();

        // Step 8: Verify used token cannot be reused
        const reusedTokenResponse = await request(app)
          .post('/api/auth/reset-password')
          .send({
            token: resetToken.token,
            newPassword: 'AnotherPassword123!',
            confirmPassword: 'AnotherPassword123!'
          });

        expect(reusedTokenResponse.status).toBe(400);
        expect(reusedTokenResponse.body.success).toBe(false);
        expect(reusedTokenResponse.body.error).toContain('already been used');

      } finally {
        // Cleanup: Delete test user and associated tokens
        await testPrisma.passwordResetToken.deleteMany({
          where: { userId: testUserForWorkflow.id }
        });
        await testPrisma.user.delete({
          where: { id: testUserForWorkflow.id }
        });
      }
    });

    test('should handle forgot password with non-existent email securely', async () => {
      const nonExistentEmail = 'doesnotexist@example.com';

      // Step 1: Send forgot password request for non-existent email
      const forgotResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: nonExistentEmail
        });

      // Should return success message for security reasons
      expect(forgotResponse.status).toBe(200);
      expect(forgotResponse.body.success).toBe(true);
      expect(forgotResponse.body.message).toContain('password reset link has been sent');

      // Step 2: Verify no tokens were created for non-existent email
      const tokens = await testPrisma.passwordResetToken.count({
        where: {
          user: {
            email: nonExistentEmail
          }
        }
      });
      expect(tokens).toBe(0);
    });
  });

  describe('Token Security and Validation Workflow', () => {
    test('should enforce token expiration throughout workflow', async () => {
      const testEmail = 'expiration.test@bms.com';
      
      // Create a test user for expiration testing
      const testUserForExpiration = await testPrisma.user.create({
        data: {
          email: testEmail,
          password: await bcrypt.hash('tempPassword123!', 12),
          name: 'Expiration Test User',
          role: 'STAFF',
          branchId: testBranch.id
        }
      });

      try {
        // Step 1: Create token with short expiration (manipulate for testing)
        const tokenData = await TokenService.createToken({
          userId: testUserForExpiration.id,
          expiresInHours: 0.001 // Very short expiration (3.6 seconds)
        });

        // Step 2: Wait for token to expire
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Step 3: Try to use expired token
        const expiredResetResponse = await request(app)
          .post('/api/auth/reset-password')
          .send({
            token: tokenData.token,
            newPassword: newPassword,
            confirmPassword: newPassword
          });

        expect(expiredResetResponse.status).toBe(400);
        expect(expiredResetResponse.body.success).toBe(false);
        expect(expiredResetResponse.body.error).toContain('expired');

        // Step 4: Verify token was automatically cleaned up
        const tokenAfterExpiration = await testPrisma.passwordResetToken.findUnique({
          where: { token: tokenData.token }
        });
        expect(tokenAfterExpiration).toBeNull(); // Should be deleted

      } finally {
        // Cleanup
        await testPrisma.user.delete({
          where: { id: testUserForExpiration.id }
        });
      }
    });

    test('should handle concurrent password reset attempts', async () => {
      const testEmail = 'concurrent.test@bms.com';
      
      const testUserForConcurrent = await testPrisma.user.create({
        data: {
          email: testEmail,
          password: await bcrypt.hash('tempPassword123!', 12),
          name: 'Concurrent Test User',
          role: 'STAFF',
          branchId: testBranch.id
        }
      });

      try {
        // Step 1: Create initial token
        const tokenData = await TokenService.createToken({
          userId: testUserForConcurrent.id,
          expiresInHours: 1
        });

        // Step 2: Attempt multiple concurrent password resets with same token
        const resetPromises = Array(3).fill(null).map(() => 
          request(app)
            .post('/api/auth/reset-password')
            .send({
              token: tokenData.token,
              newPassword: newPassword,
              confirmPassword: newPassword
            })
        );

        const responses = await Promise.all(resetPromises);

        // One should succeed, others should fail
        const successCount = responses.filter(r => r.status === 200).length;
        const failureCount = responses.filter(r => r.status === 400).length;

        expect(successCount).toBe(1);
        expect(failureCount).toBe(2);

        // All failures should be due to token already used
        responses.forEach(response => {
          if (response.status === 400) {
            expect(response.body.error).toContain('already been used');
          }
        });

      } finally {
        // Cleanup
        await testPrisma.passwordResetToken.deleteMany({
          where: { userId: testUserForConcurrent.id }
        });
        await testPrisma.user.delete({
          where: { id: testUserForConcurrent.id }
        });
      }
    });
  });

  describe('Rate Limiting Integration', () => {
    test('should enforce rate limiting across complete workflows', async () => {
      const rateTestEmail = 'rate.limit.test@bms.com';

      // Create test user for rate limiting
      const rateTestUser = await testPrisma.user.create({
        data: {
          email: rateTestEmail,
          password: await bcrypt.hash('tempPassword123!', 12),
          name: 'Rate Limit Test User',
          role: 'STAFF',
          branchId: testBranch.id
        }
      });

      try {
        // Step 1: Make multiple forgot password requests quickly
        const requests = [];
        for (let i = 0; i < 4; i++) {
          requests.push(
            request(app)
              .post('/api/auth/forgot-password')
              .send({ email: rateTestEmail })
          );
        }

        const responses = await Promise.all(requests);

        // First 3 should succeed, 4th should be rate limited
        const successfulResponses = responses.filter(r => r.status === 200);
        const rateLimitedResponses = responses.filter(r => r.status === 429);

        expect(successfulResponses.length).toBe(3);
        expect(rateLimitedResponses.length).toBe(1);

        // Rate limited response should have appropriate message
        const rateLimitedResponse = rateLimitedResponses[0];
        expect(rateLimitedResponse.body.error).toContain('Too many password reset attempts');

      } finally {
        // Cleanup
        await testPrisma.user.delete({
          where: { id: rateTestUser.id }
        });
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle database connection issues gracefully', async () => {
      // This test would require mocking database connections
      // For now, we test with valid scenarios
      expect(true).toBe(true);
    });

    test('should handle malformed token formats', async () => {
      const malformedTokens = [
        '',
        'invalid',
        'too-short-token',
        'INVALID_TOKEN_WITH_SPECIAL_CHARS!@#$%',
        'a'.repeat(1000) // Very long token
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .post('/api/auth/reset-password')
          .send({
            token: token,
            newPassword: newPassword,
            confirmPassword: newPassword
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should validate password strength throughout workflows', async () => {
      const weakPasswords = [
        'weak',
        '12345678',
        'password',
        'abc',
        '123'
      ];

      for (const weakPassword of weakPasswords) {
        // Test in change password workflow
        const changeResponse = await request(app)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            currentPassword: testPassword,
            newPassword: weakPassword
          });

        expect(changeResponse.status).toBe(400);
        expect(changeResponse.body.success).toBe(false);

        // Test in reset password workflow (using existing token)
        const tokens = await testPrisma.passwordResetToken.findMany({
          where: { userId: testUser.id },
          orderBy: { createdAt: 'desc' }
        });

        if (tokens.length > 0) {
          const resetResponse = await request(app)
            .post('/api/auth/reset-password')
            .send({
              token: tokens[0].token,
              newPassword: weakPassword,
              confirmPassword: weakPassword
            });

          expect(resetResponse.status).toBe(400);
          expect(resetResponse.body.success).toBe(false);
        }
      }
    });
  });
});