# Stock Adjustment System Implementation Guide

## Overview

This document provides a comprehensive guide for the Stock Adjustment Functionality implemented for the BMS project. The system includes individual and bulk stock adjustments, approval workflows, low stock alerts, and comprehensive reporting.

## Features Implemented

### 1. **Individual Product Stock Adjustment**
- **Component**: `StockAdjustmentForm.tsx`
- **Features**:
  - Three adjustment types: Add Stock, Remove Stock, Set to Exact
  - Predefined adjustment reasons (Damaged, Lost, Found, Purchase, etc.)
  - Real-time stock preview with validation
  - Automatic approval requirement detection
  - Min/max stock validation
  - Reference and notes support

### 2. **Bulk Stock Adjustment**
- **Component**: `BulkStockAdjustment.tsx`
- **Features**:
  - CSV file upload support
  - Downloadable CSV template
  - Real-time validation of CSV data
  - Progress tracking
  - Error handling with detailed feedback
  - Global reason and reference for batch operations

### 3. **Stock Adjustment History**
- **Component**: `StockAdjustmentHistory.tsx`
- **Features**:
  - Complete adjustment history with filtering
  - Search by product, type, status, reason
  - Date range filtering
  - Pagination support
  - Export to CSV
  - Summary statistics

### 4. **Low Stock Alerts**
- **Component**: `LowStockAlerts.tsx`
- **Features**:
  - Real-time low stock monitoring
  - Severity levels (Critical, High, Medium)
  - Auto-refresh capability
  - Resolve and dismiss actions
  - Visual progress indicators
  - Branch-specific alerts

### 5. **Stock Approval Workflow**
- **Component**: `StockApprovalQueue.tsx`
- **Features**:
  - Role-based approval system (Manager/Admin only)
  - Priority-based queue
  - Detailed adjustment review
  - Approve/reject with notes
  - Auto-refresh for real-time updates
  - Approval history tracking

### 6. **Reports and Analytics**
- **Component**: `StockAdjustmentReports.tsx`
- **Features**:
  - Comprehensive statistics dashboard
  - Adjustment type breakdown
  - Top reasons and users analysis
  - Date range filtering
  - Export capabilities
  - Visual data representation

## File Structure

```
bms-web/src/
├── components/product/
│   ├── StockAdjustmentForm.tsx          # Individual adjustment modal
│   ├── BulkStockAdjustment.tsx          # Bulk CSV adjustment
│   ├── StockAdjustmentHistory.tsx       # History with filtering
│   ├── LowStockAlerts.tsx               # Low stock monitoring
│   ├── StockApprovalQueue.tsx           # Approval workflow
│   └── StockAdjustmentReports.tsx       # Reports & analytics
├── lib/validations/
│   └── stock-adjustment.ts              # Zod validation schemas
├── types/
│   └── stock-adjustment.ts              # TypeScript interfaces
└── services/
    └── api.ts                           # API service methods
```

## Integration Guide

### Step 1: Import Components

```typescript
import { StockAdjustmentForm } from '@/components/product/StockAdjustmentForm';
import { BulkStockAdjustment } from '@/components/product/BulkStockAdjustment';
import { StockAdjustmentHistory } from '@/components/product/StockAdjustmentHistory';
import { LowStockAlerts } from '@/components/product/LowStockAlerts';
import { StockApprovalQueue } from '@/components/product/StockApprovalQueue';
import { StockAdjustmentReports } from '@/components/product/StockAdjustmentReports';
```

### Step 2: Add to Product Page

Example integration in a product details page:

```typescript
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Settings, FileSpreadsheet, History, AlertTriangle } from 'lucide-react';

export default function ProductPage({ product }) {
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showBulkAdjustment, setShowBulkAdjustment] = useState(false);

  return (
    <div className="space-y-6">
      {/* Product Header with Quick Actions */}
      <div className="flex items-center justify-between">
        <h1>{product.name}</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowAdjustment(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Adjust Stock
          </Button>
          <Button variant="outline" onClick={() => setShowBulkAdjustment(true)}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Bulk Adjust
          </Button>
        </div>
      </div>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="history">Adjustment History</TabsTrigger>
          <TabsTrigger value="alerts">Low Stock Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          {/* Product details here */}
        </TabsContent>

        <TabsContent value="history">
          <StockAdjustmentHistory productId={product.id} />
        </TabsContent>

        <TabsContent value="alerts">
          <LowStockAlerts branchId={product.branchId} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <StockAdjustmentForm
        product={product}
        open={showAdjustment}
        onOpenChange={setShowAdjustment}
        onSuccess={() => {
          // Refresh product data
        }}
      />

      <BulkStockAdjustment
        open={showBulkAdjustment}
        onOpenChange={setShowBulkAdjustment}
        onSuccess={() => {
          // Refresh product list
        }}
      />
    </div>
  );
}
```

### Step 3: Add to Dashboard

Example integration in inventory dashboard:

```typescript
import { StockApprovalQueue } from '@/components/product/StockApprovalQueue';
import { LowStockAlerts } from '@/components/product/LowStockAlerts';
import { StockAdjustmentReports } from '@/components/product/StockAdjustmentReports';

export default function InventoryDashboard() {
  return (
    <div className="space-y-6">
      {/* Low Stock Alerts */}
      <LowStockAlerts autoRefresh={true} />

      {/* Approval Queue (for Managers/Admins) */}
      <StockApprovalQueue autoRefresh={true} />

      {/* Reports */}
      <StockAdjustmentReports />
    </div>
  );
}
```

## API Endpoints Required

The following backend API endpoints need to be implemented:

### Stock Adjustments
- `PATCH /api/products/:id/stock` - Individual stock adjustment
- `POST /api/inventory/adjustments` - Create adjustment
- `GET /api/inventory/adjustments` - List adjustments with filters
- `GET /api/inventory/adjustments/:id` - Get adjustment details
- `POST /api/inventory/adjustments/bulk` - Bulk adjustments
- `POST /api/inventory/adjustments/import-csv` - CSV import
- `GET /api/inventory/adjustments/stats` - Get statistics
- `GET /api/inventory/adjustments/report` - Generate report

### Approvals
- `GET /api/inventory/adjustments/pending-approvals` - Get pending approvals
- `PATCH /api/inventory/adjustments/:id/approve` - Approve/reject adjustment

### Low Stock Alerts
- `GET /api/inventory/low-stock-alerts` - Get alerts
- `POST /api/inventory/low-stock-alerts` - Create alert
- `PATCH /api/inventory/low-stock-alerts/:id` - Update alert
- `PATCH /api/inventory/low-stock-alerts/:id/dismiss` - Dismiss alert
- `PATCH /api/inventory/low-stock-alerts/:id/resolve` - Resolve alert

### Stock Valuation
- `GET /api/inventory/valuation` - Get stock valuation
- `POST /api/inventory/valuation/calculate` - Calculate valuation

## Business Rules

### 1. **Approval Requirements**
- Adjustments > 100 units require approval
- All STAFF role adjustments require approval
- MANAGER and ADMIN can approve adjustments
- Rejected adjustments don't affect stock

### 2. **Stock Validation**
- Stock cannot go below zero (unless specifically allowed)
- Stock must be within min/max range
- All adjustments require a reason
- Large adjustments trigger priority alerts

### 3. **Low Stock Alerts**
- Critical: ≤25% of threshold
- High: ≤50% of threshold
- Medium: >50% of threshold
- Auto-refresh every 30 seconds

### 4. **Permissions**
- **STAFF**: Can create adjustments (requires approval)
- **MANAGER**: Can create and approve adjustments
- **ADMIN**: Full access to all features

## CSV Import Format

Template for bulk stock adjustments:

```csv
sku,adjustmentType,quantity,reason,notes,reference
PROD-001,INCREMENT,10,Purchase Order Received,Received from supplier,PO-12345
PROD-002,DECREMENT,5,Damaged/Defective,Damaged during handling,DMG-001
PROD-003,SET_TO,100,Physical Inventory Recount,Annual inventory count,INV-2024
```

### CSV Fields:
- **sku** (required): Product SKU
- **adjustmentType** (required): INCREMENT, DECREMENT, or SET_TO
- **quantity** (required): Positive integer
- **reason** (required): Predefined reason or custom text
- **notes** (optional): Additional details
- **reference** (optional): Reference number/document

## Predefined Adjustment Reasons

### For INCREMENT (Add Stock):
- Purchase Order Received
- Customer Return
- Stock Found (Inventory Count)
- Transfer from Another Branch
- Production/Manufacturing
- Correction - Increase
- Initial Stock Entry
- Physical Inventory Recount
- Other (Specify in Notes)

### For DECREMENT (Remove Stock):
- Damaged/Defective
- Expired
- Lost/Missing
- Theft/Shrinkage
- Transfer to Another Branch
- Sample/Demo
- Correction - Decrease
- Waste/Spoilage
- Other (Specify in Notes)

## Testing Checklist

- [ ] Individual stock adjustment with all types
- [ ] Bulk CSV import with valid data
- [ ] Bulk CSV import with invalid data (error handling)
- [ ] Approval workflow (approve and reject)
- [ ] Low stock alert creation and resolution
- [ ] Stock adjustment history filtering
- [ ] Reports generation and export
- [ ] Role-based permissions (STAFF, MANAGER, ADMIN)
- [ ] Min/max stock validation
- [ ] Approval requirement detection
- [ ] Real-time updates and auto-refresh

## Best Practices

1. **Always provide clear reasons** for stock adjustments
2. **Use references** to link adjustments to source documents
3. **Review pending approvals regularly** to avoid bottlenecks
4. **Monitor low stock alerts** to prevent stockouts
5. **Export reports regularly** for audit trails
6. **Use bulk adjustments** for efficiency during inventory counts
7. **Set appropriate min/max levels** for accurate alerts

## Troubleshooting

### Common Issues:

1. **Adjustment not appearing in history**
   - Check if it requires approval
   - Verify filters are not hiding it
   - Refresh the page

2. **CSV import failing**
   - Verify CSV format matches template
   - Check for invalid SKUs
   - Ensure all required fields are present

3. **Cannot approve adjustments**
   - Verify user role (MANAGER or ADMIN required)
   - Check if adjustment is still pending

4. **Low stock alerts not showing**
   - Verify threshold settings
   - Check branch filter
   - Ensure alerts are not dismissed

## Future Enhancements

- [ ] Barcode scanning for quick adjustments
- [ ] Mobile app integration
- [ ] Automated reorder suggestions
- [ ] Integration with supplier systems
- [ ] Advanced analytics and forecasting
- [ ] Multi-currency support for valuation
- [ ] Batch approval capabilities
- [ ] Email notifications for alerts

## Support

For issues or questions, please refer to:
- API Documentation: `/docs/api`
- Component Documentation: `/docs/components`
- Business Rules: `/docs/business-rules`

---

**Last Updated**: 2024-11-10
**Version**: 1.0.0