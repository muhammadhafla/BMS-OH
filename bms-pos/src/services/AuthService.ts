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

  private passwordMap: Map<string, string> = new Map([
    ['admin', 'admin123'],
    ['cashier1', 'cashier123'],
    ['manager1', 'manager123']
  ]);

  private generateToken(): string {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        
        // Store REAL token in localStorage for API service
        localStorage.setItem('bms_pos_session', JSON.stringify({
          userId: user.id,
          token: realBackendToken,
          timestamp: Date.now()
        }));
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
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Validate credentials
    const expectedPassword = this.passwordMap.get(username);
    if (!expectedPassword || expectedPassword !== password) {
      return {
        success: false,
        error: 'Invalid username or password'
      };
    }

    // Find user
    const user = this.users.find(u => u.username === username);
    if (!user || !user.isActive) {
      return {
        success: false,
        error: 'Account is inactive or not found'
      };
    }

    // Generate token
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

    // Store in localStorage for ApiService compatibility
    localStorage.setItem('bms_pos_session', JSON.stringify({
      userId: user.id,
      token,
      timestamp: Date.now()
    }));
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
    
    // Clear from localStorage
    localStorage.removeItem('bms_pos_session');
  }

  getCurrentUser(): User | null {
    try {
      const sessionData = localStorage.getItem('bms_pos_session');
      if (!sessionData) {
        return null;
      }

      const { userId, token } = JSON.parse(sessionData);
      
      // Verify token exists and is valid
      if (!this.userTokens.has(userId) || this.userTokens.get(userId) !== token) {
        localStorage.removeItem('bms_pos_session');
        return null;
      }

      // Find and return user
      const user = this.users.find(u => u.id === userId);
      return user && user.isActive ? user : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      localStorage.removeItem('bms_pos_session');
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
    const sessionData = localStorage.getItem('bms_pos_session');
    if (!sessionData) {
      return false;
    }

    try {
      const { userId, token, timestamp } = JSON.parse(sessionData);
      
      // Check if session is less than 24 hours old
      const sessionAge = Date.now() - timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (sessionAge > maxAge) {
        localStorage.removeItem('bms_pos_session');
        return false;
      }

      // Verify token is still valid
      return this.userTokens.has(userId) && this.userTokens.get(userId) === token;
    } catch (error) {
      console.error('Error validating session:', error);
      localStorage.removeItem('bms_pos_session');
      return false;
    }
  }
}

export const authService = new AuthService();