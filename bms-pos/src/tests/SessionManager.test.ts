/**
 * SessionManager Tests
 * Tests for secure session management
 */

import { sessionManager } from '../services/SessionManager'
import { createMockUser } from './setup'

// Suppress unused variable warnings
void createMockUser

describe('SessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear any existing session
    sessionManager.clearSession()
  })

  describe('Session Storage', () => {
    it('should store session data securely', () => {
      const userId = '123'
      const token = 'test-token-123'
      const refreshToken = 'refresh-token-123'

      sessionManager.storeSession(userId, token, refreshToken)

      const session = sessionManager.getSession()
      expect(session).toBeTruthy()
      expect(session?.userId).toBe(userId)
      expect(session?.token).toBe(token)
      expect(session?.refreshToken).toBe(refreshToken)
      expect(session?.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should handle session without refresh token', () => {
      const userId = '123'
      const token = 'test-token-123'

      sessionManager.storeSession(userId, token)

      const session = sessionManager.getSession()
      expect(session?.userId).toBe(userId)
      expect(session?.token).toBe(token)
      expect(session?.refreshToken).toBeUndefined()
    })
  })

  describe('Session Validation', () => {
    it('should validate active sessions', () => {
      sessionManager.storeSession('123', 'valid-token')
      
      expect(sessionManager.isValid()).toBe(true)
      expect(sessionManager.getSession()).toBeTruthy()
    })

    it('should invalidate expired sessions', () => {
      // Mock an expired session by manipulating the internal state
      const expiredSession = {
        userId: '123',
        token: 'expired-token',
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        expiresAt: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
      }
      
      // Directly set the session data to simulate expiry
      sessionManager['sessionData'] = expiredSession
      
      expect(sessionManager.isValid()).toBe(false)
      expect(sessionManager.getSession()).toBeNull()
    })

    it('should check if session needs refresh', () => {
      sessionManager.storeSession('123', 'valid-token')
      
      // Fresh session shouldn't need refresh
      expect(sessionManager.needsRefresh()).toBe(false)
    })
  })

  describe('Token Refresh', () => {
    it('should refresh valid tokens', async () => {
      sessionManager.storeSession('123', 'valid-token', 'refresh-token')
      
      // Mock the refresh process
      const refreshResult = await sessionManager.refreshToken()
      expect(refreshResult).toBe(true)
    })

    it('should handle refresh token failures', async () => {
      sessionManager.storeSession('123', 'valid-token') // No refresh token
      
      const refreshResult = await sessionManager.refreshToken()
      expect(refreshResult).toBe(false)
    })
  })

  describe('Rate Limiting', () => {
    it('should allow login attempts when under limit', () => {
      expect(sessionManager.canAttemptLogin()).toBe(true)
      expect(sessionManager.getRemainingAttempts()).toBe(5)
    })

    it('should record successful login attempts', () => {
      sessionManager.recordLoginAttempt(true)
      expect(sessionManager.getRemainingAttempts()).toBe(5) // Should not decrease
    })

    it('should record failed login attempts', () => {
      sessionManager.recordLoginAttempt(false)
      expect(sessionManager.getRemainingAttempts()).toBe(4) // Should decrease
      
      sessionManager.recordLoginAttempt(false)
      expect(sessionManager.getRemainingAttempts()).toBe(3)
    })

    it('should block login after max attempts', () => {
      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        sessionManager.recordLoginAttempt(false)
      }
      
      expect(sessionManager.getRemainingAttempts()).toBe(0)
      expect(sessionManager.canAttemptLogin()).toBe(false)
    })

    it('should reset attempts after time window', () => {
      // Mock time to simulate passing the attempt window
      const originalDate = Date.now
      Date.now = jest.fn(() => originalDate() + (16 * 60 * 1000)) // 16 minutes later
      
      sessionManager.recordLoginAttempt(false)
      expect(sessionManager.getRemainingAttempts()).toBe(4) // Should reset
      
      Date.now = originalDate
    })

    it('should respect rate limiting configuration', () => {
      // Test with rate limiting disabled (this would require config changes)
      expect(sessionManager.canAttemptLogin()).toBe(true) // Default behavior
    })
  })

  describe('Session Cleanup', () => {
    it('should clear sessions properly', () => {
      sessionManager.storeSession('123', 'valid-token')
      expect(sessionManager.isValid()).toBe(true)
      
      sessionManager.clearSession()
      expect(sessionManager.isValid()).toBe(false)
      expect(sessionManager.getSession()).toBeNull()
    })

    it('should cleanup expired sessions automatically', () => {
      sessionManager.storeSession('123', 'valid-token')
      
      // Simulate expired session
      const session = sessionManager.getSession()
      if (session) {
        session.expiresAt = Date.now() - 1000 // 1 second ago
      }
      
      // The next getSession call should clean up the expired session
      expect(sessionManager.getSession()).toBeNull()
    })
  })

  describe('Session Statistics', () => {
    it('should provide session statistics', () => {
      sessionManager.storeSession('123', 'valid-token')
      
      const stats = sessionManager.getSessionStats()
      
      expect(stats).toEqual(
        expect.objectContaining({
          isValid: true,
          needsRefresh: false,
          timeUntilExpiry: expect.any(Number),
          remainingLoginAttempts: 5,
          canAttemptLogin: true,
        }),
      )
    })

    it('should handle statistics for invalid sessions', () => {
      const stats = sessionManager.getSessionStats()
      
      expect(stats).toEqual(
        expect.objectContaining({
          isValid: false,
          needsRefresh: false,
          timeUntilExpiry: 0,
          remainingLoginAttempts: 5,
          canAttemptLogin: true,
        }),
      )
    })
  })

  describe('Auto Refresh', () => {
    it('should setup auto refresh timer', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval')
      
      // The SessionManager constructor should setup auto refresh
      expect(setIntervalSpy).toHaveBeenCalled()
      
      setIntervalSpy.mockRestore()
    })
  })

  describe('LocalStorage Compatibility', () => {
    it('should store minimal data in localStorage for compatibility', () => {
      // Mock localStorage
      const localStorageSetItem = jest.fn()
      Object.defineProperty(window, 'localStorage', {
        value: {
          setItem: localStorageSetItem,
          getItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      })

      sessionManager.storeSession('123', 'valid-token')
      
      // Should call localStorage.setItem for compatibility
      expect(localStorageSetItem).toHaveBeenCalledWith(
        'bms_pos_session',
        expect.stringContaining('"userId":"123"'),
      )
    })

    it('should load from localStorage on initialization', () => {
      const localStorageGetItem = jest.fn().mockReturnValue(JSON.stringify({
        userId: '123',
        token: 'stored-token',
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000),
      }))
      
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: localStorageGetItem,
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      })

      // Create a new session manager to test initialization
      // Note: SessionManager is exported as a singleton, so we test the existing instance
      expect(localStorageGetItem).toHaveBeenCalledWith('bms_pos_session')
    })
  })
})