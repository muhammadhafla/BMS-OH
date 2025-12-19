import { configService } from './ConfigService';
import { sessionManager } from './SessionManager';

export interface User {
  id: string;
  username: string;
  role: 'cashier' | 'admin' | 'manager';
  permissions: string[];
  lastLogin?: string;
  isActive: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  remainingAttempts?: number;
}

class AuthService {
  private users: User[] = [
    {
      id: '1',
      username: 'admin',
      role: 'admin',
      permissions: ['all'],
      isActive: true,
      lastLogin: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      username: 'cashier1',
      role: 'cashier',
      permissions: ['view_products', 'create_transaction', 'view_receipt'],
      isActive: true,
      lastLogin: '2024-01-14T15:20:00Z'
    },
    {
      id: '3',
      username: 'manager1',
      role: 'manager',
      permissions: ['all', 'view_reports', 'manage_inventory', 'view_analytics'],
      isActive: true,
      lastLogin: '2024-01-15T09:15:00Z'
    }
  ];

  private userTokens: Map<string, string> = new Map();

  private generateToken(): string {
    return configService.generateSecureToken();
  }

  

  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const { username, password } = credentials;
    
    try {
      // Try backend API first
      const apiService = await import('./ApiService');
      const result = await apiService.apiService.login(username, password);
      
      if (result.success && result.token) {
        // Store user data in localStorage for compatibility
        localStorage.setItem('bms_user', JSON.stringify(result.data));
        
        // Use the REAL backend JWT token (not mock)
        const realBackendToken = result.token;
        const user = result.data as User;
        
        // Update user last login
        const updatedUser = {
          ...user,
          lastLogin: new Date().toISOString()
        };
        
        // Store REAL backend JWT token
        this.userTokens.set(user.id, realBackendToken);
        
        // Update the user in the array
        const userIndex = this.users.findIndex(u => u.id === user.id);
        if (userIndex >= 0) {
          this.users[userIndex] = updatedUser;
        }
        
        // Store session securely
        sessionManager.storeSession(user.id, realBackendToken);
        localStorage.setItem('bms_user', JSON.stringify(updatedUser));
        
        console.log('✅ Backend login successful, using real JWT token');
        
        return {
          success: true,
          user: updatedUser,
          token: realBackendToken
        };
      }
      
      // If backend fails, fallback to mock authentication
      console.warn('Backend login failed, using mock authentication');
      return await this.mockLogin(username, password);
      
    } catch (error) {
      console.error('Backend API not available, using mock authentication:', error);
      return await this.mockLogin(username, password);
    }
  }

  private async mockLogin(username: string, password: string): Promise<LoginResult> {
    // Check rate limiting
    if (!sessionManager.canAttemptLogin()) {
      return {
        success: false,
        error: `Too many failed attempts. ${sessionManager.getRemainingAttempts()} attempts remaining.`,
        remainingAttempts: sessionManager.getRemainingAttempts()
      };
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Get user credentials from secure config
    const userCredentials = configService.getUserCredentials();
    const userConfig = userCredentials.find(u => u.username === username);
    
    if (!userConfig) {
      sessionManager.recordLoginAttempt(false);
      return {
        success: false,
        error: 'Invalid username or password',
        remainingAttempts: sessionManager.getRemainingAttempts()
      };
    }

    // Verify password using secure hashing
    const isPasswordValid = await configService.verifyPassword(password, userConfig.passwordHash);
    
    if (!isPasswordValid) {
      sessionManager.recordLoginAttempt(false);
      return {
        success: false,
        error: 'Invalid username or password',
        remainingAttempts: sessionManager.getRemainingAttempts()
      };
    }

    // Find user
    const user = this.users.find(u => u.id === userConfig.id);
    if (!user || !user.isActive) {
      sessionManager.recordLoginAttempt(false);
      return {
        success: false,
        error: 'Account is inactive or not found',
        remainingAttempts: sessionManager.getRemainingAttempts()
      };
    }

    // Record successful login
    sessionManager.recordLoginAttempt(true);

    // Generate secure token
    const token = this.generateToken();
    
    // Update user last login and store token
    const updatedUser = {
      ...user,
      lastLogin: new Date().toISOString()
    };
    
    this.userTokens.set(user.id, token);
    
    // Update the user in the array
    const userIndex = this.users.findIndex(u => u.id === user.id);
    this.users[userIndex] = updatedUser;

    // Store session securely
    sessionManager.storeSession(user.id, token);
    
    // Store user data for compatibility (minimal exposure)
    localStorage.setItem('bms_user', JSON.stringify(updatedUser));

    return {
      success: true,
      user: updatedUser,
      token
    };
  }

  hasPermission(user: User | null, permission: string): boolean {
    if (!user || !user.isActive) {
      return false;
    }

    if (user.permissions.includes('all')) {
      return true;
    }

    return user.permissions.includes(permission);
  }

  logout(): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      this.userTokens.delete(currentUser.id);
    }
    
    // Clear session securely
    sessionManager.clearSession();
  }

  getCurrentUser(): User | null {
    try {
      const session = sessionManager.getSession();
      if (!session) {
        return null;
      }

      // Verify token exists and is valid
      if (!this.userTokens.has(session.userId) || this.userTokens.get(session.userId) !== session.token) {
        sessionManager.clearSession();
        return null;
      }

      // Find and return user
      const user = this.users.find(u => u.id === session.userId);
      return user && user.isActive ? user : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      sessionManager.clearSession();
      return null;
    }
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  saveSession(user: User, token: string): void {
    localStorage.setItem('bms_pos_session', JSON.stringify({
      userId: user.id,
      token,
      timestamp: Date.now()
    }));
  }

  validateSession(): boolean {
    return sessionManager.isValid();
  }

  /**
   * Async session validation with token refresh
   */
  async validateSessionAsync(): Promise<boolean> {
    const session = sessionManager.getSession();
    if (!session) {
      return false;
    }

    // Check if session needs refresh
    if (sessionManager.needsRefresh()) {
      // Attempt to refresh the token (async)
      const refreshed = await sessionManager.refreshToken();
      return refreshed;
    }

    // Verify token is still valid
    return this.userTokens.has(session.userId) && this.userTokens.get(session.userId) === session.token;
  }

  /**
   * Get session security statistics
   */
  getSecurityStats() {
    return {
      sessionValid: this.isAuthenticated(),
      sessionStats: sessionManager.getSessionStats(),
      remainingAttempts: sessionManager.getRemainingAttempts(),
      canAttemptLogin: sessionManager.canAttemptLogin(),
      secureMode: configService.isSecureMode()
    };
  }

  /**
   * Check if system is running in secure mode
   */
  isSecureMode(): boolean {
    return configService.isSecureMode();
  }
}

export const authService = new AuthService();