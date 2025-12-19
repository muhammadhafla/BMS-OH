/**
 * ConfigService Tests
 * Tests for secure configuration management
 */

import { configService } from '../services/ConfigService'
import { mockEnvironmentVariables, restoreEnvironmentVariables } from './setup'

describe('ConfigService', () => {
  beforeEach(() => {
    restoreEnvironmentVariables()
    jest.clearAllMocks()
  })

  afterEach(() => {
    restoreEnvironmentVariables()
  })

  describe('Configuration Loading', () => {
    it('should load configuration with default values', () => {
      const config = configService.getConfig()
      
      expect(config.sessionTimeout).toBe(24)
      expect(config.enableSecureCookies).toBe(false)
      expect(config.tokenRefreshInterval).toBe(3600)
      expect(config.enableRateLimiting).toBe(true)
      expect(config.maxLoginAttempts).toBe(5)
      expect(config.adminUsername).toBe('admin')
      expect(config.cashierUsername).toBe('cashier1')
      expect(config.managerUsername).toBe('manager1')
      expect(config.apiUrl).toBe('http://localhost:3001/api')
      expect(config.mockMode).toBe(false)
      expect(config.debugMode).toBe(false)
    })

    it('should load configuration from environment variables', () => {
      mockEnvironmentVariables({
        VITE_SESSION_TIMEOUT: '48',
        VITE_ENABLE_SECURE_COOKIES: 'true',
        VITE_TOKEN_REFRESH_INTERVAL: '7200',
        VITE_MAX_LOGIN_ATTEMPTS: '3',
        VITE_ADMIN_USERNAME: 'custom-admin',
        VITE_CASHIER_USERNAME: 'custom-cashier',
        VITE_MANAGER_USERNAME: 'custom-manager',
        VITE_API_URL: 'https://custom-api.example.com/api',
        VITE_MOCK_MODE: 'true',
        VITE_DEBUG_MODE: 'true',
      })

      const config = configService.getConfig()
      
      expect(config.sessionTimeout).toBe(48)
      expect(config.enableSecureCookies).toBe(true)
      expect(config.tokenRefreshInterval).toBe(7200)
      expect(config.maxLoginAttempts).toBe(3)
      expect(config.adminUsername).toBe('custom-admin')
      expect(config.cashierUsername).toBe('custom-cashier')
      expect(config.managerUsername).toBe('custom-manager')
      expect(config.apiUrl).toBe('https://custom-api.example.com/api')
      expect(config.mockMode).toBe(true)
      expect(config.debugMode).toBe(true)
    })

    it('should validate session timeout range', () => {
      mockEnvironmentVariables({
        VITE_SESSION_TIMEOUT: '200', // Invalid: too high
      })

      const config = configService.getConfig()
      expect(config.sessionTimeout).toBe(24) // Should fall back to default
    })

    it('should validate API URL format', () => {
      mockEnvironmentVariables({
        VITE_API_URL: 'invalid-url',
      })

      expect(() => configService.getConfig()).toThrow('Invalid API URL configuration')
    })
  })

  describe('Password Security', () => {
    it('should verify correct passwords', async () => {
      const config = configService.getConfig()
      const isValid = await configService.verifyPassword('admin123', config.adminPasswordHash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect passwords', async () => {
      const config = configService.getConfig()
      const isValid = await configService.verifyPassword('wrongpassword', config.adminPasswordHash)
      expect(isValid).toBe(false)
    })

    it('should hash passwords securely', async () => {
      const password = 'testpassword123'
      const hash = await configService.hashPassword(password)
      
      expect(hash).toBeTruthy()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50) // bcrypt hash length
      
      // Verify the hash works
      const isValid = await configService.verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should provide user credentials', () => {
      const credentials = configService.getUserCredentials()
      
      expect(credentials).toHaveLength(3)
      expect(credentials[0]).toEqual(
        expect.objectContaining({
          username: 'admin',
          role: 'admin',
          id: '1',
        }),
      )
      expect(credentials[1]).toEqual(
        expect.objectContaining({
          username: 'cashier1',
          role: 'cashier',
          id: '2',
        }),
      )
      expect(credentials[2]).toEqual(
        expect.objectContaining({
          username: 'manager1',
          role: 'manager',
          id: '3',
        }),
      )

      // All should have password hashes
      credentials.forEach(cred => {
        expect(cred.passwordHash).toBeTruthy()
        expect(cred.passwordHash).not.toBe('')
      })
    })
  })

  describe('Security Features', () => {
    it('should detect secure mode', () => {
      // Mock mode disabled, debug mode disabled
      expect(configService.isSecureMode()).toBe(true)
      
      // Enable mock mode
      mockEnvironmentVariables({ VITE_MOCK_MODE: 'true' })
      expect(configService.isSecureMode()).toBe(false)
      
      // Enable debug mode
      mockEnvironmentVariables({ 
        VITE_MOCK_MODE: 'false',
        VITE_DEBUG_MODE: 'true', 
      })
      expect(configService.isSecureMode()).toBe(false)
    })

    it('should generate secure tokens', () => {
      const token1 = configService.generateSecureToken()
      const token2 = configService.generateSecureToken()
      
      expect(token1).toBeTruthy()
      expect(token2).toBeTruthy()
      expect(token1).not.toBe(token2) // Should be unique
      expect(token1.length).toBe(64) // 32 bytes = 64 hex characters
      expect(token2.length).toBe(64)
    })
  })

  describe('Configuration Validation', () => {
    it('should warn about default passwords in production mode', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      // This should trigger a warning about default passwords
      configService.getConfig()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: Using default passwords'),
      )
      
      consoleSpy.mockRestore()
    })

    it('should validate required configuration', () => {
      // Test missing API URL
      mockEnvironmentVariables({
        VITE_API_URL: '',
      })
      
      expect(() => configService.getConfig()).toThrow('Invalid API URL configuration')
    })
  })
})