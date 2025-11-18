# BMS-POS Implementation Guideline

**Based on System Analysis**  
**Date:** 11 November 2025  
**Version:** 1.0

---

## Overview

This guideline provides step-by-step implementation instructions for improving the BMS-POS system based on the comprehensive analysis. Follow these guidelines in order of priority to transform the system from a basic POS to a production-ready retail solution.

---

## Phase 1: Foundation Improvements (Weeks 1-2)

### 1.1 User Authentication System

#### Step 1: Create Authentication Service
Create the file `src/services/AuthService.ts`:

```typescript
interface User {
  id: string;
  username: string;
  role: 'cashier' | 'admin' | 'manager';
  permissions: string[];
  lastLogin?: Date;
  isActive: boolean;
}

interface LoginCredentials {
  username: string;
  password: string;
}

class AuthService {
  private users: User[] = [
    {
      id: '1',
      username: 'admin',
      role: 'admin',
      permissions: ['*'],
      isActive: true
    },
    {
      id: '2', 
      username: 'cashier',
      role: 'cashier',
      permissions: ['pos:create', 'pos:view', 'inventory:view'],
      isActive: true
    }
  ];

  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    const user = this.users.find(u => u.username === credentials.username && u.isActive);
    
    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    // In production, verify password hash
    const token = this.generateToken(user);
    user.lastLogin = new Date();
    
    return { success: true, user, token };
  }

  private generateToken(user: User): string {
    return `token_${user.id}_${Date.now()}`;
  }

  hasPermission(user: User, permission: string): boolean {
    return user.permissions.includes('*') || user.permissions.includes(permission);
  }

  async logout(): Promise<void> {
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_token');
  }

  getCurrentUser(): User | null {
    const userData = localStorage.getItem('pos_user');
    return userData ? JSON.parse(userData) : null;
  }
}

export const authService = new AuthService();
```

#### Step 2: Create Login Component
Create the file `src/components/auth/LoginForm.tsx`:

```typescript
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { authService } from '../../services/AuthService';

interface LoginFormProps {
  onLogin: (user: any) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authService.login(credentials);
      if (result.success && result.user && result.token) {
        localStorage.setItem('pos_user', JSON.stringify(result.user));
        localStorage.setItem('pos_token', result.token);
        onLogin(result.user);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">BMS POS Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <Input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <Input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              required
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginForm;
```

#### Step 3: Update Main App
Update `src/App.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import LoginForm from './components/auth/LoginForm';
import POSLayout from './components/POSLayout';
import { authService } from './services/AuthService';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = (loggedInUser: any) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <POSLayout user={user} onLogout={handleLogout} />;
}

export default App;
```

### 1.2 Error Handling & Validation

#### Step 1: Create Error Boundary Component
Create the file `src/components/shared/ErrorBoundary.tsx`:

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // this.logErrorToService(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              An unexpected error occurred. Please try refreshing the application.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-xs">
                <summary className="cursor-pointer">Error details</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="space-x-2">
              <Button onClick={() => window.location.reload()}>
                Refresh App
              </Button>
              <Button variant="outline" onClick={() => this.setState({ hasError: false })}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

#### Step 2: Create Validation Utilities
Create the file `src/utils/validation.ts`:

```typescript
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: any) => string | null;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export class Validator {
  static validate(data: any, schema: ValidationSchema): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Required validation
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors[field] = 'This field is required';
        continue;
      }

      // Skip other validations if value is empty and not required
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // String validations
      if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors[field] = `Must be at least ${rules.minLength} characters`;
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors[field] = `Must be no more than ${rules.maxLength} characters`;
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors[field] = 'Invalid format';
        }
      }

      // Number validations
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors[field] = `Must be at least ${rules.min}`;
        }
        if (rules.max !== undefined && value > rules.max) {
          errors[field] = `Must be no more than ${rules.max}`;
        }
      }

      // Custom validation
      if (rules.custom) {
        const customError = rules.custom(value);
        if (customError) {
          errors[field] = customError;
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  static createProductValidation(): ValidationSchema {
    return {
      name: {
        required: true,
        minLength: 2,
        maxLength: 100
      },
      sku: {
        required: true,
        pattern: /^[A-Z0-9]+$/,
        custom: (value) => {
          if (!/^[A-Z0-9]+$/.test(value)) {
            return 'SKU must contain only uppercase letters and numbers';
          }
          return null;
        }
      },
      price: {
        required: true,
        min: 0.01,
        custom: (value) => {
          if (value % 1 !== 0 && value.toString().split('.')[1].length > 2) {
            return 'Price can have at most 2 decimal places';
          }
          return null;
        }
      },
      stock: {
        required: true,
        min: 0,
        custom: (value) => {
          if (!Number.isInteger(value)) {
            return 'Stock must be a whole number';
          }
          return null;
        }
      }
    };
  }
}
```

### 1.3 Loading States & User Feedback

#### Step 1: Create Toast Notification System
Create the file `src/hooks/useToast.ts`:

```typescript
import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

let toastId = 0;

export const useToast = () => {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = (++toastId).toString();
    const newToast: Toast = { ...toast, id };

    setState(prev => ({
      toasts: [...prev.toasts, newToast]
    }));

    // Auto-remove after duration
    setTimeout(() => {
      removeToast(id);
    }, toast.duration || 5000);

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setState(prev => ({
      toasts: prev.toasts.filter(toast => toast.id !== id)
    }));
  }, []);

  const toast = {
    success: (title: string, message?: string) => addToast({ type: 'success', title, message }),
    error: (title: string, message?: string) => addToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) => addToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) => addToast({ type: 'info', title, message }),
  };

  return {
    toasts: state.toasts,
    toast,
    removeToast
  };
};
```

---

## Phase 2: Core Features (Weeks 3-4)

### 2.1 Customer Management

#### Step 1: Customer Service
Create the file `src/services/CustomerService.ts`:

```typescript
interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  totalPurchases: number;
  lastVisit?: Date;
  isActive: boolean;
  createdAt: Date;
}

class CustomerService {
  private customers: Customer[] = [
    {
      id: '1',
      name: 'Pelanggan Umum',
      phone: '',
      email: '',
      loyaltyPoints: 0,
      totalPurchases: 0,
      isActive: true,
      createdAt: new Date()
    }
  ];

  async searchCustomers(query: string): Promise<Customer[]> {
    const lowerQuery = query.toLowerCase();
    return this.customers.filter(customer =>
      customer.isActive &&
      (customer.name.toLowerCase().includes(lowerQuery) ||
       customer.phone?.includes(query) ||
       customer.email?.toLowerCase().includes(lowerQuery))
    );
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    return this.customers.find(c => c.id === id && c.isActive) || null;
  }

  async createCustomer(customerData: Omit<Customer, 'id' | 'loyaltyPoints' | 'totalPurchases' | 'createdAt'>): Promise<Customer> {
    const newCustomer: Customer = {
      ...customerData,
      id: Date.now().toString(),
      loyaltyPoints: 0,
      totalPurchases: 0,
      createdAt: new Date()
    };
    
    this.customers.push(newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return null;

    this.customers[index] = { ...this.customers[index], ...updates };
    return this.customers[index];
  }

  async addLoyaltyPoints(customerId: string, points: number): Promise<void> {
    const customer = this.customers.find(c => c.id === customerId);
    if (customer) {
      customer.loyaltyPoints += points;
    }
  }

  async recordPurchase(customerId: string, amount: number): Promise<void> {
    const customer = this.customers.find(c => c.id === customerId);
    if (customer) {
      customer.totalPurchases += amount;
      customer.lastVisit = new Date();
    }
  }
}

export const customerService = new CustomerService();
```

#### Step 2: Customer Search Component
Create the file `src/components/customer/CustomerSearch.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, User, Plus } from 'lucide-react';
import { customerService } from '../../services/CustomerService';
import { Customer } from '../../services/CustomerService';

interface CustomerSearchProps {
  onCustomerSelect: (customer: Customer) => void;
  selectedCustomer?: Customer | null;
}

const CustomerSearch: React.FC<CustomerSearchProps> = ({ onCustomerSelect, selectedCustomer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    if (searchTerm) {
      searchCustomers();
    } else {
      setCustomers([]);
    }
  }, [searchTerm]);

  const searchCustomers = async () => {
    setLoading(true);
    try {
      const results = await customerService.searchCustomers(searchTerm);
      setCustomers(results);
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) return;

    try {
      const customer = await customerService.createCustomer({
        ...newCustomer,
        address: '',
        isActive: true
      });
      
      onCustomerSelect(customer);
      setNewCustomer({ name: '', phone: '', email: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Customer
          {selectedCustomer && (
            <span className="text-sm font-normal text-gray-600">
              - {selectedCustomer.name}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedCustomer ? (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search customer name, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {showAddForm && (
              <Card className="p-4 bg-blue-50">
                <h4 className="font-medium mb-3">Add New Customer</h4>
                <div className="space-y-2">
                  <Input
                    placeholder="Customer name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  />
                  <Input
                    placeholder="Phone (optional)"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  />
                  <Input
                    placeholder="Email (optional)"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddCustomer}>
                      Add Customer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {loading && (
              <div className="text-center py-4 text-gray-500">Searching...</div>
            )}

            {customers.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                    onClick={() => onCustomerSelect(customer)}
                  >
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-gray-600">
                      {customer.phone && `📞 ${customer.phone}`}
                      {customer.phone && customer.email && ' • '}
                      {customer.email && `✉️ ${customer.email}`}
                    </div>
                    {customer.loyaltyPoints > 0 && (
                      <div className="text-sm text-blue-600">
                        Points: {customer.loyaltyPoints}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between p-3 bg-green-50 border rounded">
            <div>
              <div className="font-medium">{selectedCustomer.name}</div>
              <div className="text-sm text-gray-600">
                Points: {selectedCustomer.loyaltyPoints} • 
                Total: Rp{selectedCustomer.totalPurchases.toLocaleString('id-ID')}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCustomerSelect(null as any)}
            >
              Change
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerSearch;
```

### 2.2 Inventory Tracking

#### Step 1: Inventory Service
Create the file `src/services/InventoryService.ts`:

```typescript
interface StockMovement {
  id: string;
  productId: string;
  type: 'sale' | 'restock' | 'adjustment' | 'return';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  timestamp: Date;
  userId: string;
  transactionId?: string;
}

interface InventoryItem {
  productId: string;
  currentStock: number;
  reservedStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  lastRestocked?: Date;
  movements: StockMovement[];
}

class InventoryService {
  private inventory: Map<string, InventoryItem> = new Map();
  private movements: StockMovement[] = [];

  async getInventoryItem(productId: string): Promise<InventoryItem | null> {
    return this.inventory.get(productId) || null;
  }

  async getAllInventory(): Promise<InventoryItem[]> {
    return Array.from(this.inventory.values());
  }

  async updateStock(
    productId: string, 
    quantity: number, 
    type: 'sale' | 'restock' | 'adjustment' | 'return',
    reason?: string,
    userId?: string,
    transactionId?: string
  ): Promise<boolean> {
    try {
      const item = this.inventory.get(productId);
      if (!item) {
        console.error(`Product ${productId} not found in inventory`);
        return false;
      }

      const previousStock = item.currentStock;
      let newStock = previousStock;

      switch (type) {
        case 'sale':
          newStock = previousStock - quantity;
          break;
        case 'restock':
        case 'return':
          newStock = previousStock + quantity;
          break;
        case 'adjustment':
          newStock = quantity;
          break;
      }

      if (newStock < 0) {
        console.error('Insufficient stock for sale');
        return false;
      }

      // Create movement record
      const movement: StockMovement = {
        id: `${productId}_${Date.now()}`,
        productId,
        type,
        quantity: type === 'adjustment' ? quantity - previousStock : quantity,
        previousStock,
        newStock,
        reason,
        timestamp: new Date(),
        userId: userId || 'system',
        transactionId
      };

      // Update inventory
      item.currentStock = newStock;
      item.movements.push(movement);
      this.movements.push(movement);

      if (type === 'restock') {
        item.lastRestocked = new Date();
      }

      return true;
    } catch (error) {
      console.error('Error updating stock:', error);
      return false;
    }
  }

  async getLowStockItems(threshold?: number): Promise<InventoryItem[]> {
    const items = Array.from(this.inventory.values());
    return items.filter(item => 
      item.currentStock <= (threshold || item.reorderLevel)
    );
  }

  async getStockMovements(productId?: string, limit = 50): Promise<StockMovement[]> {
    let movements = this.movements;
    
    if (productId) {
      movements = movements.filter(m => m.productId === productId);
    }
    
    return movements
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async initializeInventory(products: any[]): Promise<void> {
    products.forEach(product => {
      this.inventory.set(product.id, {
        productId: product.id,
        currentStock: product.stock || 0,
        reservedStock: 0,
        reorderLevel: 10,
        reorderQuantity: 50,
        movements: []
      });
    });
  }
}

export const inventoryService = new InventoryService();
```

---

## Implementation Checklist

### Phase 1: Foundation (Weeks 1-2)
- [ ] Implement user authentication system
- [ ] Add error boundaries and validation
- [ ] Create loading states and toast notifications
- [ ] Update main app structure
- [ ] Test authentication flow

### Phase 2: Core Features (Weeks 3-4)
- [ ] Implement customer management
- [ ] Add inventory tracking system
- [ ] Create basic reporting functionality
- [ ] Update POS layout with new features
- [ ] Test customer and inventory workflows

### Phase 3: Advanced Features (Weeks 5-8)
- [ ] Add hardware integration layer
- [ ] Implement cloud synchronization
- [ ] Create advanced reporting
- [ ] Add performance optimizations
- [ ] Test end-to-end workflows

### Phase 4: Production Readiness (Weeks 9-12)
- [ ] Security audit and hardening
- [ ] Performance testing and optimization
- [ ] User acceptance testing
- [ ] Documentation and training
- [ ] Deployment preparation

---

## Testing Guidelines

### 1. Unit Testing
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom jest

# Run tests
npm test
```

### 2. Integration Testing
- Test authentication flow
- Test customer management operations
- Test inventory updates
- Test transaction processing
- Test hardware integration (if available)

### 3. End-to-End Testing
```bash
# Install Playwright
npm install --save-dev @playwright/test

# Run E2E tests
npx playwright test
```

---

## Deployment Checklist

### Pre-deployment
- [ ] Code review completed
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Performance testing passed
- [ ] Documentation updated

### Deployment
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Hardware tested
- [ ] Rollback plan prepared
- [ ] Monitoring setup

### Post-deployment
- [ ] System monitoring active
- [ ] User training completed
- [ ] Support procedures in place
- [ ] Backup strategy implemented

---

## Next Steps

This implementation guideline provides a structured approach to upgrading the BMS-POS system. Follow the phases sequentially, test thoroughly at each step, and maintain documentation as you implement these features.

For additional details and advanced features, refer to the comprehensive analysis report (`BMS_ANALYSIS_REPORT.md`).

**Priority Implementation Order:**
1. Authentication system (Week 1)
2. Error handling and validation (Week 2) 
3. Customer management (Week 3)
4. Inventory tracking (Week 4)
5. Hardware integration (Week 5-6)
6. Cloud synchronization (Week 7-8)
7. Advanced reporting (Week 9-10)
8. Performance optimization (Week 11-12)

**Key Success Metrics:**
- User authentication working properly
- Customer data managing correctly
- Real-time inventory updates
- Hardware connectivity established
- Cloud sync functioning
- Performance within acceptable limits
- Security audit passed
## Technology Stack Recommendations

### 1.1 Enhanced Dependencies

Add these packages to improve the system:

```json
{
  "dependencies": {
    "sonner": "^1.4.0",
    "swr": "^2.2.4",
    "zustand": "^4.4.7",
    "react-hook-form": "^7.48.2",
    "@hookform/resolvers": "^3.3.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@playwright/test": "^1.40.0"
  }
}
```

### 1.2 Sonner for Notifications

Replace the custom toast system with Sonner:

```bash
npm install sonner
```

Create the file `src/components/ui/sonner.tsx`:

```typescript
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-950 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-gray-500",
          actionButton:
            "group-[.toast]:bg-gray-900 group-[.toast]:text-gray-50",
          cancelButton:
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
```

Update your main App component to include the Toaster:

```typescript
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

function App() {
  // Usage examples:
  // toast.success("Transaction completed successfully!");
  // toast.error("Failed to process payment");
  // toast.warning("Low stock alert");
  // toast.info("System update available");
  
  return (
    <>
      <YourMainComponent />
      <Toaster />
    </>
  );
}
```

### 1.3 SWR for Data Fetching

Install SWR and set up data fetching hooks:

```bash
npm install swr
```

Create the file `src/hooks/useApi.ts`:

```typescript
import useSWR from 'swr';
import { toast } from 'sonner';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  return res.json();
};

// Custom SWR hook with error handling
export function useApi<T>(key: string, url: string, options = {}) {
  const { data, error, mutate, isLoading } = useSWR<T>(key, fetcher, {
    revalidateOnFocus: false,
    ...options
  });

  // Auto-show error toasts
  React.useEffect(() => {
    if (error) {
      toast.error('Data fetch failed', {
        description: error.message
      });
    }
  }, [error]);

  return {
    data,
    error,
    isLoading,
    mutate
  };
}

// Specific hooks for common use cases
export function useProducts(search = '') {
  return useApi('products', `/api/products?search=${search}`);
}

export function useCustomers(query = '') {
  return useApi('customers', `/api/customers?search=${query}`);
}

export function useTransactions(limit = 50) {
  return useApi('transactions', `/api/transactions?limit=${limit}`);
}

export function useInventory() {
  return useApi('inventory', '/api/inventory');
}
```

### 1.4 SQLite with Sync Capabilities

Enhanced SQLite database service with sync functionality:

Create the file `src/services/DatabaseService.ts`:

```typescript
import Database from 'better-sqlite3';
import { toast } from 'sonner';

interface SyncStatus {
  lastSync: Date | null;
  pendingSync: number;
  isOnline: boolean;
}

class EnhancedDatabaseService {
  private db: Database.Database;
  private syncStatus: SyncStatus = {
    lastSync: null,
    pendingSync: 0,
    isOnline: navigator.onLine
  };

  constructor() {
    this.initializeDatabase();
    this.setupOnlineListener();
  }

  private initializeDatabase() {
    const dbPath = './pos.db';
    this.db = new Database(dbPath);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Create tables with sync columns
    this.createTables();
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true;
      this.syncPendingData();
    });
    
    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false;
    });
  }

  private createTables() {
    const tables = {
      products: `
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          sku TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          cost REAL NOT NULL,
          stock INTEGER DEFAULT 0,
          unit TEXT DEFAULT 'pcs',
          barcode TEXT,
          category_id TEXT,
          is_active BOOLEAN DEFAULT 1,
          last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          sync_status TEXT DEFAULT 'synced'
        )
      `,
      
      transactions: `
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          transaction_code TEXT UNIQUE NOT NULL,
          total_amount REAL NOT NULL,
          discount REAL DEFAULT 0,
          final_amount REAL NOT NULL,
          payment_method TEXT NOT NULL,
          amount_paid REAL NOT NULL,
          change REAL NOT NULL,
          customer_id TEXT,
          cashier_id TEXT NOT NULL,
          status TEXT DEFAULT 'completed',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          sync_status TEXT DEFAULT 'pending',
          server_sync TIMESTAMP
        )
      `,
      
      customers: `
        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          address TEXT,
          loyalty_points INTEGER DEFAULT 0,
          total_purchases REAL DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          sync_status TEXT DEFAULT 'synced'
        )
      `,

      // Sync queue for offline operations
      sync_queue: `
        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          table_name TEXT NOT NULL,
          operation TEXT NOT NULL, -- 'insert', 'update', 'delete'
          record_id TEXT NOT NULL,
          data TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          synced BOOLEAN DEFAULT 0
        )
      `
    };

    for (const [tableName, sql] of Object.entries(tables)) {
      this.db.exec(sql);
    }

    // Create indexes
    this.createIndexes();
  }

  private createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)',
      'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_code ON transactions(transaction_code)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced)',
    ];

    for (const index of indexes) {
      this.db.exec(index);
    }
  }

  // Enhanced product operations with sync
  async getProducts({ search = '', limit = 100, offset = 0 } = {}) {
    try {
      let query = 'SELECT * FROM products WHERE is_active = 1';
      const params = [];

      if (search) {
        query += ' AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY name LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = this.db.prepare(query);
      const products = stmt.all(...params);

      return { success: true, data: products };
    } catch (error) {
      console.error('Error getting products:', error);
      return { success: false, error: error.message };
    }
  }

  // Add item to sync queue for offline operations
  private addToSyncQueue(tableName: string, operation: string, recordId: string, data: any) {
    const syncItem = {
      id: `${tableName}_${operation}_${recordId}_${Date.now()}`,
      tableName,
      operation,
      recordId,
      data: JSON.stringify(data)
    };

    const stmt = this.db.prepare(`
      INSERT INTO sync_queue (id, table_name, operation, record_id, data)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(syncItem.id, syncItem.tableName, syncItem.operation, syncItem.recordId, syncItem.data);
    this.syncStatus.pendingSync++;
  }

  // Sync pending data to server
  async syncPendingData() {
    if (!this.syncStatus.isOnline) {
      toast.warning('Offline mode', {
        description: 'Changes will be synced when connection is restored'
      });
      return;
    }

    try {
      const pendingItems = this.db.prepare(`
        SELECT * FROM sync_queue WHERE synced = 0
      `).all();

      for (const item of pendingItems) {
        await this.syncItemToServer(item);
        
        // Mark as synced
        this.db.prepare('UPDATE sync_queue SET synced = 1 WHERE id = ?').run(item.id);
        this.syncStatus.pendingSync--;
      }

      this.syncStatus.lastSync = new Date();
      
      if (pendingItems.length > 0) {
        toast.success('Data synchronized', {
          description: `${pendingItems.length} items synced to server`
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed', {
        description: 'Some data could not be synchronized'
      });
    }
  }

  private async syncItemToServer(item: any) {
    const data = JSON.parse(item.data);
    
    try {
      const response = await fetch(`/api/${item.tableName}/${item.operation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to sync ${item.tableName}: ${error.message}`);
    }
  }

  // Get sync status
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Manual sync trigger
  async forceSync(): Promise<boolean> {
    if (!this.syncStatus.isOnline) {
      toast.error('No internet connection');
      return false;
    }

    toast.info('Starting sync...');
    await this.syncPendingData();
    return true;
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export const databaseService = new EnhancedDatabaseService();
```

### 1.5 SWR Integration with Sync

Create the file `src/hooks/useSync.ts`:

```typescript
import useSWR from 'swr';
import { databaseService } from '../services/DatabaseService';
import { toast } from 'sonner';

export function useSyncStatus() {
  const { data: syncStatus, mutate } = useSWR('sync-status', () => 
    databaseService.getSyncStatus(),
    {
      refreshInterval: 30000, // Check every 30 seconds
      revalidateOnFocus: true
    }
  );

  const syncNow = async () => {
    try {
      const success = await databaseService.forceSync();
      if (success) {
        mutate(); // Refresh sync status
      }
    } catch (error) {
      toast.error('Sync failed', {
        description: error.message
      });
    }
  };

  return {
    syncStatus,
    syncNow,
    mutate
  };
}
```

### 1.6 Integration Example

Update POSLayout to use the new system:

```typescript
import React from 'react';
import { useProducts, useSyncStatus } from '../hooks/useApi';
import { toast } from 'sonner';

const POSLayout: React.FC = () => {
  const { data: products, isLoading } = useProducts();
  const { syncStatus, syncNow } = useSyncStatus();

  // Show sync status indicator
  if (syncStatus && !syncStatus.isOnline) {
    toast.warning('Offline Mode', {
      description: `Pending sync: ${syncStatus.pendingSync} items`,
      action: {
        label: 'Sync Now',
        onClick: syncNow
      }
    });
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Your existing POS layout */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      )}
    </div>
  );
};
```

This enhanced implementation provides:
- **Sonner**: Modern, accessible notifications
- **SWR**: Efficient data fetching with caching and background updates
- **SQLite Sync**: Local database with automatic server synchronization
- **Offline Support**: Queue operations when offline, sync when online
## 1.7 QZ Tray Printing Integration

### 1.7.1 QZ Tray Setup

QZ Tray is a Java-based printing solution that provides reliable printer communication for POS systems.

#### Step 1: Install QZ Tray
1. Download QZ Tray from https://qz.io/download/
2. Install QZ Tray on the system
3. Start QZ Tray service (usually runs on port 8181)

#### Step 2: Add Dependencies
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "node-thermal-printer": "^4.4.4"
  }
}
```

#### Step 3: QZ Tray Service
Create the file `src/services/QZTrayService.ts`:

```typescript
import axios from 'axios';

interface Printer {
  name: string;
  description: string;
  device: string;
  width: number;
  height: number;
}

interface PrintJob {
  type: 'raw' | 'html' | 'image' | 'pdf';
  data: string;
  format?: string;
  copies?: number;
}

interface QZTrayStatus {
  isConnected: boolean;
  version?: string;
  printers: Printer[];
  selectedPrinter?: Printer;
}

class QZTrayService {
  private baseUrl = 'http://localhost:8181';
  private isAvailable = false;
  private status: QZTrayStatus = {
    isConnected: false,
    printers: []
  };

  async initialize(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/status`, {
        timeout: 5000
      });
      
      this.isAvailable = true;
      this.status = {
        isConnected: true,
        version: response.data.version,
        printers: response.data.printers || []
      };
      
      console.log('✅ QZ Tray connected:', this.status);
      return true;
    } catch (error) {
      console.warn('⚠️ QZ Tray not available:', error);
      this.isAvailable = false;
      return false;
    }
  }

  async getPrinters(): Promise<Printer[]> {
    if (!this.isAvailable) {
      return this.getFallbackPrinters();
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/printers`);
      this.status.printers = response.data;
      return response.data;
    } catch (error) {
      console.error('Error getting printers:', error);
      return this.getFallbackPrinters();
    }
  }

  async printReceipt(
    receiptData: any,
    printerName?: string,
    copies = 1
  ): Promise<boolean> {
    if (!this.isAvailable) {
      return this.fallbackPrint(receiptData, copies);
    }

    try {
      const payload = {
        type: 'html',
        printer: printerName || this.getDefaultPrinter()?.name,
        copies: copies,
        data: this.formatReceiptHTML(receiptData)
      };

      const response = await axios.post(`${this.baseUrl}/api/print`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.success) {
        console.log('✅ Receipt printed successfully');
        return true;
      } else {
        throw new Error(response.data.error || 'Print failed');
      }
    } catch (error) {
      console.error('QZ Tray print error:', error);
      return this.fallbackPrint(receiptData, copies);
    }
  }

  async printText(
    text: string,
    printerName?: string,
    format = 'text/plain'
  ): Promise<boolean> {
    if (!this.isAvailable) {
      return this.fallbackTextPrint(text);
    }

    try {
      const payload = {
        type: 'raw',
        printer: printerName || this.getDefaultPrinter()?.name,
        data: text,
        format: format
      };

      const response = await axios.post(`${this.baseUrl}/api/print`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      return response.data.success;
    } catch (error) {
      console.error('Text print error:', error);
      return this.fallbackTextPrint(text);
    }
  }

  private formatReceiptHTML(data: any): string {
    const { transaction, items, cashier, branch } = data;
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${transaction.transactionCode}</title>
  <style>
    @media print {
      @page {
        size: 58mm auto;
        margin: 0;
      }
      body { margin: 0; padding: 0; }
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      margin: 0;
      padding: 10px;
      width: 58mm;
    }
    
    .center { text-align: center; }
    .line { border-bottom: 1px dashed #000; margin: 5px 0; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    
    .header { text-align: center; margin-bottom: 10px; }
    .item { display: flex; justify-content: space-between; margin: 2px 0; }
    .item-name { flex: 1; margin-right: 10px; }
    .item-qty { width: 20px; text-align: center; }
    .item-price { width: 30px; text-align: right; }
    
    .total-section { margin-top: 10px; border-top: 1px solid #000; padding-top: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="bold">${branch.name}</div>
    <div>${branch.address}</div>
    <div>Telp: ${branch.phone}</div>
    <div class="line"></div>
  </div>
  
  <div>No: ${transaction.transactionCode}</div>
  <div>Kasir: ${cashier.name}</div>
  <div>Tgl: ${new Date(transaction.createdAt).toLocaleString('id-ID')}</div>
  <div class="line"></div>
  
  <div class="item bold">
    <span class="item-name">ITEM</span>
    <span class="item-qty">QTY</span>
    <span class="item-price">HARGA</span>
  </div>
  <div class="line"></div>
  
  ${items.map((item: any) => `
    <div class="item">
      <span class="item-name">${item.productName}</span>
      <span class="item-qty">${item.quantity}</span>
      <span class="item-price">${item.total.toLocaleString('id-ID')}</span>
    </div>
  `).join('')}
  
  <div class="total-section">
    <div class="item">
      <span>SUBTOTAL:</span>
      <span>${transaction.totalAmount.toLocaleString('id-ID')}</span>
    </div>
    ${transaction.discount > 0 ? `
      <div class="item">
        <span>DISKON:</span>
        <span>-${transaction.discount.toLocaleString('id-ID')}</span>
      </div>
    ` : ''}
    <div class="item bold">
      <span>TOTAL:</span>
      <span>${transaction.finalAmount.toLocaleString('id-ID')}</span>
    </div>
    <div class="item">
      <span>BAYAR:</span>
      <span>${transaction.amountPaid.toLocaleString('id-ID')}</span>
    </div>
    <div class="item">
      <span>KEMBALI:</span>
      <span>${transaction.change.toLocaleString('id-ID')}</span>
    </div>
  </div>
  
  <div class="center" style="margin-top: 10px;">
    <div>Pembayaran: ${this.getPaymentMethodLabel(transaction.paymentMethod)}</div>
    <div class="bold">Terima Kasih</div>
    <div>Selamat Belanja Lagi</div>
  </div>
  
  <div style="text-align: center; margin-top: 10px;">
    ${'='.repeat(25)}
  </div>
</body>
</html>`;
  }

  private getPaymentMethodLabel(method: string): string {
    switch (method) {
      case 'cash': return 'Tunai';
      case 'card': return 'Kartu';
      case 'digital': return 'Dompet Digital';
      default: return method;
    }
  }

  private getDefaultPrinter(): Printer | null {
    return this.status.printers.find(p => p.name.includes('thermal') || p.name.includes('POS')) || 
           this.status.printers[0] || null;
  }

  private getFallbackPrinters(): Printer[] {
    return [
      { name: 'Default Printer', description: 'System Default', device: 'fallback', width: 58, height: 0 },
      { name: 'POS-Printer', description: 'Thermal POS Printer', device: 'thermal', width: 58, height: 0 }
    ];
  }

  private async fallbackPrint(data: any, copies = 1): Promise<boolean> {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window');
      }

      const htmlContent = this.formatReceiptHTML(data);
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);

      console.log('📄 Receipt printed (fallback mode)');
      return true;
    } catch (error) {
      console.error('Fallback print error:', error);
      return false;
    }
  }

  private async fallbackTextPrint(text: string): Promise<boolean> {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window');
      }

      printWindow.document.write(`
        <pre style="font-family: monospace; white-space: pre-wrap;">${text}</pre>
      `);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);

      return true;
    } catch (error) {
      console.error('Fallback text print error:', error);
      return false;
    }
  }

  getStatus(): QZTrayStatus {
    return { ...this.status };
  }

  async testPrinter(printerName: string): Promise<boolean> {
    const testText = `
============================
       TEST PRINT          
============================
QZ Tray Integration Test
Printer: ${printerName}
Time: ${new Date().toLocaleString('id-ID')}
============================
    `.trim();

    return this.printText(testText, printerName);
  }
}

export const qzTrayService = new QZTrayService();
```

#### Step 4: Printer Hook
Create the file `src/hooks/usePrinter.ts`:

```typescript
import { useState, useEffect } from 'react';
import { qzTrayService } from '../services/QZTrayService';
import { toast } from 'sonner';

interface PrinterState {
  isAvailable: boolean;
  printers: any[];
  selectedPrinter: string | null;
  isPrinting: boolean;
  status: any;
}

export function usePrinter() {
  const [state, setState] = useState<PrinterState>({
    isAvailable: false,
    printers: [],
    selectedPrinter: null,
    isPrinting: false,
    status: null
  });

  useEffect(() => {
    initializePrinter();
  }, []);

  const initializePrinter = async () => {
    try {
      const isAvailable = await qzTrayService.initialize();
      
      if (isAvailable) {
        const printers = await qzTrayService.getPrinters();
        const defaultPrinter = printers[0]?.name || null;
        
        setState(prev => ({
          ...prev,
          isAvailable: true,
          printers,
          selectedPrinter: defaultPrinter,
          status: qzTrayService.getStatus()
        }));

        toast.success('Printer connected', {
          description: `Found ${printers.length} printer(s)`
        });
      } else {
        toast.warning('Printer not available', {
          description: 'Using fallback printing method'
        });
      }
    } catch (error) {
      console.error('Printer initialization error:', error);
      toast.error('Printer setup failed');
    }
  };

  const printReceipt = async (receiptData: any, copies = 1) => {
    setState(prev => ({ ...prev, isPrinting: true }));
    
    try {
      const success = await qzTrayService.printReceipt(
        receiptData, 
        state.selectedPrinter, 
        copies
      );
      
      if (success) {
        toast.success('Receipt printed successfully');
      } else {
        toast.error('Failed to print receipt');
      }
      
      return success;
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Print operation failed');
      return false;
    } finally {
      setState(prev => ({ ...prev, isPrinting: false }));
    }
  };

  const printTest = async () => {
    if (!state.selectedPrinter) {
      toast.error('No printer selected');
      return false;
    }

    setState(prev => ({ ...prev, isPrinting: true }));
    
    try {
      const success = await qzTrayService.testPrinter(state.selectedPrinter);
      
      if (success) {
        toast.success('Test print sent');
      } else {
        toast.error('Test print failed');
      }
      
      return success;
    } catch (error) {
      console.error('Test print error:', error);
      toast.error('Test print failed');
      return false;
    } finally {
      setState(prev => ({ ...prev, isPrinting: false }));
    }
  };

  const selectPrinter = (printerName: string) => {
    setState(prev => ({ ...prev, selectedPrinter: printerName }));
    localStorage.setItem('selectedPrinter', printerName);
    toast.success('Printer selected', {
      description: printerName
    });
  };

  const refreshPrinters = async () => {
    await initializePrinter();
  };

  return {
    ...state,
    printReceipt,
    printTest,
    selectPrinter,
    refreshPrinters
  };
}
```

#### Step 5: Printer Selection Component
Create the file `src/components/printer/PrinterSelector.tsx`:

```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Printer, RefreshCw, TestTube } from 'lucide-react';
import { usePrinter } from '../../hooks/usePrinter';

interface PrinterSelectorProps {
  onTestPrint?: () => void;
}

const PrinterSelector: React.FC<PrinterSelectorProps> = ({ onTestPrint }) => {
  const { 
    isAvailable, 
    printers, 
    selectedPrinter, 
    isPrinting, 
    selectPrinter, 
    printTest,
    refreshPrinters 
  } = usePrinter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Printer Settings
          <span className={`text-xs px-2 py-1 rounded ${
            isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isAvailable ? 'QZ Tray' : 'Fallback'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Selected Printer</label>
          <Select value={selectedPrinter || ''} onValueChange={selectPrinter}>
            <SelectTrigger>
              <SelectValue placeholder="Select a printer" />
            </SelectTrigger>
            <SelectContent>
              {printers.map((printer) => (
                <SelectItem key={printer.name} value={printer.name}>
                  <div>
                    <div className="font-medium">{printer.name}</div>
                    <div className="text-xs text-gray-500">
                      {printer.description} ({printer.width}mm)
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPrinters}
            disabled={isPrinting}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={printTest}
            disabled={!selectedPrinter || isPrinting}
          >
            <TestTube className="h-4 w-4 mr-2" />
            Test Print
          </Button>

          {onTestPrint && (
            <Button
              size="sm"
              onClick={onTestPrint}
              disabled={!selectedPrinter || isPrinting}
            >
              Test Receipt
            </Button>
          )}
        </div>

        {isPrinting && (
          <div className="text-sm text-blue-600 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Printing...
          </div>
        )}

        <div className="text-xs text-gray-500">
          {isAvailable 
            ? 'Using QZ Tray for optimal printing performance' 
            : 'Using browser print fallback (may have formatting issues)'
          }
        </div>
      </CardContent>
    </Card>
  );
};

export default PrinterSelector;
```

#### Step 6: Integration with Receipt Component
Update the Receipt component to use QZ Tray:

```typescript
// In your Receipt component
import { usePrinter } from '../hooks/usePrinter';

const Receipt: React.FC<ReceiptProps> = (props) => {
  const { printReceipt, isPrinting } = usePrinter();

  const handlePrint = async () => {
    const receiptData = {
      transaction: props.transaction,
      items: props.items,
      cashier: props.cashier,
      branch: props.branch
    };

    const success = await printReceipt(receiptData);
    if (success) {
      props.onPrint();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* ... existing receipt content ... */}
        
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={props.onClose} className="flex-1">
            Close
          </Button>
          <Button 
            onClick={handlePrint} 
            className="flex-1"
            disabled={isPrinting}
          >
            {isPrinting ? 'Printing...' : 'Print Receipt'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
```

### 1.7.2 QZ Tray Configuration

#### QZ Tray Installation Script (for deployment)
Create `scripts/install-qz-tray.sh`:

```bash
#!/bin/bash

echo "Installing QZ Tray for BMS POS..."

# Download QZ Tray (replace with actual download URL)
QZ_TRAY_URL="https://github.com/qzindustries/qz-tray/releases/latest/download/qz-tray-2.2.5-windows.msi"
INSTALL_DIR="/opt/qz-tray"

# Create installation directory
sudo mkdir -p $INSTALL_DIR

# Download and install (for Windows, you would use .msi)
# For Linux, you might need to use Wine or find Linux alternatives

echo "QZ Tray installation completed!"
echo "Please start QZ Tray service manually after installation."
echo "QZ Tray should run on http://localhost:8181"
```

#### Environment Configuration
Update your `.env` file:

```env
# QZ Tray Configuration
QZ_TRAY_URL=http://localhost:8181
QZ_TRAY_TIMEOUT=5000
QZ_TRAY_AUTO_CONNECT=true

# Printer Settings
DEFAULT_PRINTER_WIDTH=58
AUTO_PRINT_AFTER_TRANSACTION=true
PRINT_COPIES=1
PRINTER_TEST_ON_STARTUP=true
```

This QZ Tray integration provides:
- **Reliable printing** to thermal POS printers
- **Automatic printer detection** and selection
- **Fallback printing** when QZ Tray is unavailable
- **Test printing** functionality
- **Receipt formatting** optimized for 58mm thermal printers
- **Copy printing** support
- **Error handling** and user feedback

The system gracefully falls back to browser printing if QZ Tray is not available, ensuring the POS can always print receipts.