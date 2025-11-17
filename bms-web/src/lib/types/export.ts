export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  template: string;
  selectedIds?: string[];
  includeFields?: string[];
  customColumns?: Array<{ key: string; label: string; }>;
  dateRange?: {
    start: string;
    end: string;
  };
  branchId?: string;
  filters?: Record<string, any>;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  columns: string[];
  format: 'csv' | 'excel' | 'pdf';
  dataType: 'products' | 'categories' | 'reports' | 'inventory';
}

export interface ExportPreview {
  headers: string[];
  rows: any[];
  metadata: {
    totalRecords: number;
    generatedAt: string;
    template: string;
    filters?: Record<string, any>;
    previewRecords?: number;
  };
}

export interface ExportJob {
  id: string;
  dataType: 'products' | 'categories' | 'reports';
  options: ExportOptions;
  userId: string;
  userEmail: string;
  scheduleTime: Date;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: Date;
  completedAt?: Date;
  filePath?: string;
  error?: string;
}

export interface ExportHistory {
  jobs: ExportJob[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ExportNotification {
  id: string;
  type: 'SUCCESS' | 'ERROR' | 'PROGRESS' | 'INFO';
  title: string;
  message: string;
  jobId?: string;
  timestamp: Date;
  read: boolean;
}

export interface ExportSchedule {
  cronExpression: string;
  enabled: boolean;
  template: ExportTemplate;
  email?: string;
  lastRun?: Date;
  nextRun?: Date;
}