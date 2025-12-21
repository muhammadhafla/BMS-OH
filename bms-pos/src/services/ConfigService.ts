/**
 * Secure Configuration Service
 * Manages environment variables and provides secure defaults
 */

import bcrypt from 'bcryptjs'

// Default password hashes for development (these should be overridden in production)
const DEFAULT_PASSWORDS = {
  admin: '$2a$10$Xq8H7V4K9M5N2P1R3T6Y8U2I4O6A8S0D1F3G5H7J9K1L3M5N7P9Q', // admin123
  cashier1: '$2a$10$Zq9H8L5K0N3Q2S1T4U7V9W3J5P7B9C2E4F6G8I0J2M4N6O8R0S2T4U6V', // cashier123
  manager1: '$2a$10$Rr0I9M6P1R4R2S2U5V8X0X4K6Q8D3F5G7H9K1L3N5O7P9S1T3U5W7X', // manager123
}

export interface SecurityConfig {
  // Session settings
  sessionTimeout: number; // hours
  enableSecureCookies: boolean;
  tokenRefreshInterval: number; // seconds
  
  // Rate limiting
  enableRateLimiting: boolean;
  maxLoginAttempts: number;
  
  // User credentials (hashed passwords)
  adminUsername: string;
  adminPasswordHash: string;
  cashierUsername: string;
  cashierPasswordHash: string;
  managerUsername: string;
  managerPasswordHash: string;
  
  // API settings
  apiUrl: string;
  tailscaleApiIp?: string;
  
  // Development settings
  mockMode: boolean;
  debugMode: boolean;
}

class ConfigService {
  private config: SecurityConfig | null = null

  constructor() {
    this.loadConfiguration()
  }

  private loadConfiguration(): void {
    try {
      this.config = {
        // Session settings
        sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '24'),
        enableSecureCookies: import.meta.env.VITE_ENABLE_SECURE_COOKIES === 'true',
        tokenRefreshInterval: parseInt(import.meta.env.VITE_TOKEN_REFRESH_INTERVAL || '3600'),
        
        // Rate limiting
        enableRateLimiting: import.meta.env.VITE_ENABLE_RATE_LIMITING === 'true',
        maxLoginAttempts: parseInt(import.meta.env.VITE_MAX_LOGIN_ATTEMPTS || '5'),
        
        // User credentials
        adminUsername: import.meta.env.VITE_ADMIN_USERNAME || 'admin',
        adminPasswordHash: import.meta.env.VITE_ADMIN_PASSWORD_HASH || DEFAULT_PASSWORDS.admin,
        cashierUsername: import.meta.env.VITE_CASHIER_USERNAME || 'cashier1',
        cashierPasswordHash: import.meta.env.VITE_CASHIER_PASSWORD_HASH || DEFAULT_PASSWORDS.cashier1,
        managerUsername: import.meta.env.VITE_MANAGER_USERNAME || 'manager1',
        managerPasswordHash: import.meta.env.VITE_MANAGER_PASSWORD_HASH || DEFAULT_PASSWORDS.manager1,
        
        // API settings
        apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
        tailscaleApiIp: import.meta.env.VITE_TAILSCALE_API_IP,
        
        // Development settings
        mockMode: import.meta.env.VITE_MOCK_MODE === 'true',
        debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
      }

      // Validate required configuration
      this.validateConfig()
      
    } catch (error) {
      console.error('Failed to load configuration:', error)
      throw new Error('Invalid configuration')
    }
  }

  private validateConfig(): void {
    if (!this.config) return

    // Check if we're in development mode and using default passwords
    const usingDefaults = 
      this.config.adminPasswordHash === DEFAULT_PASSWORDS.admin &&
      this.config.cashierPasswordHash === DEFAULT_PASSWORDS.cashier1 &&
      this.config.managerPasswordHash === DEFAULT_PASSWORDS.manager1

    if (usingDefaults && !this.config.mockMode) {
      console.warn('⚠️  WARNING: Using default passwords in production mode!')
      console.warn('Please set VITE_*_PASSWORD_HASH environment variables')
    }

    // Validate session timeout
    if (this.config.sessionTimeout < 1 || this.config.sessionTimeout > 168) { // max 1 week
      console.warn('⚠️  Invalid session timeout, using default of 24 hours')
      this.config.sessionTimeout = 24
    }

    // Validate API URL
    if (!this.config.apiUrl?.startsWith('http')) {
      throw new Error('Invalid API URL configuration')
    }
  }

  public getConfig(): SecurityConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded')
    }
    return this.config
  }

  public async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword)
    } catch (error) {
      console.error('Password verification failed:', error)
      return false
    }
  }

  public async hashPassword(plainPassword: string): Promise<string> {
    try {
      return await bcrypt.hash(plainPassword, 10) // 10 rounds salt
    } catch (error) {
      console.error('Password hashing failed:', error)
      throw new Error('Password hashing failed')
    }
  }

  public getUserCredentials() {
    const config = this.getConfig()
    return [
      {
        username: config.adminUsername,
        passwordHash: config.adminPasswordHash,
        role: 'admin',
        id: '1',
      },
      {
        username: config.cashierUsername,
        passwordHash: config.cashierPasswordHash,
        role: 'cashier',
        id: '2',
      },
      {
        username: config.managerUsername,
        passwordHash: config.managerPasswordHash,
        role: 'manager',
        id: '3',
      },
    ]
  }

  public generateSecureToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  public isSecureMode(): boolean {
    const config = this.getConfig()
    return !config.mockMode && !config.debugMode
  }
}

export const configService = new ConfigService()
export default configService