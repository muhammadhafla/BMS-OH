import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Download, FileSpreadsheet, FileText, File, Loader2 } from 'lucide-react';
import { exportService } from '@/lib/services/export';
import { ExportOptions } from '@/lib/types/export';

interface ExportButtonProps {
  dataType: 'products' | 'categories' | 'reports';
  selectedItems?: string[];
  filters?: Record<string, any>;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function ExportButton({ 
  dataType, 
  selectedItems = [], 
  filters = {}, 
  className,
  variant = 'outline',
  size = 'sm' 
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  const handleQuickExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      setLoading(true);
      
      const options: ExportOptions = {
        format,
        template: 'basic',
        selectedIds: selectedItems,
        filters
      };

      let blob: Blob;
      
      switch (dataType) {
        case 'products':
          blob = await exportService.exportProducts(options);
          break;
        case 'categories':
          blob = await exportService.exportCategories(options);
          break;
        case 'reports':
          blob = await exportService.exportReports(options);
          break;
        default:
          throw new Error('Invalid data type');
      }

      const filename = exportService.generateFilename(`${dataType}_export`, format);
      exportService.downloadBlob(blob, filename, exportService.getMimeType(format));
      
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleExport = async () => {
    setShowScheduleDialog(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={variant} 
            size={size} 
            className={className}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleQuickExport('csv')}>
            <FileText className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickExport('excel')}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export as Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickExport('pdf')}>
            <File className="h-4 w-4 mr-2" />
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleScheduleExport}>
            <Download className="h-4 w-4 mr-2" />
            Schedule Export
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Scheduled</DialogTitle>
            <DialogDescription>
              Bulk export functionality will be available in the full export modal.
              For now, you can use the quick export options above.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ExportButton;