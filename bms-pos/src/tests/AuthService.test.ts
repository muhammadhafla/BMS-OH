/**
 * AuthService Tests
 * Tests for secure authentication service
 */

import { authService } from '../services/AuthService'
import { sessionManager } from '../services/SessionManager'
import { configService } from '../services/ConfigService'
import { createMockUser, createMockApiResponse } from './setup'

// Suppress unused variable warnings
void configService
void createMockApiResponse

// Mock the dependencies
jest.mock('../services/ConfigService')
jest.mock('../services/SessionManager')
jest.mock('../services/ApiService')

// Add global to window for test environment
(global as any).global = global

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sessionManager.clearSession()

    // Mock successful backend login
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          token: 'backend-jwt-token',
          user: createMockUser({ id: '123', username: 'testuser' }),
        },
      }),
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should login successfully with backend API', async () => {
      const credentials = { username: 'testuser', password: 'password123' }

      const result = await authService.login(credentials)

      expect(result.success).toBe(true)
      expect(result.user).toBeTruthy()
      expect(result.token).toBe('backend-jwt-token')
      expect(result.user?.username).toBe('testuser')
    })

    it('should fallback to mock authentication when backend fails', async () => {
      // Mock backend failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      const credentials = { username: 'admin', password: 'admin123' }

      const result = await authService.login(credentials)

      expect(result.success).toBe(true)
      expect(result.user).toBeTruthy()
      expect(result.token).toBeTruthy()
      expect(result.user?.username).toBe('admin')
    })

    it('should handle invalid credentials', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      const credentials = { username: 'admin', password: 'wrongpassword' }

      const result = await authService.login(credentials)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid username or password')
      expect(result.remainingAttempts).toBeLessThan(5)
    })

    it('should handle rate limiting', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      // Simulate multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await authService.login({ username: 'admin', password: 'wrong' })
      }

      const result = await authService.login({ username: 'admin', password: 'admin123' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Too many failed attempts')
    })
  })

  describe('Session Management', () => {
    it('should get current user when authenticated', async () => {
      // Setup authenticated session
      sessionManager.storeSession('123', 'valid-token')

      const user = authService.getCurrentUser()
      expect(user).toBeTruthy()
    })

    it('should return null when not authenticated', () => {
      sessionManager.clearSession()

      const user = authService.getCurrentUser()
      expect(user).toBeNull()
    })

    it('should check authentication status', async () => {
      sessionManager.storeSession('123', 'valid-token')

      expect(authService.isAuthenticated()).toBe(true)

      sessionManager.clearSession()
      expect(authService.isAuthenticated()).toBe(false)
    })

    it('should validate session', () => {
      sessionManager.storeSession('123', 'valid-token')

      expect(authService.validateSession()).toBe(true)
    })

    it('should logout properly', async () => {
      sessionManager.storeSession('123', 'valid-token')

      authService.logout()

      expect(authService.isAuthenticated()).toBe(false)
    })
  })

  describe('Permission Management', () => {
    it('should check user permissions', () => {
      const adminUser = createMockUser({ role: 'admin', permissions: ['all'] })
      const cashierUser = createMockUser({
        role: 'cashier',
        permissions: ['view_products', 'create_transaction'],
      })

      expect(authService.hasPermission(adminUser, 'any_permission')).toBe(true)
      expect(authService.hasPermission(cashierUser, 'view_products')).toBe(true)
      expect(authService.hasPermission(cashierUser, 'admin_only')).toBe(false)
      expect(authService.hasPermission(null, 'any_permission')).toBe(false)
    })

    it('should handle inactive users', () => {
      const inactiveUser = createMockUser({ isActive: false })

      expect(authService.hasPermission(inactiveUser, 'any_permission')).toBe(false)
    })
  })

  describe('Security Features', () => {
    it('should provide security statistics', () => {
      const stats = authService.getSecurityStats()

      expect(stats).toEqual(
        expect.objectContaining({
          sessionValid: false,
          sessionStats: expect.objectContaining({
            isValid: false,
            canAttemptLogin: true,
          }),
          remainingAttempts: 5,
          canAttemptLogin: true,
          secureMode: expect.any(Boolean),
        }),
      )
    })

    it('should detect secure mode', () => {
      expect(authService.isSecureMode()).toBe(true) // Default behavior
    })

    it('should handle token refresh', async () => {
      sessionManager.storeSession('123', 'valid-token', 'refresh-token')

      // Mock successful refresh
      jest.spyOn(sessionManager, 'refreshToken').mockResolvedValue(true)

      const isValid = await authService.validateSessionAsync()
      expect(isValid).toBe(true)
    })
  })

  describe('Legacy Compatibility', () => {
    it('should save session for compatibility', () => {
      const user = createMockUser()
      const token = 'legacy-token'

      authService.saveSession(user, token)

      // Should store in session manager
      expect(sessionManager.getSession()).toBeTruthy()
    })

    it('should validate legacy sessions', () => {
      sessionManager.storeSession('123', 'valid-token')

      expect(authService.validateSession()).toBe(true)
    })
  })

  describe('Mock Authentication', () => {
    beforeEach(() => {
      // Ensure backend is unavailable for mock tests
      global.fetch = jest.fn().mockRejectedValue(new Error('Backend unavailable'))
    })

    it('should authenticate with default admin credentials', async () => {
      const result = await authService.login({ username: 'admin', password: 'admin123' })

      expect(result.success).toBe(true)
      expect(result.user?.username).toBe('admin')
      expect(result.user?.role).toBe('admin')
    })

    it('should authenticate with default cashier credentials', async () => {
      const result = await authService.login({ username: 'cashier1', password: 'cashier123' })

      expect(result.success).toBe(true)
      expect(result.user?.username).toBe('cashier1')
      expect(result.user?.role).toBe('cashier')
    })

    it('should authenticate with default manager credentials', async () => {
      const result = await authService.login({ username: 'manager1', password: 'manager123' })

      expect(result.success).toBe(true)
      expect(result.user?.username).toBe('manager1')
      expect(result.user?.role).toBe('manager')
    })

    it('should reject invalid mock credentials', async () => {
      const result = await authService.login({ username: 'admin', password: 'wrongpassword' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid username or password')
    })

    it('should reject inactive users in mock mode', async () => {
      // This would require mocking the user as inactive
      const result = await authService.login({ username: 'inactive', password: 'password' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Account is inactive or not found')
    })

    it('should update last login on successful mock authentication', async () => {
      const beforeLogin = new Date().toISOString()

      await authService.login({ username: 'admin', password: 'admin123' })

      const user = authService.getCurrentUser()
      expect(user?.lastLogin).toBeTruthy()
      expect(user?.lastLogin).not.toBe(beforeLogin)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      const result = await authService.login({ username: 'admin', password: 'admin123' })

      expect(result.success).toBe(true) // Should fallback to mock
      expect(result.user?.username).toBe('admin') // Should fallback to mock auth
    })

    it('should handle malformed responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: null, // Malformed response
        }),
      })

      const result = await authService.login({ username: 'admin', password: 'admin123' })

      expect(result.success).toBe(true) // Should fallback to mock
    })
  })
})
