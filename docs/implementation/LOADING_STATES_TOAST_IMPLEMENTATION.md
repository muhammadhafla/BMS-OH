# Loading States & Toast Notification System Implementation

## Overview

This document describes the comprehensive toast notification system and loading state management implemented in Phase 1.3 of the BMS-POS improvement project.

## Architecture

The system consists of several key components:

1. **Toast Notification System** - Using Sonner library
2. **Loading State Components** - Reusable loading UI components
3. **Data Fetching Utilities** - SWR-based API hooks
4. **Global Toast Provider** - Context provider for toast management

## Dependencies Added

```json
{
  "dependencies": {
    "sonner": "^1.4.0",
    "swr": "^2.2.4",
    "zustand": "^4.4.7",
    "react-hook-form": "^7.48.2",
    "@hookform/resolvers": "^3.3.2",
    "zod": "^3.22.4",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "rimraf": "^5.0.10"
  }
}
```

## Components Created

### 1. Toast Notification System

#### Sonner Component (`src/components/ui/sonner.tsx`)
- Global toast container
- Configured with custom styling
- Default duration: 4 seconds
- Light theme with consistent design

#### Toast Hook (`src/hooks/useToast.ts`)
- Custom React hook for managing toasts
- Supports multiple types: success, error, warning, info, loading
- Promise-based toast support for async operations
- Auto-dismiss and manual dismissal capabilities

**Usage Example:**
```typescript
import { useToast } from '../hooks/useToast'

const MyComponent = () => {
  const { showSuccess, showError, showWarning, showInfo, showLoading, showPromise } = useToast()
  
  const handleSave = async () => {
    showLoading('Saving data...')
    
    try {
      await saveData()
      showSuccess('Data saved successfully!')
    } catch (error) {
      showError('Failed to save data')
    }
  }
  
  const handlePromiseOperation = () => {
    showPromise(
      fetch('/api/data'),
      {
        loading: 'Loading data...',
        success: 'Data loaded successfully!',
        error: 'Failed to load data'
      }
    )
  }
}
```

### 2. Loading State Components

#### Loading Spinner (`src/components/ui/loading-spinner.tsx`)
- Reusable spinner with multiple sizes (sm, md, lg)
- Different color variants
- Accessible with proper ARIA attributes

**Usage:**
```typescript
<LoadingSpinner size="lg" color="primary" />
```

#### Loading Overlay (`src/components/ui/loading-overlay.tsx`)
- Full-screen overlay with backdrop
- Centered loading content
- Configurable blur and message display
- Wraps existing content during loading

**Usage:**
```typescript
<LoadingOverlay
  isLoading={isLoading}
  message="Processing your request..."
  backdrop={true}
  blur={true}
>
  <div>Your content here</div>
</LoadingOverlay>
```

#### Skeleton Components (`src/components/ui/skeleton.tsx`)
- Various skeleton types for different content
- Includes: Skeleton, SkeletonCard, SkeletonText, SkeletonButton, SkeletonAvatar, SkeletonTable

**Usage:**
```typescript
// For loading text content
<SkeletonText lines={4} />

// For loading cards
<SkeletonCard />

// For loading buttons
<SkeletonButton />

// For loading tables
<SkeletonTable rows={5} columns={4} />
```

### 3. Data Fetching Utilities

#### API Hook (`src/hooks/useApi.ts`)
- SWR-based custom hooks with error handling
- Automatic toast notifications
- Caching and background updates
- Mutation capabilities

**Available Hooks:**
- `useApi<T>()` - Generic API hook
- `useProducts(search?)` - Product data fetching
- `useCustomers(query?)` - Customer data fetching
- `useTransactions(limit?)` - Transaction data fetching
- `useInventory()` - Inventory data fetching
- `useMutation()` - For POST/PUT/DELETE operations

**Usage Examples:**
```typescript
// Basic API hook with error handling
const { data, error, isLoading, mutate } = useApi<any[]>('/api/products', {
  showErrorToast: true,
  revalidateOnFocus: false
})

// Mutation hook for updates
const { mutate: saveProduct } = useMutation(
  (product) => axios.post('/api/products', product),
  {
    onSuccess: () => showSuccess('Product saved!'),
    showSuccessToast: true
  }
)

// Specific entity hooks
const { data: products } = useProducts('search-term')
const { data: customers } = useCustomers('query')
const { data: transactions } = useTransactions(10)
```

### 4. Global Toast Provider

#### Toast Provider (`src/components/providers/toast-provider.tsx`)
- Context provider wrapping the entire app
- Global toast configuration
- Integration with Sonner

**App Integration:**
```typescript
// In App.tsx
import { ToastProvider } from './components/providers/toast-provider'

function App() {
  return (
    <ToastProvider>
      {/* Your app content */}
    </ToastProvider>
  )
}
```

## Integration with Existing Components

### App.tsx Updates
- Wrapped application with ToastProvider
- Replaced loading spinner with new LoadingSpinner component
- Maintained existing authentication flow

### Enhanced Loading States
- App-level loading screen uses new LoadingSpinner
- Component-level overlays for async operations
- Skeleton loading for data lists and forms

## Configuration Options

### Toast Configuration
```typescript
const toastOptions = {
  duration: 4000,           // Auto-dismiss duration
  position: "top-right",    // Toast position
  richColors: true,         // Rich color scheme
  expand: false,           // Don't expand by default
  visibleToasts: 5,        // Maximum visible toasts
  closeButton: true        // Show close button
}
```

### Loading Spinner Variants
```typescript
// Sizes
<LoadingSpinner size="sm" />  // 16x16
<LoadingSpinner size="md" />  // 24x24  
<LoadingSpinner size="lg" />  // 32x32

// Colors
<LoadingSpinner color="primary" />   // Blue
<LoadingSpinner color="secondary" /> // Purple
<LoadingSpinner color="white" />     // White
<LoadingSpinner color="gray" />      // Gray
```

### Skeleton Customization
```typescript
// Text skeleton with custom line count
<SkeletonText lines={5} />

// Table skeleton with custom rows/columns
<SkeletonTable rows={10} columns={6} />

// Card skeleton for product cards
<SkeletonCard />
```

## Error Handling

The system provides comprehensive error handling:

1. **API Error Handling** - Automatic toast notifications for API errors
2. **Network Error Handling** - User-friendly error messages
3. **Validation Error Handling** - Form validation with Zod integration
4. **Loading State Management** - Prevents UI freezing during operations

## Performance Optimizations

1. **SWR Caching** - Reduces redundant API calls
2. **Background Revalidation** - Fresh data without blocking UI
3. **Debounced Search** - Optimized search operations
4. **Memoization** - React.memo and useMemo for expensive operations
5. **Lazy Loading** - Skeleton components improve perceived performance

## Accessibility Features

1. **ARIA Labels** - Proper labeling for screen readers
2. **Keyboard Navigation** - Full keyboard support
3. **Focus Management** - Proper focus handling during loading states
4. **Color Contrast** - WCAG compliant color schemes
5. **Loading Indicators** - Clear loading state feedback

## Usage Guidelines

### When to Use Each Loading State

- **LoadingSpinner**: Small, inline loading indicators
- **LoadingOverlay**: Full component loading with backdrop
- **Skeleton**: Content placeholders for lists and data

### When to Show Each Toast Type

- **Success**: Successful operations (saved, updated, deleted)
- **Error**: Failed operations with error details
- **Warning**: Cautionary messages requiring user attention
- **Info**: Informational messages about system state
- **Loading**: Long-running async operations

### Best Practices

1. **Loading States**: Always provide feedback for async operations
2. **Toast Messages**: Keep messages concise but informative
3. **Error Handling**: Show specific error details when possible
4. **Performance**: Use appropriate loading state granularity
5. **Accessibility**: Ensure all states are accessible to screen readers

## Testing the Implementation

### Running the Development Server
```bash
cd bms-pos
npm install
npm run dev
```

### Building for Production
```bash
npm run build
npm run pack      # Creates unpacked directory
npm run dist      # Creates distributable packages
npm run build:win # Creates Windows executable
```

### Example Component
See `src/components/examples/LoadingStateDemo.tsx` for a comprehensive example showing:
- All toast types
- Loading state components
- API integration examples
- Skeleton loading demonstrations

## Future Enhancements

1. **Progress Indicators** - For multi-step operations
2. **Toast Customization** - More customization options
3. **Offline Support** - Network state management
4. **Real-time Updates** - WebSocket integration
5. **Analytics** - User interaction tracking

## Troubleshooting

### Common Issues

1. **Toasts not showing**: Ensure ToastProvider is wrapping the app
2. **Loading states not working**: Check component props and state management
3. **API calls failing**: Verify endpoint URLs and CORS configuration
4. **TypeScript errors**: Check import paths and type definitions

### Performance Issues

1. **Memory leaks**: Ensure proper cleanup of subscriptions
2. **Too many re-renders**: Use React.memo for expensive components
3. **Slow loading**: Implement proper loading state granularity
4. **API rate limiting**: Configure SWR deduping intervals

This implementation significantly improves the user experience by providing clear, consistent feedback for all system operations while maintaining excellent performance and accessibility standards.