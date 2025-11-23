# TypeScript Errors Analysis - BMS Project

## Executive Summary
- **Total Errors**: 217 TypeScript errors across 47 files
- **Configuration**: strict mode + exactOptionalPropertyTypes enabled
- **Root Cause**: Under strict TypeScript settings, `undefined` values cannot be passed to required props and many symbols are unused

## Error Categories Breakdown

### 1. Unused Symbols (Variables/Imports/Params) - ~80 errors
**Pattern**: `error TS6133: 'symbol' is declared but its value is never read.`
**Pattern**: `error TS6192: All imports in import declaration are unused.`
**Pattern**: `error TS6196: 'symbol' is declared but never used.`

**Files Affected**:
- `src/components/inventory/BatchLotTracking.tsx`: DialogTrigger, Calendar, Clock, Filter, Trash2, Plus, Minus, TrendingUp, TrendingDown, FileText, setBranchFilter, formatCurrency
- `src/components/inventory/InventoryAnalytics.tsx`: Badge, PieChart, Layers, chartType, setChartType, formatDate
- `src/components/inventory/InventoryAudit.tsx`: Search, error
- `src/components/inventory/InventoryOverview.tsx`: Eye
- `src/components/inventory/LowStockAlerts.tsx`: Multiple unused imports, error, products
- `src/components/inventory/StockAdjustmentForm.tsx`: ADJUSTMENT_REASONS, CheckCircle2, errors, setValue
- `src/components/inventory/StockMovementLogs.tsx`: Calendar, Package, totalAdjustments
- `src/components/inventory/StockValuationReports.tsx`: Multiple unused imports, setBranchFilter, formatDate
- Plus many more across product, transaction, and shared components

**Fix Pattern**: 
- Remove unused imports
- Prefix unused parameters with underscore: `(param: Type)` → `(_param: Type)`
- Remove unused variables or prefix with underscore

### 2. String | undefined not assignable to strict required props - ~60 errors
**Pattern**: `error TS2375: Type '... | undefined' is not assignable to type '...' with 'exactOptionalPropertyTypes: true'`

**Key Issues**:
- `defaultValue: string | undefined` but component expects `string`
- `onSuccess?: () => void | undefined` but callback expects `() => void`
- `parentId: string | undefined` but parentId expects `string`
- `selectedCategoryId: string | undefined` but expects `string`

**Fix Pattern**:
- Omit undefined values from props object
- Provide default values
- Update prop types to allow undefined
- Use conditional logic to only pass defined values

### 3. Object is possibly 'undefined' / spread unknown - ~15 errors
**Pattern**: `error TS2532: Object is possibly 'undefined'`
**Pattern**: `error TS18046: 'variable' is of type 'unknown'`
**Pattern**: `error TS2698: Spread types may only be created from object types`

**Files Affected**:
- `src/components/product/BulkStockAdjustment.tsx`: sku possibly undefined
- `src/components/product/CsvImportResults.tsx`: Object.keys on possibly undefined errorData
- `src/lib/services/export.ts`: Date/time split on possibly undefined values
- `src/components/websocket/useRealTimeData.tsx`: currentStock, minStock unknown types

**Fix Pattern**:
- Add null/undefined checks before spreading
- Use optional chaining
- Narrow types with proper guards
- Use non-null assertions where safe

### 4. Overload resolution failure (new Date) - ~5 errors
**Pattern**: `error TS2769: No overload matches this call` for Date constructor

**Files Affected**:
- `src/app/(app)/attendance/page.tsx:291`: `new Date(string | undefined)`

**Fix Pattern**:
- Guard against undefined: `new Date(dateStr || new Date())`
- Use nullish coalescing: `new Date(dateStr ?? new Date())`
- Update to accept Date | undefined overload

### 5. Type mismatches between caller/callee signatures - ~20 errors
**Pattern**: `error TS2379: Argument of type '...' is not assignable to parameter of type '...'`

**Examples**:
- API arguments with `string | undefined` not matching required string types
- TransactionFilters with undefined values
- Stock adjustment reference/notes types

**Fix Pattern**:
- Update function signatures to handle undefined
- Narrow types before passing
- Update API DTOs to match current usage

### 6. React class component lifecycle - ~8 errors
**Pattern**: `error TS4114: This member must have an 'override' modifier`

**Files Affected**:
- `src/components/shared/ErrorBoundary.tsx`: Missing override on componentDidCatch, render methods
- setState payload issues with Error | undefined

**Fix Pattern**:
- Add `override` keyword to overridden methods
- Fix setState payload types to match expected types

### 7. Property name or enum mismatches - ~5 errors
**Pattern**: `error TS2551: Property 'X' does not exist on type. Did you mean 'Y'?`

**Examples**:
- `reconnectDelay` vs `reconnectionDelay` mismatch
- Property `message` vs `error` in WebSocket events

**Fix Pattern**:
- Rename properties to match interfaces
- Update configuration to use correct property names

### 8. Session token access and unused schema/token - ~3 errors
**Pattern**: `error TS2339: Property 'accessToken' does not exist on type 'Session'`

**Files Affected**:
- `src/services/api.ts`: session.accessToken doesn't exist on next-auth Session
- `src/lib/auth.ts`: branchId string | undefined not assignable to required type

**Fix Pattern**:
- Use session.user for user data
- Remove dead session token code
- Update auth types to handle optional branchId

### 9. UI library dependency issues - ~2 errors
**Pattern**: `error TS2307: Cannot find module '@radix-ui/react-avatar'`

**Files Affected**:
- `src/components/ui/avatar.tsx`: Missing Radix dependency
- `src/components/ui/toast.tsx`: theme prop type mismatch

**Fix Pattern**:
- Install missing dependencies: `npm install @radix-ui/react-avatar`
- Fix prop types to match UI library expectations

### 10. General refactors - ~20 errors
**Pattern**: Various type mismatches, missing properties, incorrect return types

**Examples**:
- Missing setCurrentPage, totalTransactions definitions
- Interface mismatches in category types
- Function signatures not matching

**Fix Pattern**:
- Update interface definitions
- Add missing variable declarations
- Fix return types and signatures

## Compilation Target
- **Command**: `npx tsc --noEmit --strict --exactOptionalPropertyTypes`
- **Files**: 217 errors across 47 files
- **Expected Result**: Clean compilation after all fixes

## Next Steps
1. Apply fixes category by category
2. Verify each fix compiles individually
3. Test in batches to ensure no regressions
4. Final comprehensive validation
