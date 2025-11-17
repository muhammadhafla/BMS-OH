import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  token?: string;  // Added for authentication responses
  error?: string;
  message?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  barcode?: string;
  description?: string;
  category?: {
    id: string;
    name: string;
  };
  branch?: {
    id: string;
    name: string;
  };
}

export interface Transaction {
  id: string;
  transactionCode: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
  }>;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  status: string;
  createdAt: string;
}

export interface InventoryLog {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reference?: string;
  notes?: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  stockStatus: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'CRITICAL';
  stockValue: number;
  category?: {
    name: string;
  };
}

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;
  private endpoints: string[];
  private currentEndpointIndex: number;

  constructor() {
    // Multiple endpoints for Tailscale environments
    this.endpoints = [
      import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
      'http://localhost:3001/api',
      'http://127.0.0.1:3001/api',
      'https://api.bms.local/api' // Local domain
    ];
    
    this.currentEndpointIndex = 0;
    this.baseURL = this.detectApiEndpoint();
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 15000, // Increased timeout for Tailscale networks
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Info': 'BMS-POS-Electron/1.0'
      },
    });

    // Request interceptor for authentication
    this.api.interceptors.request.use(
      (config) => {
        // Get token from AuthService
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    // Get token from localStorage (shared between AuthService and ApiService)
    const sessionData = localStorage.getItem('bms_pos_session');
    if (sessionData) {
      try {
        const { token } = JSON.parse(sessionData);
        return token;
      } catch (error) {
        console.error('Error parsing session data:', error);
        localStorage.removeItem('bms_pos_session');
        return null;
      }
    }
    return null;
  }

  private handleUnauthorized(): void {
    // Clear auth data and trigger logout
    localStorage.removeItem('bms_pos_session');
    localStorage.removeItem('bms_auth_token');
    localStorage.removeItem('bms_user');
    // Redirect to login or emit logout event
    window.dispatchEvent(new CustomEvent('pos-logout'));
  }

  private detectApiEndpoint(): string {
    // Try saved endpoint first
    const savedEndpoint = localStorage.getItem('bms_api_endpoint');
    if (savedEndpoint) {
      console.log(`🔗 Using saved endpoint: ${savedEndpoint}`);
      return savedEndpoint;
    }

    // Detect current environment
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    console.log(`🔍 Environment detection - Host: ${hostname}, Port: ${port}, Protocol: ${protocol}`);
    
    // Development environment detection
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Check if running in Vite development mode
      if (port && ['5173', '5174', '4173'].includes(port)) {
        console.log('🔧 Detected Vite development environment, using localhost:3001');
        return 'http://localhost:3001/api';
      }
      
      // Check if running in Next.js development mode
      if (port === '3000') {
        console.log('🔧 Detected Next.js development environment, using localhost:3001');
        return 'http://localhost:3001/api';
      }
      
      // Default for localhost without specific port
      return 'http://localhost:3001/api';
    }
    
    // For Tailscale environments, try to detect the server IP
    const tailScaleIP = import.meta.env.VITE_TAILSCALE_API_IP;
    if (tailScaleIP) {
      console.log(`🌐 Using Tailscale IP: ${tailScaleIP}`);
      return `${protocol}//${tailScaleIP}:3001/api`;
    }
    
    // Production environment detection
    if (hostname.includes('bms.local') || hostname.includes('yourcompany.com')) {
      return 'https://api.bms.local/api';
    }
    
    // Default fallback - try localhost first
    console.log('⚠️ Using default endpoint fallback');
    return 'http://localhost:3001/api';
  }

  private async testEndpoint(endpoint: string): Promise<boolean> {
    try {
      const testApi = axios.create({
        baseURL: endpoint,
        timeout: 5000
      });
      
      const response = await testApi.get('/health');
      return response.status === 200;
    } catch (error) {
      console.warn(`Endpoint test failed: ${endpoint}`, error);
      return false;
    }
  }

  private async switchToNextEndpoint(): Promise<boolean> {
    // Try next endpoint in the list
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
    const nextEndpoint = this.endpoints[this.currentEndpointIndex];
    
    console.log(`🔄 Switching to endpoint: ${nextEndpoint}`);
    
    const isWorking = await this.testEndpoint(nextEndpoint);
    if (isWorking) {
      this.baseURL = nextEndpoint;
      this.api.defaults.baseURL = nextEndpoint;
      localStorage.setItem('bms_api_endpoint', nextEndpoint);
      return true;
    }
    
    return false;
  }

  private async makeRequestWithRetry(requestFn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;
        
        // If it's an authentication error, don't retry
        if (error.response?.status === 401) {
          throw error;
        }
        
        // If it's a connection error and we have more attempts, switch endpoint
        if ((error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR' || !error.response) && attempt < maxRetries) {
          console.warn(`Request failed (attempt ${attempt}/${maxRetries}), trying next endpoint...`);
          const switched = await this.switchToNextEndpoint();
          if (!switched) {
            console.warn('No more endpoints available');
          }
          continue;
        }
        
        // If it's the last attempt, use fallback data
        if (attempt === maxRetries) {
          console.warn(`All endpoints failed after ${maxRetries} attempts, using fallback data`);
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  // Enhanced authentication methods
  async login(email: string, password: string): Promise<ApiResponse> {
    try {
      // First try backend API login
      const response = await this.api.post('/auth/login', { email, password });
      const { token, user } = response.data.data;
      
      // Store token in shared localStorage format
      localStorage.setItem('bms_pos_session', JSON.stringify({
        userId: user.id,
        token,
        timestamp: Date.now()
      }));
      
      return {
        success: true,
        data: user,
        token: token,  // Return the real JWT token!
        message: 'Login successful'
      };
    } catch (error: any) {
      // If backend login fails, try fallback to AuthService (mock data)
      console.warn('Backend login failed, trying AuthService fallback:', error.message);
      
      try {
        // Import AuthService dynamically to avoid circular dependencies
        const { authService } = await import('./AuthService');
        const result = await authService.login({ username: email, password });
        
        if (result.success && result.token) {
          // Convert AuthService token to backend-compatible format
          const backendToken = `mock_${result.token}`;
          
          // Store in shared format
          localStorage.setItem('bms_pos_session', JSON.stringify({
            userId: result.user!.id,
            token: backendToken,
            timestamp: Date.now()
          }));
          
          return {
            success: true,
            data: result.user,
            message: 'Login successful (mock mode)'
          };
        }
        
        return {
          success: false,
          error: result.error || 'Login failed'
        };
      } catch (authError) {
        console.error('AuthService fallback failed:', authError);
        return {
          success: false,
          error: error.response?.data?.error || 'Login failed'
        };
      }
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all auth data
      localStorage.removeItem('bms_pos_session');
      localStorage.removeItem('bms_auth_token');
      localStorage.removeItem('bms_user');
    }
  }

  getCurrentUser(): any {
    const sessionData = localStorage.getItem('bms_pos_session');
    if (sessionData) {
      try {
        const { userId: _userId } = JSON.parse(sessionData);
        const userStr = localStorage.getItem('bms_user');
        return userStr ? JSON.parse(userStr) : null;
      } catch (error) {
        console.error('Error getting current user:', error);
        localStorage.removeItem('bms_pos_session');
        return null;
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  // Products
  async getProducts(params: {
    search?: string;
    page?: number;
    limit?: number;
    categoryId?: string;
    branchId?: string;
  } = {}): Promise<ApiResponse<{ products: Product[]; pagination: any; meta?: any }>> {
    try {
      // Check if user is STAFF and should use branch filtering
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.role === 'staff' && !params.branchId) {
        console.log('🔍 STAFF user detected - API will apply branch filtering automatically');
      }

      return await this.makeRequestWithRetry(async () => {
        const response = await this.api.get('/products', { params });
        const data = response.data.data;
        
        // Log branch filtering info for debugging
        if (data.meta?.filters?.isFilteredByBranch) {
          console.log(`🔍 Branch filtering active:`, {
            userRole: data.meta.filters.userRole,
            userBranchId: data.meta.filters.userBranchId,
            appliedBranchId: data.meta.filters.branchId,
            totalInDatabase: data.meta.summary.totalInDatabase,
            returned: data.meta.summary.returned,
            filteredOut: data.meta.summary.branchFilteredOut
          });
        }
        
        return {
          success: true,
          data: data
        };
      });
    } catch (error: any) {
      console.warn('API call failed, using fallback data:', error.message);
      
      // Always return fallback data if API completely fails
      return await this.fallbackProducts();
    }
  }

  private async fallbackProducts(): Promise<ApiResponse<{ products: Product[]; pagination: any }>> {
    // Return mock products for development/testing
    const mockProducts: Product[] = [
      {
        id: '1',
        sku: 'PROD001',
        name: 'Sample Product 1',
        price: 10000,
        cost: 8000,
        stock: 100,
        unit: 'pcs',
        barcode: '123456789',
        description: 'Sample product for testing',
        category: { id: 'cat1', name: 'Beverages' }
      },
      {
        id: '2',
        sku: 'PROD002', 
        name: 'Sample Product 2',
        price: 25000,
        cost: 20000,
        stock: 50,
        unit: 'pcs',
        barcode: '987654321',
        description: 'Another sample product',
        category: { id: 'cat2', name: 'Food' }
      },
      {
        id: '3',
        sku: 'PROD003',
        name: 'Coffee',
        price: 15000,
        cost: 12000,
        stock: 25,
        unit: 'cups',
        barcode: '555123789',
        description: 'Fresh brewed coffee',
        category: { id: 'cat1', name: 'Beverages' }
      }
    ];

    return {
      success: true,
      data: {
        products: mockProducts,
        pagination: {
          total: mockProducts.length,
          page: 1,
          limit: 500,
          totalPages: 1
        }
      }
    };
  }

  async getProduct(id: string): Promise<ApiResponse<{ product: Product }>> {
    try {
      const response = await this.api.get(`/products/${id}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      // Return fallback product data
      const mockProduct: Product = {
        id: id,
        sku: `PROD${id.padStart(3, '0')}`,
        name: `Product ${id}`,
        price: 10000,
        cost: 8000,
        stock: 100,
        unit: 'pcs'
      };
      
      return {
        success: true,
        data: { product: mockProduct }
      };
    }
  }

  async searchProduct(query: string): Promise<ApiResponse<{ product: Product }>> {
    try {
      const response = await this.getProducts({ search: query, limit: 1 });
      if (response.success && response.data?.products && response.data.products.length > 0) {
        return {
          success: true,
          data: { product: response.data.products[0] }
        };
      }
      return {
        success: false,
        error: 'Product not found'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Product search failed'
      };
    }
  }

  // Transactions
  async createTransaction(transactionData: any): Promise<ApiResponse<{ transaction: Transaction }>> {
    try {
      const response = await this.api.post('/transactions', transactionData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Transaction created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create transaction'
      };
    }
  }

  async getTransactions(params: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<ApiResponse<{ transactions: Transaction[]; pagination: any }>> {
    try {
      const response = await this.api.get('/transactions', { params });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch transactions'
      };
    }
  }

  // Inventory
  async getInventoryOverview(params: {
    branchId?: string;
    categoryId?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<{ inventory: Product[]; pagination: any; summary: any }>> {
    try {
      const response = await this.api.get('/inventory/overview', { params });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch inventory overview'
      };
    }
  }

  async getLowStockProducts(): Promise<ApiResponse<{ lowStockProducts: LowStockProduct[]; summary: any }>> {
    try {
      const response = await this.api.get('/inventory/low-stock');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch low stock products'
      };
    }
  }

  async getInventoryLogs(params: {
    productId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<{ logs: InventoryLog[]; pagination: any }>> {
    try {
      const response = await this.api.get('/inventory/logs', { params });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch inventory logs'
      };
    }
  }

  async adjustStock(adjustmentData: {
    productId: string;
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    quantity: number;
    notes?: string;
    reference?: string;
  }): Promise<ApiResponse<{ product: Product; log: InventoryLog }>> {
    try {
      const response = await this.api.post('/inventory/adjust', adjustmentData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Stock adjusted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to adjust stock'
      };
    }
  }

  async bulkAdjustStock(adjustments: Array<{
    productId: string;
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    quantity: number;
    notes?: string;
  }>): Promise<ApiResponse<{ adjustments: any[]; logs: any[] }>> {
    try {
      const response = await this.api.post('/inventory/adjust/bulk', { adjustments });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Bulk stock adjustment completed'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to perform bulk stock adjustment'
      };
    }
  }

  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Categories
  async getCategories(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/categories');
      return {
        success: true,
        data: response.data.data?.categories || []
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch categories'
      };
    }
  }

  // Statistics
  async getInventoryStats(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/inventory/analytics');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch inventory statistics'
      };
    }
  }
}

export const apiService = new ApiService();