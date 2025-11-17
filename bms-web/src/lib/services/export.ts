import axios from 'axios';
import { ExportOptions, ExportTemplate, ExportPreview, ExportJob, ExportHistory } from '../types/export';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ExportService {
  private readonly baseUrl = '/export';

  // Get available export templates
  async getTemplates(): Promise<{
    products: ExportTemplate[];
    categories: ExportTemplate[];
    reports: ExportTemplate[];
  }> {
    const response = await axios.get(`${API_BASE_URL}${this.baseUrl}/templates`, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });
    return response.data.data.templates;
  }

  // Direct export for immediate download
  async exportProducts(options: ExportOptions): Promise<Blob> {
    const response = await axios.post(`${API_BASE_URL}${this.baseUrl}/products`, options, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      responseType: 'blob'
    });
    return response.data;
  }

  async exportCategories(options: ExportOptions): Promise<Blob> {
    const response = await axios.post(`${API_BASE_URL}${this.baseUrl}/categories`, options, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      responseType: 'blob'
    });
    return response.data;
  }

  async exportReports(options: ExportOptions): Promise<Blob> {
    const response = await axios.post(`${API_BASE_URL}${this.baseUrl}/reports`, options, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      responseType: 'blob'
    });
    return response.data;
  }

  // Schedule bulk export
  async scheduleExport(
    dataType: 'products' | 'categories' | 'reports',
    options: ExportOptions,
    scheduleTime?: string,
    email?: string
  ): Promise<{ jobId: string; status: string; scheduleTime?: Date }> {
    const response = await axios.post(`${API_BASE_URL}${this.baseUrl}/schedule`, {
      dataType,
      options,
      scheduleTime,
      email
    }, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });
    return response.data.data;
  }

  // Get export history
  async getExportHistory(params: {
    page?: number;
    limit?: number;
    status?: string;
    dataType?: string;
  } = {}): Promise<ExportHistory> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.status) queryParams.set('status', params.status);
    if (params.dataType) queryParams.set('dataType', params.dataType);

    const response = await axios.get(`${API_BASE_URL}${this.baseUrl}/history?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });
    return response.data.data;
  }

  // Download scheduled export
  async downloadExport(jobId: string): Promise<Blob> {
    const response = await axios.get(`${API_BASE_URL}${this.baseUrl}/download/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      responseType: 'blob'
    });
    return response.data;
  }

  // Cancel scheduled export
  async cancelExport(jobId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}${this.baseUrl}/cancel/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });
  }

  // Preview export data
  async previewExport(
    dataType: 'products' | 'categories' | 'reports',
    options: ExportOptions
  ): Promise<ExportPreview> {
    const response = await axios.post(`${API_BASE_URL}${this.baseUrl}/preview`, {
      ...options,
      dataType
    }, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });
    return response.data.data;
  }

  // Utility function to download blob as file
  downloadBlob(blob: Blob, filename: string, contentType: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Create a temporary anchor element and trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the object URL
    URL.revokeObjectURL(url);
  }

  // Generate filename with timestamp
  generateFilename(template: string, format: string, timestamp: boolean = true): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
    const suffix = timestamp ? `_${dateStr}_${timeStr}` : '';
    return `${template}_export${suffix}.${format}`;
  }

  // Get MIME type for export format
  getMimeType(format: string): string {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }

  // Convert CSV to JSON (for client-side processing)
  csvToJson(csvText: string): any[] {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        return obj;
      });
  }

  // Format data for display
  formatValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      return value.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }
    if (value instanceof Date) {
      return value.toLocaleDateString('en-US');
    }
    return String(value);
  }

  // Get auth token from cookies
  private getAuthToken(): string {
    // In a real implementation, you would get this from your auth store
    if (typeof window !== 'undefined') {
      const cookies = document.cookie.split(';');
      const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));
      return authCookie ? authCookie.split('=')[1] : '';
    }
    return '';
  }

  // Validate export options
  validateOptions(options: ExportOptions, dataType: 'products' | 'categories' | 'reports'): string[] {
    const errors: string[] = [];

    if (!options.template) {
      errors.push('Template is required');
    }

    if (!options.format || !['csv', 'excel', 'pdf'].includes(options.format)) {
      errors.push('Valid format (csv, excel, pdf) is required');
    }

    return errors;
  }
}

export const exportService = new ExportService();
export default exportService;