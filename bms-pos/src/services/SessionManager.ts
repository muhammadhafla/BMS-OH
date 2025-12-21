/**
 * Secure Session Manager
 * Provides secure session management with improved security over localStorage
 */

import { configService } from './ConfigService'
import { Logger } from '../utils/logger'

export interface SessionData {
  userId: string;
  token: string;
  timestamp: number;
  expiresAt: number;
  refreshToken?: string;
}

export interface LoginAttempt {
  timestamp: number;
  ip?: string;
  success: boolean;
}

class SessionManager {
  private sessionData: SessionData | null = null
  private loginAttempts: LoginAttempt[] = []
  private readonly maxAttempts = 5
  private readonly attemptWindow = 15 * 60 * 1000 // 15 minutes
  private readonly refreshThreshold = 5 * 60 * 1000 // 5 minutes before expiry

  constructor() {
    this.loadSession()
    this.setupAutoRefresh()
  }

  /**
   * Store session data securely
   */
  public storeSession(userId: string, token: string, refreshToken?: string): void {
    const config = configService.getConfig()
    const now = Date.now()
    const expiresAt = now + (config.sessionTimeout * 60 * 60 * 1000) // Convert hours to milliseconds

    this.sessionData = {
      userId,
      token,
      refreshToken,
      timestamp: now,
      expiresAt,
    }

    // Store in memory only (more secure than localStorage)
    // In production, this should use httpOnly cookies or secure storage
    
    // For development compatibility, we'll still store minimal data in localStorage
    // but with reduced exposure
    if (config.mockMode) {
      this.storeInLocalStorage(userId, token, expiresAt)
    }

    this.cleanupExpiredSessions()
  }

  /**
   * Get current session
   */
  public getSession(): SessionData | null {
    if (!this.sessionData) {
      return this.loadFromLocalStorage()
    }

    // Check if session is expired
    if (Date.now() > this.sessionData.expiresAt) {
      this.clearSession()
      return null
    }

    return this.sessionData
  }

  /**
   * Check if session is valid
   */
  public isValid(): boolean {
    const session = this.getSession()
    return session !== null && Date.now() < session.expiresAt
  }

  /**
   * Check if session needs refresh
   */
  public needsRefresh(): boolean {
    const session = this.getSession()
    if (!session) return false

    const timeUntilExpiry = session.expiresAt - Date.now()
    return timeUntilExpiry <= this.refreshThreshold
  }

  /**
   * Refresh session token
   */
  public async refreshToken(): Promise<boolean> {
    const session = this.getSession()
    if (!session?.refreshToken) {
      return false
    }

    try {
      // In a real implementation, this would call the backend to refresh the token
      // For now, we'll just extend the session
      const config = configService.getConfig()
      const now = Date.now()
      const newExpiresAt = now + (config.sessionTimeout * 60 * 60 * 1000)

      this.sessionData = {
        ...session,
        expiresAt: newExpiresAt,
      }

      return true
    } catch (error) {
      Logger.error('Token refresh failed:', error)
      this.clearSession()
      return false
    }
  }

  /**
   * Record login attempt
   */
  public recordLoginAttempt(success: boolean): void {
    this.loginAttempts.push({
      timestamp: Date.now(),
      success,
    })

    this.cleanupOldAttempts()
  }

  /**
   * Check if user can attempt login (rate limiting)
   */
  public canAttemptLogin(): boolean {
    const config = configService.getConfig()
    if (!config.enableRateLimiting) {
      return true
    }

    this.cleanupOldAttempts()
    
    const recentAttempts = this.loginAttempts.filter(
      attempt => !attempt.success && 
      Date.now() - attempt.timestamp < this.attemptWindow,
    )

    return recentAttempts.length < this.maxAttempts
  }

  /**
   * Get remaining attempts
   */
  public getRemainingAttempts(): number {
    const config = configService.getConfig()
    if (!config.enableRateLimiting) {
      return this.maxAttempts
    }

    this.cleanupOldAttempts()
    
    const recentFailedAttempts = this.loginAttempts.filter(
      attempt => !attempt.success && 
      Date.now() - attempt.timestamp < this.attemptWindow,
    )

    return Math.max(0, this.maxAttempts - recentFailedAttempts.length)
  }

  /**
   * Clear session
   */
  public clearSession(): void {
    this.sessionData = null
    localStorage.removeItem('bms_pos_session')
    localStorage.removeItem('bms_user')
  }

  /**
   * Setup automatic token refresh
   */
  private setupAutoRefresh(): void {
    setInterval(() => {
      if (this.needsRefresh()) {
        void this.refreshToken()
      }
    }, 60000) // Check every minute
  }

  /**
   * Load session from localStorage (for backward compatibility)
   */
  private loadFromLocalStorage(): SessionData | null {
    try {
      const sessionStr = localStorage.getItem('bms_pos_session')
      if (!sessionStr) return null

      const session = JSON.parse(sessionStr)
      
      // Check if expired
      if (Date.now() > session.expiresAt) {
        localStorage.removeItem('bms_pos_session')
        return null
      }

      return session
    } catch (error) {
      Logger.error('Error loading session from localStorage:', error)
      localStorage.removeItem('bms_pos_session')
      return null
    }
  }

  /**
   * Store minimal session data in localStorage for compatibility
   */
  private storeInLocalStorage(userId: string, token: string, expiresAt: number): void {
    // Store minimal necessary data only
    const sessionData = {
      userId,
      token,
      expiresAt,
      timestamp: Date.now(),
    }

    localStorage.setItem('bms_pos_session', JSON.stringify(sessionData))
  }

  /**
   * Load existing session
   */
  private loadSession(): void {
    this.sessionData = this.loadFromLocalStorage()
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    if (this.sessionData && Date.now() > this.sessionData.expiresAt) {
      this.clearSession()
    }
  }

  /**
   * Cleanup old login attempts
   */
  private cleanupOldAttempts(): void {
    const cutoff = Date.now() - this.attemptWindow
    this.loginAttempts = this.loginAttempts.filter(
      attempt => attempt.timestamp > cutoff,
    )
  }

  /**
   * Get session statistics
   */
  public getSessionStats() {
    const session = this.getSession()
    const remainingAttempts = this.getRemainingAttempts()
    
    return {
      isValid: this.isValid(),
      needsRefresh: this.needsRefresh(),
      timeUntilExpiry: session ? session.expiresAt - Date.now() : 0,
      remainingLoginAttempts: remainingAttempts,
      canAttemptLogin: this.canAttemptLogin(),
    }
  }
}

export const sessionManager = new SessionManager()
export default sessionManager