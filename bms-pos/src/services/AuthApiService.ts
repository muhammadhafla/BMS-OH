/**
 * Authentication API Service
 * Handles authentication-related API calls
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { sessionManager } from './SessionManager'

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    user: any;
  };
  token?: string;
  error?: string;
  message?: string;
}

export interface AuthApiResponse<T = any> {
  success: boolean;
  data?: T;
  token?: string;
  error?: string;
  message?: string;
}

class AuthApiService {
  private api: AxiosInstance
  private baseURL: string

  constructor() {
    this.baseURL = this.detectApiEndpoint()
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Info': 'BMS-POS-PWA/1.0',
      },
    })

    this.setupInterceptors()
  }

  private detectApiEndpoint(): string {
    // Reuse the same logic as ApiService
    const savedEndpoint = localStorage.getItem('bms_api_endpoint')
    if (savedEndpoint) {
      return savedEndpoint
    }

    const {hostname} = window.location
    const {protocol: _protocol} = window.location
    const {port} = window.location
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      if (port && ['5173', '5174', '4173'].includes(port)) {
        return 'http://localhost:3001/api'
      }
      if (port === '3000') {
        return 'http://localhost:3001/api'
      }
      return 'http://localhost:3001/api'
    }
    
    return 'http://localhost:3001/api'
  }

  private setupInterceptors(): void {
    // Request interceptor for authentication
    this.api.interceptors.request.use(
      (config) => {
        const session = sessionManager.getSession()
        if (session?.token) {
          config.headers.Authorization = `Bearer ${session.token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      },
    )

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      (error) => {
        if (error.response?.status === 401) {
          this.handleUnauthorized()
        }
        return Promise.reject(error)
      },
    )
  }

  private handleUnauthorized(): void {
    sessionManager.clearSession()
    window.dispatchEvent(new CustomEvent('pos-logout'))
  }

  private async makeRequestWithRetry(requestFn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn()
      } catch (error: any) {
        lastError = error
        
        if (error.response?.status === 401) {
          throw error
        }
        
        if ((error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR' || !error.response) && attempt < maxRetries) {
          console.warn(`Auth request failed (attempt ${attempt}/${maxRetries}), retrying...`)
          continue
        }
      }
    }
    
    throw lastError
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthApiResponse> {
    try {
      return await this.makeRequestWithRetry(async () => {
        const response = await this.api.post('/auth/login', { email, password })
        const { token, user } = response.data.data
        
        // Store session securely
        sessionManager.storeSession(user.id, token)
        
        return {
          success: true,
          data: user,
          token,
          message: 'Login successful',
        }
      })
    } catch (error: any) {
      console.error('Login failed:', error)
      return {
        success: false,
        error: error.response?.data?.error ?? 'Login failed',
      }
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      sessionManager.clearSession()
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): any {
    const session = sessionManager.getSession()
    if (!session) return null

    try {
      const userStr = localStorage.getItem('bms_user')
      return userStr ? JSON.parse(userStr) : null
    } catch (error) {
      console.error('Error getting current user:', error)
      sessionManager.clearSession()
      return null
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return sessionManager.isValid()
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<boolean> {
    try {
      return await sessionManager.refreshToken()
    } catch (error) {
      console.error('Token refresh failed:', error)
      sessionManager.clearSession()
      return false
    }
  }

  /**
   * Validate current session
   */
  validateSession(): boolean {
    return sessionManager.isValid()
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return sessionManager.getSessionStats()
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthApiResponse> {
    try {
      return await this.makeRequestWithRetry(async () => {
        const response = await this.api.post('/auth/change-password', {
          currentPassword,
          newPassword,
        })
        
        return {
          success: true,
          data: response.data.data,
          message: response.data.message ?? 'Password changed successfully',
        }
      })
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error ?? 'Failed to change password',
      }
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<AuthApiResponse> {
    try {
      const response = await this.api.post('/auth/forgot-password', { email })
      
      return {
        success: true,
        message: response.data.message ?? 'Password reset instructions sent to your email',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error ?? 'Failed to send password reset email',
      }
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<AuthApiResponse> {
    try {
      const response = await this.api.post('/auth/reset-password', {
        token,
        newPassword,
      })
      
      return {
        success: true,
        message: response.data.message ?? 'Password reset successfully',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error ?? 'Failed to reset password',
      }
    }
  }
}

export const authApiService = new AuthApiService()
export default authApiService