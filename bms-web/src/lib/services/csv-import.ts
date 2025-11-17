// Simple API service for CSV import operations
export const csvImportAPI = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',

  async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Download sample CSV template
  async downloadSampleCSV(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/products/sample-csv`, {
      headers: {
        'Authorization': localStorage.getItem('authToken') ? 
          `Bearer ${localStorage.getItem('authToken')}` : '',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download sample CSV');
    }

    return response.blob();
  },

  // Start CSV import
  async startImport(data: any[], options: {
    batchSize?: number;
    skipDuplicates?: boolean;
    updateExisting?: boolean;
  } = {}): Promise<{ importId: string; totalItems: number; estimatedDuration: number }> {
    const payload = {
      data,
      batchSize: options.batchSize || 50,
      skipDuplicates: options.skipDuplicates !== false,
      updateExisting: options.updateExisting || false,
    };

    const response = await this.fetchWithAuth(`${this.baseUrl}/api/products/import-csv`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to start import');
    }

    return response.data;
  },

  // Get import status
  async getImportStatus(importId: string): Promise<any> {
    const response = await this.fetchWithAuth(`${this.baseUrl}/api/products/import-status/${importId}`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get import status');
    }

    return response.data;
  },

  // Get import history
  async getImportHistory(params: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<any> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await this.fetchWithAuth(
      `${this.baseUrl}/api/products/imports/history?${searchParams.toString()}`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to get import history');
    }

    return response.data;
  }
};