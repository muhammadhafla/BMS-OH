/**
 * Product Service
 * Handles product-related API calls
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { sessionManager } from './SessionManager';

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

export interface ProductSearchParams {
  search?: string;
  page?: number;
  limit?: number;
  categoryId?: string;
  branchId?: string;
}

export interface ProductApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ProductListResponse {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  meta?: any;
}

class ProductService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = this.detectApiEndpoint();
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Info': 'BMS-POS-PWA/1.0'
      },
    });

    this.setupInterceptors();
  }

  private detectApiEndpoint(): string {
    const savedEndpoint = localStorage.getItem('bms_api_endpoint');
    if (savedEndpoint) {
      return savedEndpoint;
    }

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      if (port && ['5173', '5174', '4173'].includes(port)) {
        return 'http://localhost:3001/api';
      }
      if (port === '3000') {
        return 'http://localhost:3001/api';
      }
      return 'http://localhost:3001/api';
    }
    
    return 'http://localhost:3001/api';
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use(
      (config) => {
        const session = sessionManager.getSession();
        if (session?.token) {
          config.headers.Authorization = `Bearer ${session.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          sessionManager.clearSession();
          window.dispatchEvent(new CustomEvent('pos-logout'));
        }
        return Promise.reject(error);
      }
    );
  }

  private async makeRequestWithRetry(requestFn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;
        
        if (error.response?.status === 401) {
          throw error;
        }
        
        if ((error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR' || !error.response) && attempt < maxRetries) {
          console.warn(`Product request failed (attempt ${attempt}/${maxRetries}), retrying...`);
          continue;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Get products with search and filtering
   */
  async getProducts(params: ProductSearchParams = {}): Promise<ProductApiResponse<ProductListResponse>> {
    try {
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
      console.warn('Product API call failed, using fallback data:', error.message);
      
      // Return fallback data if API completely fails
      return await this.getFallbackProducts();
    }
  }

  /**
   * Get fallback products for development/testing
   */
  private async getFallbackProducts(): Promise<ProductApiResponse<ProductListResponse>> {
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

  /**
   * Get single product by ID
   */
  async getProduct(id: string): Promise<ProductApiResponse<{ product: Product }>> {
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

  /**
   * Search for a single product
   */
  async searchProduct(query: string): Promise<ProductApiResponse<{ product: Product }>> {
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

  /**
   * Create new product
   */
  async createProduct(productData: Partial<Product>): Promise<ProductApiResponse<{ product: Product }>> {
    try {
      const response = await this.api.post('/products', productData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Product created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create product'
      };
    }
  }

  /**
   * Update existing product
   */
  async updateProduct(id: string, productData: Partial<Product>): Promise<ProductApiResponse<{ product: Product }>> {
    try {
      const response = await this.api.put(`/products/${id}`, productData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Product updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update product'
      };
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<ProductApiResponse> {
    try {
      const response = await this.api.delete(`/products/${id}`);
      return {
        success: true,
        message: response.data.message || 'Product deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete product'
      };
    }
  }

  /**
   * Bulk import products
   */
  async importProducts(products: Partial<Product>[]): Promise<ProductApiResponse<{ imported: number; failed: number }>> {
    try {
      const response = await this.api.post('/products/import', { products });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Products imported successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to import products'
      };
    }
  }

  /**
   * Export products
   */
  async exportProducts(format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    try {
      const response = await this.api.get(`/products/export?format=${format}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to export products');
    }
  }

  /**
   * Check product availability
   */
  async checkAvailability(productIds: string[]): Promise<ProductApiResponse<{ available: boolean; products: any[] }>> {
    try {
      const response = await this.api.post('/products/availability', { productIds });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to check product availability'
      };
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(): Promise<ProductApiResponse<{ products: Product[] }>> {
    try {
      const response = await this.api.get('/products/low-stock');
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
}

export const productService = new ProductService();
export default productService;