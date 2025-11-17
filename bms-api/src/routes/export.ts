import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { exportService, EXPORT_TEMPLATES } from '../services/export';

const router = Router();

// Validation schemas
const exportOptionsSchema = z.object({
  format: z.enum(['csv', 'excel', 'pdf']),
  template: z.string(),
  selectedIds: z.array(z.string()).optional(),
  includeFields: z.array(z.string()).optional(),
  customColumns: z.array(z.object({
    key: z.string(),
    label: z.string()
  })).optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  branchId: z.string().optional(),
  filters: z.record(z.any()).optional()
});

const scheduleExportSchema = z.object({
  dataType: z.enum(['products', 'categories', 'reports']),
  options: exportOptionsSchema,
  scheduleTime: z.string().optional(),
  email: z.string().email().optional()
});

// Get available export templates
router.get('/templates', authenticate, async (_req: AuthenticatedRequest, res) => {
  try {
    const templates = {
      products: Object.values(EXPORT_TEMPLATES.products),
      categories: Object.values(EXPORT_TEMPLATES.categories),
      reports: Object.values(EXPORT_TEMPLATES.reports)
    };

    res.json({
      success: true,
      data: { templates }
    });
  } catch (error) {
    console.error('Error fetching export templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch export templates' });
  }
});

// Direct export endpoint for immediate download
router.post('/products', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const options = exportOptionsSchema.parse(req.body);
    
    // Check permission - staff can only export their branch
    if (req.user!.role === 'STAFF' && !options.branchId) {
      options.branchId = req.user!.branchId;
    }

    const exportResult = await exportService.generateExport(options, 'products');
    
    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.send(exportResult.buffer);
    return;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export options',
        details: error.errors
      });
    }
    console.error('Error exporting products:', error);
    res.status(500).json({ success: false, error: 'Failed to export products' });
  }
});

router.post('/categories', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const options = exportOptionsSchema.parse(req.body);
    
    // Check permission - staff can only export their branch
    if (req.user!.role === 'STAFF' && !options.branchId) {
      options.branchId = req.user!.branchId;
    }

    const exportResult = await exportService.generateExport(options, 'categories');
    
    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.send(exportResult.buffer);
    return;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export options',
        details: error.errors
      });
    }
    console.error('Error exporting categories:', error);
    res.status(500).json({ success: false, error: 'Failed to export categories' });
  }
});

router.post('/reports', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const options = exportOptionsSchema.parse(req.body);
    
    // Only Admin and Manager can export reports
    if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only administrators and managers can export reports'
      });
    }

    const exportResult = await exportService.generateExport(options, 'reports');
    
    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.send(exportResult.buffer);
    return;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export options',
        details: error.errors
      });
    }
    console.error('Error exporting reports:', error);
    res.status(500).json({ success: false, error: 'Failed to export reports' });
  }
});

// Schedule bulk export
router.post('/schedule', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { dataType, options, scheduleTime, email } = scheduleExportSchema.parse(req.body);
    
    // Only Admin and Manager can schedule exports
    if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only administrators and managers can schedule exports'
      });
    }

    // Create export job
    const jobId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job = {
      id: jobId,
      dataType,
      options: {
        ...options,
        branchId: req.user!.role === 'STAFF' ? req.user!.branchId : options.branchId
      },
      userId: req.user!.id,
      userEmail: email || req.user!.email,
      scheduleTime: scheduleTime ? new Date(scheduleTime) : new Date(),
      status: 'PENDING',
      createdAt: new Date(),
      completedAt: null,
      filePath: null,
      error: null
    };

    // In a real implementation, you would save this to a database or job queue
    // For now, we'll simulate immediate processing for scheduled exports
    if (scheduleTime && new Date(scheduleTime) > new Date()) {
      // Future scheduled job - in real implementation, add to queue
      res.json({
        success: true,
        data: {
          jobId,
          status: 'SCHEDULED',
          scheduleTime: job.scheduleTime
        },
        message: 'Export scheduled successfully'
      });
      return;
    } else {
      // Immediate export
      const exportResult = await exportService.generateExport(options, dataType);
      
      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.send(exportResult.buffer);
      return;
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export schedule options',
        details: error.errors
      });
    }
    console.error('Error scheduling export:', error);
    res.status(500).json({ success: false, error: 'Failed to schedule export' });
  }
});

// Get export history
router.get('/history', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // In a real implementation, you would query from database
    // For now, return empty history
    const history = {
      jobs: [],
      total: 0,
      page: Number(page),
      limit: Number(limit),
      pages: 0
    };

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching export history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch export history' });
  }
});

// Download scheduled export
router.get('/download/:jobId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { jobId: _jobId } = req.params;

    // In a real implementation, you would:
    // 1. Check if job exists and belongs to user
    // 2. Check if job status is COMPLETED
    // 3. Return the file from storage

    // For now, return error
    res.status(404).json({
      success: false,
      error: 'Export job not found or not completed'
    });
  } catch (error) {
    console.error('Error downloading export:', error);
    res.status(500).json({ success: false, error: 'Failed to download export' });
  }
});

// Cancel scheduled export
router.delete('/cancel/:jobId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { jobId: _jobId } = req.params;

    // In a real implementation, you would:
    // 1. Check if job exists and belongs to user
    // 2. Check if job status is PENDING
    // 3. Cancel the job

    res.json({
      success: true,
      message: 'Export job cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling export:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel export' });
  }
});

// Preview export data (get first few rows)
router.post('/preview', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const options = exportOptionsSchema.parse(req.body);
    
    // Check permission
    if (req.user!.role === 'STAFF' && !options.branchId) {
      options.branchId = req.user!.branchId;
    }

    let data;
    switch (req.body.dataType) {
      case 'products':
        data = await exportService.exportProducts(options);
        break;
      case 'categories':
        data = await exportService.exportCategories(options);
        break;
      case 'reports':
        data = await exportService.exportInventoryReports(options);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid data type for preview'
        });
    }

    // Return first 10 rows for preview
    res.json({
      success: true,
      data: {
        headers: data.headers,
        rows: data.rows.slice(0, 10),
        metadata: {
          ...data.metadata,
          totalRecords: data.rows.length,
          previewRecords: Math.min(10, data.rows.length)
        }
      }
    });
    return;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export options',
        details: error.errors
      });
    }
    console.error('Error previewing export:', error);
    res.status(500).json({ success: false, error: 'Failed to preview export' });
  }
});

export { router as exportRouter };
