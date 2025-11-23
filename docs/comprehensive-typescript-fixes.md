# BMS TypeScript Errors - Comprehensive Fix Document

## Overview
This document provides drop-in fixes for all 217 TypeScript errors across 47 files in the BMS project, categorized by error type with before/after code examples.

## Category 1: Unused Symbols (Variables/Imports/Params) - 80+ errors

### Pattern 1: Remove unused imports from components
```typescript
// BEFORE (BatchLotTracking.tsx:32)
import { 
  DialogTrigger,
  Calendar,
  Clock,
  Filter,
  Trash2,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  FileText,
} from 'lucide-react';

// AFTER
// Remove all unused imports, keep only used ones
import {
  Search,
  Package,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Download,
  Eye,
  Edit,
  Barcode,
  Hash,
  AlertCircle,
  Activity,
} from 'lucide-react';
```

### Pattern 2: Prefix unused parameters with underscore
```typescript
// BEFORE (CsvImportProgress.tsx:79)
const processBatch = (prev) => {

// AFTER
const processBatch = (prev: any) => {
```

### Pattern 3: Remove unused variables or prefix with underscore
```typescript
// BEFORE
const setBranchFilter = useState('ALL')[1];
const formatCurrency = (amount: number) => { return format(amount) };

// AFTER
const [, /* setBranchFilter */] = useState('ALL');
const formatCurrency = /* formatCurrency */ (amount: number) => { return format(amount) };
```

## Category 2: String | undefined not assignable to strict required props - 60+ errors

### Pattern 1: DefaultValue prop mismatches
```typescript
// BEFORE (CategoryForm.tsx:305)
<Select defaultValue={string | undefined} />

// AFTER - Option 1: Conditionally pass prop
{defaultValue && <Select defaultValue={defaultValue} />}

// AFTER - Option 2: Provide default
<Select defaultValue={defaultValue || ''} />

// AFTER - Option 3: Update component prop types to allow undefined
// In Select component interface:
defaultValue?: string | undefined;
```

### Pattern 2: onSuccess callback mismatches
```typescript
// BEFORE (BulkCategoryOperations.tsx:358)
<CategoryForm onSuccess={() => void} />

// AFTER - Option 1: Make onSuccess required and always pass
<CategoryForm onSuccess={onSuccess} />

// AFTER - Option 2: Update prop interface
onSuccess?: (() => void) | undefined;

// AFTER - Option 3: Provide fallback
<CategoryForm onSuccess={onSuccess || (() => {})} />
```

### Pattern 3: parentId and selectedCategoryId mismatches
```typescript
// BEFORE
<Component parentId={string | undefined} />
<Component selectedCategoryId={string | undefined} />

// AFTER - Option 1: Conditionally pass
{parentId && <Component parentId={parentId} />}
{selectedCategoryId && <Component selectedCategoryId={selectedCategoryId} />}

// AFTER - Option 2: Use null and handle at component level
<Component parentId={parentId || null} />

// AFTER - Option 3: Update component interface
parentId?: string | null;
selectedCategoryId?: string;
```

## Category 3: Object is possibly 'undefined' / spread unknown - 15+ errors

### Pattern 1: Object spread with guards
```typescript
// BEFORE (BulkStockAdjustment.tsx:145)
{...unknownObject}

// AFTER
{unknownObject && {...unknownObject}}
{unknownObject ? {...unknownObject} : {}}
{...(unknownObject || {})}
```

### Pattern 2: Type guards for APIs
```typescript
// BEFORE
Object.keys(errorData[0])

// AFTER
Object.keys(errorData?.[0] || {})
Object.keys((errorData && errorData[0]) || {})
```

### Pattern 3: Null coalescing for operations
```typescript
// BEFORE
const [date, time] = possiblyUndefined.split(' ');

// AFTER
const [date, time] = (possiblyUndefined || '').split(' ');
const [date, time] = (possiblyUndefined ?? '').split(' ');
```

## Category 4: Date constructor overload resolution - 5+ errors

### Pattern: Guard against undefined dates
```typescript
// BEFORE (attendance/page.tsx:291)
new Date(dateString | undefined)

// AFTER
new Date(dateString || new Date())
new Date(dateString ?? new Date())
new Date(dateString || '')

if (dateString) {
  return new Date(dateString);
}
return new Date();
```

## Category 5: Type mismatches between caller/callee - 20+ errors

### Pattern 1: API argument filtering
```typescript
// BEFORE
apiCall({ reference: string | undefined })

// AFTER - Option 1: Only pass defined values
const args = { reference };
if (reference) args.reference = reference;
apiCall(args);

// AFTER - Option 2: Filter out undefined
apiCall(Object.fromEntries(
  Object.entries({ reference, notes }).filter(([, v]) => v !== undefined)
));

// AFTER - Option 3: Update API interface
interface ApiCallArgs {
  reference?: string;
  notes?: string;
}
```

### Pattern 2: TransactionFilters handling
```typescript
// BEFORE
setFilters({ minAmount: number | undefined })

// AFTER
const filters: Partial<TransactionFilters> = {};
if (minAmount !== undefined) filters.minAmount = minAmount;
setFilters(filters);

// OR
setFilters(minAmount ? { minAmount } : {});
```

## Category 6: React class component lifecycle - 8+ errors

### Pattern: Add override modifiers and fix setState
```typescript
// BEFORE (ErrorBoundary.tsx:23, 31, 73)
class ErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  }
  
  render() {
    return null;
  }
}

// AFTER
class ErrorBoundary extends Component {
  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  }
  
  override render() {
    return null;
  }
}

// Fix setState payload for undefined values
this.setState({
  hasError: false,
  error: null,
  errorInfo: null
});
```

## Category 7: Property name or enum mismatches - 5+ errors

### Pattern: Rename to match interfaces
```typescript
// BEFORE (websocket.ts:92)
config.reconnectDelay

// AFTER
config.reconnectionDelay

// BEFORE (websocket.ts:233)
socket.emit('message', payload)

// AFTER
socket.emit('data', payload) // or appropriate event name
```

## Category 8: Session token access - 3+ errors

### Pattern: Use session.user instead of accessToken
```typescript
// BEFORE (api.ts:63, 64)
session.accessToken

// AFTER
session.user?.accessToken
// or remove if not needed:
// const { data } = await fetch('/api/endpoint', { headers: {} });
```

## Category 9: UI library dependency issues - 2+ errors

### Pattern: Fix missing dependencies
```typescript
// BEFORE (avatar.tsx)
import '@radix-ui/react-avatar'

// AFTER
npm install @radix-ui/react-avatar
// or remove usage if not needed

// BEFORE (toast.tsx)
theme: "system" | "light" | "dark" | undefined

// AFTER
theme: "system" | "light" | "dark"
```

## Category 10: General refactors - 20+ errors

### Pattern: Add missing variable declarations
```typescript
// BEFORE (TransactionHistory.tsx)
setCurrentPage
totalTransactions
totalSales
totalPurchases
totalRevenue

// AFTER - Add proper variable declarations
const [currentPage, setCurrentPage] = useState(1);
const [totalTransactions, setTotalTransactions] = useState(0);
// etc.
```

### Pattern: Fix interface extensions
```typescript
// BEFORE (types/category.ts)
interface CategoryUpdateData extends Partial<CategoryFormData> {
  parentId: string | null; // conflicts with CategoryFormData parentId: string
}

// AFTER
interface CategoryUpdateData extends Omit<Partial<CategoryFormData>, 'parentId'> {
  parentId?: string | null;
}
```

## Implementation Strategy

1. **Phase 1**: Fix all unused symbols across all files
2. **Phase 2**: Address string | undefined prop mismatches
3. **Phase 3**: Add guards for possibly undefined objects
4. **Phase 4**: Fix Date constructor calls
5. **Phase 5**: Resolve type mismatches in API calls
6. **Phase 6**: Add override modifiers to React class components
7. **Phase 7**: Fix property name mismatches
8. **Phase 8**: Update session token access patterns
9. **Phase 9**: Handle UI library dependencies
10. **Phase 10**: Complete general refactors

Each fix should be applied systematically, testing compilation after each batch to ensure no regressions.