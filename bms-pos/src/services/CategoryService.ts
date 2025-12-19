/**
 * Category Service
 * Handles category-related API calls
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { sessionManager } from './SessionManager';

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class CategoryService {
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
          console.warn(`Category request failed (attempt ${attempt}/${maxRetries}), retrying...`);
          continue;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<CategoryApiResponse<Category[]>> {
    try {
      return await this.makeRequestWithRetry(async () => {
        const response = await this.api.get('/categories');
        return {
          success: true,
          data: response.data.data?.categories || []
        };
      });
    } catch (error: any) {
      // Return fallback categories
      const fallbackCategories: Category[] = [
        {
          id: 'cat1',
          name: 'Beverages',
          description: 'Drinks and beverages',
          isActive: true,
          productCount: 25,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'cat2',
          name: 'Food',
          description: 'Food items and snacks',
          isActive: true,
          productCount: 42,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'cat3',
          name: 'Electronics',
          description: 'Electronic devices and accessories',
          isActive: true,
          productCount: 18,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      return {
        success: true,
        data: fallbackCategories
      };
    }
  }

  /**
   * Get category by ID
   */
  async getCategory(id: string): Promise<CategoryApiResponse<Category>> {
    try {
      const response = await this.api.get(`/categories/${id}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch category'
      };
    }
  }

  /**
   * Create new category
   */
  async createCategory(categoryData: Partial<Category>): Promise<CategoryApiResponse<Category>> {
    try {
      const response = await this.api.post('/categories', categoryData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Category created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create category'
      };
    }
  }

  /**
   * Update existing category
   */
  async updateCategory(id: string, categoryData: Partial<Category>): Promise<CategoryApiResponse<Category>> {
    try {
      const response = await this.api.put(`/categories/${id}`, categoryData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Category updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update category'
      };
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(id: string): Promise<CategoryApiResponse> {
    try {
      const response = await this.api.delete(`/categories/${id}`);
      return {
        success: true,
        message: response.data.message || 'Category deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete category'
      };
    }
  }

  /**
   * Get category tree (hierarchical structure)
   */
  async getCategoryTree(): Promise<CategoryApiResponse<Category[]>> {
    try {
      const response = await this.api.get('/categories/tree');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch category tree'
      };
    }
  }

  /**
   * Get categories with product counts
   */
  async getCategoriesWithCounts(): Promise<CategoryApiResponse<Array<Category & { productCount: number }>>> {
    try {
      const response = await this.api.get('/categories/with-counts');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch categories with counts'
      };
    }
  }

  /**
   * Search categories
   */
  async searchCategories(query: string): Promise<CategoryApiResponse<Category[]>> {
    try {
      const response = await this.api.get('/categories/search', {
        params: { q: query }
      });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to search categories'
      };
    }
  }

  /**
   * Activate/deactivate category
   */
  async toggleCategoryStatus(id: string, isActive: boolean): Promise<CategoryApiResponse<Category>> {
    try {
      const response = await this.api.patch(`/categories/${id}/status`, { isActive });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Category status updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update category status'
      };
    }
  }

  /**
   * Bulk create categories
   */
  async bulkCreateCategories(categories: Partial<Category>[]): Promise<CategoryApiResponse<{
    created: Category[];
    failed: Array<{ data: Partial<Category>; error: string }>;
  }>> {
    try {
      const response = await this.api.post('/categories/bulk', { categories });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Categories created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create categories'
      };
    }
  }

  /**
   * Reorder categories
   */
  async reorderCategories(categoryIds: string[]): Promise<CategoryApiResponse> {
    try {
      const response = await this.api.patch('/categories/reorder', { categoryIds });
      return {
        success: true,
        message: response.data.message || 'Categories reordered successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to reorder categories'
      };
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(): Promise<CategoryApiResponse<{
    totalCategories: number;
    activeCategories: number;
    inactiveCategories: number;
    categoriesWithProducts: number;
    topCategories: Array<{
      categoryId: string;
      categoryName: string;
      productCount: number;
    }>;
  }>> {
    try {
      const response = await this.api.get('/categories/stats');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch category statistics'
      };
    }
  }
}

export const categoryService = new CategoryService();
export default categoryService;