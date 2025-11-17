import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';
import { stringify } from 'csv-stringify/sync';

// import path from 'path';
// import fs from 'fs/promises';

const prisma = new PrismaClient();

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  columns: string[];
  format: 'csv' | 'excel' | 'pdf';
  dataType: 'products' | 'categories' | 'reports' | 'inventory';
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  template: string;
  filters?: Record<string, any>;
  selectedIds?: string[];
  includeFields?: string[];
  customColumns?: Array<{ key: string; label: string; }>;
  dateRange?: {
    start: string;
    end: string;
  };
  branchId?: string;
}

export interface ExportData {
  headers: string[];
  rows: any[];
  metadata: {
    totalRecords: number;
    generatedAt: string;
    template: string;
    filters?: Record<string, any>;
  };
}

// Export Templates Configuration
export const EXPORT_TEMPLATES: {
  products: Record<string, ExportTemplate>;
  categories: Record<string, ExportTemplate>;
  reports: Record<string, ExportTemplate>;
} = {
  products: {
    basic: {
      id: 'basic',
      name: 'Basic Product Info',
      description: 'SKU, Name, Price, Stock',
      columns: ['sku', 'name', 'price', 'stock', 'unit'],
      format: 'excel',
      dataType: 'products'
    },
    full: {
      id: 'full',
      name: 'Full Product Details',
      description: 'All product information including category and branch',
      columns: ['sku', 'name', 'description', 'category', 'branch', 'price', 'cost', 'stock', 'minStock', 'maxStock', 'unit', 'weight', 'barcode'],
      format: 'excel',
      dataType: 'products'
    },
    inventory: {
      id: 'inventory',
      name: 'Inventory Summary',
      description: 'Stock levels, values, and alerts',
      columns: ['sku', 'name', 'stock', 'minStock', 'maxStock', 'price', 'stockValue', 'lowStock'],
      format: 'excel',
      dataType: 'products'
    }
  },
  categories: {
    basic: {
      id: 'basic',
      name: 'Category List',
      description: 'Category names, codes, and hierarchy',
      columns: ['name', 'code', 'description', 'parent', 'productsCount', 'branch'],
      format: 'csv',
      dataType: 'categories'
    },
    tree: {
      id: 'tree',
      name: 'Category Tree',
      description: 'Hierarchical category structure',
      columns: ['name', 'code', 'description', 'parent', 'level', 'productsCount', 'branch'],
      format: 'excel',
      dataType: 'categories'
    }
  },
  reports: {
    stock: {
      id: 'stock',
      name: 'Stock Report',
      description: 'Stock levels and adjustments',
      columns: ['sku', 'name', 'currentStock', 'minStock', 'maxStock', 'lastAdjustment', 'adjustmentType', 'value'],
      format: 'excel',
      dataType: 'inventory'
    },
    sales: {
      id: 'sales',
      name: 'Sales Report',
      description: 'Product sales performance',
      columns: ['sku', 'name', 'totalSold', 'revenue', 'profit', 'category', 'branch'],
      format: 'excel',
      dataType: 'reports'
    }
  }
};

export class ExportService {
  private async generateFileName(template: string, format: string, timestamp: boolean = true): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
    const suffix = timestamp ? `_${dateStr}_${timeStr}` : '';
    return `${template}_export${suffix}.${format}`;
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (value instanceof Date) {
      return value.toLocaleDateString('en-US');
    }
    return String(value);
  }

  private async generateCSV(data: ExportData, _filename: string): Promise<string> {
    const csvData = [
      data.headers,
      ...data.rows.map(row => data.headers.map(header => this.formatValue(row[header])))
    ];
    
    return stringify(csvData, {
      header: false,
      delimiter: ','
    });
  }

  private async generateExcel(data: ExportData, _filename: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export Data');

    // Add headers
    worksheet.addRow(data.headers);
    
    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add data rows
    data.rows.forEach(row => {
      const rowData = data.headers.map(header => this.formatValue(row[header]));
      worksheet.addRow(rowData);
    });

    // Auto-fit columns
    if (worksheet.columns) {
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        if (column && typeof column.eachCell === 'function') {
          column.eachCell({ includeEmpty: true }, cell => {
            const cellValue = String(cell.value || '');
            maxLength = Math.max(maxLength, cellValue.length);
          });
          column.width = Math.min(maxLength + 2, 50);
        }
      });
    }

    return Buffer.from(await workbook.xlsx.writeBuffer()) as Buffer;
  }

  private async generatePDF(data: ExportData, _filename: string): Promise<Buffer> {
    // For now, return a simple text-based PDF equivalent
    // In a real implementation, you'd use a proper PDF library
    const content = data.headers.join(',') + '\n' +
      data.rows.map(row => 
        data.headers.map(header => this.formatValue(row[header])).join(',')
      ).join('\n');
    
    return Buffer.from(content, 'utf-8');
  }

  public async exportProducts(options: ExportOptions): Promise<ExportData> {
    const template = EXPORT_TEMPLATES.products[options.template] || EXPORT_TEMPLATES.products['basic'];
    const { filters = {}, selectedIds = [], branchId } = options;

    // Build query
    const where: any = {
      isActive: true,
      ...filters
    };

    if (selectedIds.length > 0) {
      where.id = { in: selectedIds };
    }

    if (branchId) {
      where.branchId = branchId;
    }

    // Fetch data
    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true, code: true } },
        branch: { select: { name: true } },
        creator: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform data based on template
    const rows = products.map(product => {
      const baseData = {
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        price: Number(product.price),
        cost: Number(product.cost),
        stock: product.stock,
        minStock: product.minStock,
        maxStock: product.maxStock,
        unit: product.unit,
        weight: product.weight ? Number(product.weight) : '',
        barcode: product.barcode || '',
        category: product.category ? `${product.category.name} (${product.category.code})` : '',
        branch: product.branch.name,
        createdBy: product.creator.name,
        createdAt: product.createdAt,
        stockValue: product.stock * Number(product.price)
      };

      // Add template-specific fields
      if (options.template === 'inventory') {
        (baseData as any)['lowStock'] = product.stock <= product.minStock ? 'Yes' : 'No';
      }

      return baseData;
    });

    // Get headers based on template columns and includeFields
    let headers = [...template.columns];
    if (options.includeFields) {
      headers = [...new Set([...headers, ...options.includeFields])];
    }

    // Add custom columns
    if (options.customColumns) {
      options.customColumns.forEach(col => {
        if (!headers.includes(col.key)) {
          headers.push(col.key);
        }
      });
    }

    return {
      headers,
      rows,
      metadata: {
        totalRecords: rows.length,
        generatedAt: new Date().toISOString(),
        template: template.name,
        filters
      }
    };
  }

  public async exportCategories(options: ExportOptions): Promise<ExportData> {
    const template = EXPORT_TEMPLATES.categories[options.template] || EXPORT_TEMPLATES.categories['basic'];
    const { filters = {}, selectedIds = [], branchId } = options;

    // Build query
    const where: any = {
      isActive: true,
      ...filters
    };

    if (selectedIds.length > 0) {
      where.id = { in: selectedIds };
    }

    if (branchId) {
      where.OR = [
        { branchId },
        { branchId: null } // Include global categories
      ];
    }

    // Fetch data
    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: { select: { name: true, code: true } },
        branch: { select: { name: true } },
        _count: { select: { products: true } }
      },
      orderBy: { name: 'asc' }
    });

    // Transform data
    const rows = categories.map(category => {
      const baseData = {
        name: category.name,
        code: category.code || '',
        description: category.description || '',
        parent: category.parent ? `${category.parent.name} (${category.parent.code})` : '',
        productsCount: category._count.products,
        branch: category.branch ? category.branch.name : 'Global',
        isActive: category.isActive ? 'Yes' : 'No',
        createdAt: category.createdAt
      };

      // Add template-specific fields
      if (options.template === 'tree') {
        // Calculate level based on parent hierarchy
        let level = 0;
        let current = category;
        while (current.parentId) {
          const parent = categories.find(c => c.id === current.parentId);
          if (parent) {
            level++;
            current = parent;
          } else {
            break;
          }
        }
        (baseData as any)['level'] = level;
      }

      return baseData;
    });

    // Get headers
    let headers = [...template.columns];
    if (options.includeFields) {
      headers = [...new Set([...headers, ...options.includeFields])];
    }

    return {
      headers,
      rows,
      metadata: {
        totalRecords: rows.length,
        generatedAt: new Date().toISOString(),
        template: template.name,
        filters
      }
    };
  }

  public async exportInventoryReports(options: ExportOptions): Promise<ExportData> {
    const template = EXPORT_TEMPLATES.reports[options.template] || EXPORT_TEMPLATES.reports['stock'];
    const { filters = {}, branchId } = options;

    // Build query for products
    const where: any = {
      isActive: true,
      ...filters
    };

    if (branchId) {
      where.branchId = branchId;
    }

    // Fetch products with latest inventory logs
    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        branch: { select: { name: true } },
        inventoryLogs: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Transform data based on report type
    const rows = products.map(product => {
      const latestLog = product.inventoryLogs[0];
      const baseData = {
        sku: product.sku,
        name: product.name,
        currentStock: product.stock,
        minStock: product.minStock,
        maxStock: product.maxStock,
        price: Number(product.price),
        stockValue: product.stock * Number(product.price),
        category: product.category?.name || '',
        branch: product.branch.name,
        lastAdjustment: latestLog ? latestLog.createdAt : '',
        adjustmentType: latestLog ? latestLog.type : '',
        reference: latestLog ? latestLog.reference || '' : ''
      };

      if (options.template === 'sales') {
        // Add sales-specific data
        (baseData as any)['totalSold'] = 0; // Would need transaction data
        (baseData as any)['revenue'] = 0; // Would need calculation
        (baseData as any)['profit'] = 0; // Would need calculation
      }

      return baseData;
    });

    return {
      headers: template.columns,
      rows,
      metadata: {
        totalRecords: rows.length,
        generatedAt: new Date().toISOString(),
        template: template.name,
        filters
      }
    };
  }

  public async generateExport(options: ExportOptions, dataType: 'products' | 'categories' | 'reports'): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }> {
    let data: ExportData;

    switch (dataType) {
      case 'products':
        data = await this.exportProducts(options);
        break;
      case 'categories':
        data = await this.exportCategories(options);
        break;
      case 'reports':
        data = await this.exportInventoryReports(options);
        break;
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }

    const filename = await this.generateFileName(options.template, options.format);
    let buffer: Buffer;
    let contentType: string;

    switch (options.format) {
      case 'csv':
        const csvContent = await this.generateCSV(data, filename);
        buffer = Buffer.from(csvContent, 'utf-8');
        contentType = 'text/csv';
        break;
      case 'excel':
        buffer = await this.generateExcel(data, filename);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'pdf':
        buffer = await this.generatePDF(data, filename);
        contentType = 'application/pdf';
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    return {
      buffer,
      filename,
      contentType
    };
  }
}

export const exportService = new ExportService();