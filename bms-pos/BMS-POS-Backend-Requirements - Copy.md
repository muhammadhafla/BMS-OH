# BMS POS Backend API Requirements
## Documentation untuk Backend Development Team

### 📋 Document Information
- **Project**: BMS POS Electron Application Backend
- **Version**: 1.0
- **Date**: 2025-11-17
- **Audience**: Backend Development Team
- **Status**: Requirements Specification

---

## 🎯 Executive Summary

Dokumen ini berisi requirements lengkap untuk backend API yang mendukung aplikasi POS Electron BMS. Backend harus menyediakan semua endpoint, business logic, dan data management yang diperlukan untuk 8 fitur utama POS.

---

## 🏗️ System Architecture Overview

### Technology Stack Requirements
- **Database**: PostgreSQL dengan proper indexing
- **API**: RESTful API dengan JSON responses
- **Authentication**: JWT-based authentication
- **Payment Gateway**: Integration dengan payment providers
- **File Storage**: Image storage untuk product photos dan receipt templates
- **Audit Trail**: Complete transaction logging

### Data Flow
```
POS App ↔ Backend API ↔ Database
       ↔ Payment Gateway
       ↔ Email/SMS Service
       ↔ Third-party Integrations
```

---

## 🔐 Authentication & Authorization

### Authentication Flow
**POST /api/auth/login**
```json
Request: {
  "email": "cashier1@bms.com",
  "password": "password123"
}

Response: {
  "success": true,
  "data": {
    "user": {
      "id": "user_uuid",
      "username": "cashier1",
      "role": "cashier",
      "branch_id": "branch_uuid",
      "permissions": ["view_products", "create_transaction"]
    },
    "token": "jwt_token_here",
    "expires_at": "2025-11-17T08:46:35Z"
  }
}
```

### JWT Token Requirements
- Token format: JWT with HS256 algorithm
- Token expiry: 24 hours (configurable)
- Refresh token support
- Role-based claims dalam token payload

### User Roles & Permissions
```javascript
// RBAC Structure
const Roles = {
  ADMIN: {
    permissions: ["*"], // All permissions
    description: "Full system access"
  },
  MANAGER: {
    permissions: [
      "view_reports", "manage_inventory", "view_analytics",
      "manage_shifts", "override_transactions"
    ],
    description: "Store management"
  },
  CASHIER: {
    permissions: [
      "view_products", "create_transaction", "view_receipt",
      "hold_transactions", "manage_own_shift"
    ],
    description: "Point of sale operations"
  }
};
```

---

## 🗄️ Database Schema Requirements

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'cashier') NOT NULL,
  branch_id UUID REFERENCES branches(id),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_role ON users(role);
```

#### Branches Table
```sql
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  tax_id VARCHAR(50),
  logo_url VARCHAR(255),
  receipt_template_id UUID REFERENCES receipt_templates(id),
  settings JSONB DEFAULT '{}', -- Store additional settings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Products Table
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  barcode VARCHAR(50) UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(15,2) NOT NULL,
  cost DECIMAL(15,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'pcs',
  category_id UUID REFERENCES categories(id),
  branch_id UUID REFERENCES branches(id) NOT NULL,
  image_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_products_branch ON products(branch_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_active ON products(is_active);
```

#### Categories Table
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  branch_id UUID REFERENCES branches(id) NOT NULL,
  parent_id UUID REFERENCES categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_branch ON categories(branch_id);
```

#### Transactions Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_code VARCHAR(50) UNIQUE NOT NULL,
  cashier_id UUID REFERENCES users(id) NOT NULL,
  branch_id UUID REFERENCES branches(id) NOT NULL,
  shift_id UUID REFERENCES shifts(id),
  customer_id UUID NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  discount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  final_amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- cash, card, qris, split
  amount_paid DECIMAL(15,2) NOT NULL,
  change_amount DECIMAL(15,2) DEFAULT 0,
  status ENUM('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED') DEFAULT 'COMPLETED',
  notes TEXT,
  synced_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_transactions_cashier ON transactions(cashier_id);
CREATE INDEX idx_transactions_branch ON transactions(branch_id);
CREATE INDEX idx_transactions_code ON transactions(transaction_code);
CREATE INDEX idx_transactions_created ON transactions(created_at);
```

#### Transaction Items Table
```sql
CREATE TABLE transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  discount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_product ON transaction_items(product_id);
```

#### Payment Details Table (for split payments)
```sql
CREATE TABLE payment_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  payment_method VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  reference_number VARCHAR(100), -- for card payments, QRIS, etc.
  status ENUM('PENDING', 'COMPLETED', 'FAILED') DEFAULT 'COMPLETED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Shifts Table
```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID REFERENCES users(id) NOT NULL,
  branch_id UUID REFERENCES branches(id) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NULL,
  opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(15,2) NULL,
  expected_cash DECIMAL(15,2) NULL,
  actual_cash DECIMAL(15,2) NULL,
  shortage_surplus DECIMAL(15,2) NULL,
  status ENUM('OPEN', 'CLOSED', 'SUSPENDED') DEFAULT 'OPEN',
  notes TEXT,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shifts_cashier ON shifts(cashier_id);
CREATE INDEX idx_shifts_branch ON shifts(branch_id);
CREATE INDEX idx_shifts_status ON shifts(status);
```

#### Cash Movements Table
```sql
CREATE TABLE cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  type ENUM('OPENING', 'SALE', 'EXPENSE', 'ADJUSTMENT', 'CLOSING') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(50), -- for sales: cash, card, qris
  transaction_id UUID REFERENCES transactions(id),
  description TEXT,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cash_movements_shift ON cash_movements(shift_id);
CREATE INDEX idx_cash_movements_type ON cash_movements(type);
```

#### Expenses Table
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL, -- petty_cash, damaged_goods, sample, etc
  amount DECIMAL(15,2) NOT NULL,
  reason TEXT NOT NULL,
  receipt_number VARCHAR(100),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_shift ON expenses(shift_id);
```

#### Held Transactions Table
```sql
CREATE TABLE held_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_number VARCHAR(20) UNIQUE NOT NULL, -- HOLD-001, HOLD-002, etc
  cashier_id UUID REFERENCES users(id) NOT NULL,
  branch_id UUID REFERENCES branches(id) NOT NULL,
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(100),
  items_data JSONB NOT NULL, -- Snapshot of cart items
  total_amount DECIMAL(15,2) NOT NULL,
  discount DECIMAL(15,2) DEFAULT 0,
  final_amount DECIMAL(15,2) NOT NULL,
  priority INTEGER DEFAULT 0, -- 0=normal, 1=urgent
  status ENUM('HELD', 'RETRIEVED', 'EXPIRED', 'DELETED') DEFAULT 'HELD',
  hold_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  retrieved_timestamp TIMESTAMP NULL,
  expires_at TIMESTAMP, -- hold_timestamp + 24 hours
  notes TEXT
);

CREATE INDEX idx_held_transactions_cashier ON held_transactions(cashier_id);
CREATE INDEX idx_held_transactions_branch ON held_transactions(branch_id);
CREATE INDEX idx_held_transactions_status ON held_transactions(status);
CREATE INDEX idx_held_transactions_expires ON held_transactions(expires_at);
```

#### Receipt Templates Table
```sql
CREATE TABLE receipt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  template_config JSONB NOT NULL, -- Template structure
  theme_config JSONB, -- Colors, fonts, layout
  format_type ENUM('thermal', 'a4', 'fr3') NOT NULL,
  is_active BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Sync Log Table
```sql
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  data_before JSONB,
  data_after JSONB,
  synced_at TIMESTAMP NULL,
  sync_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_log_table ON sync_log(table_name);
CREATE INDEX idx_sync_log_synced ON sync_log(synced_at);
```

---

## 🔌 API Endpoints Specification

### 1. Authentication Endpoints

#### POST /api/auth/login
```json
// Request
{
  "email": "cashier1@bms.com",
  "password": "password123"
}

// Response
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "token": "jwt_token",
    "expires_at": "2025-11-17T08:46:35Z"
  }
}
```

#### POST /api/auth/logout
```json
// Request (with Authorization header)
{
  "refresh_token": "refresh_token_here"
}

// Response
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /api/auth/me
```json
// Response
{
  "success": true,
  "data": {
    "user": { /* current user object */ },
    "branch": { /* branch info */ }
  }
}
```

### 2. Product Management Endpoints

#### GET /api/products
```json
// Query Parameters
{
  "search": "coffee", // optional
  "branch_id": "uuid", // optional, auto-filtered by user branch
  "category_id": "uuid", // optional
  "page": 1, // optional, default 1
  "limit": 50, // optional, default 50
  "low_stock": false // optional, filter low stock items
}

// Response
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "sku": "PROD001",
        "name": "Coffee",
        "price": 15000,
        "cost": 12000,
        "stock": 25,
        "unit": "cups",
        "barcode": "123456789",
        "category": {
          "id": "uuid",
          "name": "Beverages"
        },
        "last_sync": "2025-11-17T04:46:35Z"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 50,
      "totalPages": 3
    },
    "meta": {
      "filters": {
        "isFilteredByBranch": true,
        "userRole": "cashier",
        "userBranchId": "branch_uuid",
        "appliedBranchId": "branch_uuid"
      }
    }
  }
}
```

#### POST /api/products
```json
// Request
{
  "sku": "PROD001",
  "name": "Coffee",
  "price": 15000,
  "cost": 12000,
  "stock": 25,
  "unit": "cups",
  "barcode": "123456789",
  "category_id": "uuid"
}

// Response
{
  "success": true,
  "data": {
    "product": { /* created product */ }
  }
}
```

#### GET /api/products/:id
```json
// Response
{
  "success": true,
  "data": {
    "product": { /* product details */ }
  }
}
```

### 3. Transaction Endpoints

#### POST /api/transactions
```json
// Request
{
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "unitPrice": 15000,
      "discount": 0,
      "total": 30000
    }
  ],
  "totalAmount": 30000,
  "discount": 0,
  "finalAmount": 30000,
  "paymentMethod": "cash", // cash, card, qris, split
  "amountPaid": 35000,
  "change": 5000,
  "paymentDetails": [ // for split payments
    {
      "paymentMethod": "cash",
      "amount": 20000
    },
    {
      "paymentMethod": "card",
      "amount": 10000
    }
  ],
  "notes": "Customer request extra sugar"
}

// Response
{
  "success": true,
  "data": {
    "transaction": {
      "id": "uuid",
      "transactionCode": "TXN-20251117-001",
      "totalAmount": 30000,
      "status": "COMPLETED",
      "createdAt": "2025-11-17T04:46:35Z"
    }
  },
  "message": "Transaction created successfully"
}
```

#### GET /api/transactions
```json
// Query Parameters
{
  "page": 1,
  "limit": 50,
  "startDate": "2025-11-17T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "cashier_id": "uuid", // optional
  "branch_id": "uuid" // optional
}

// Response
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "transactionCode": "TXN-20251117-001",
        "totalAmount": 30000,
        "finalAmount": 30000,
        "paymentMethod": "cash",
        "status": "COMPLETED",
        "createdAt": "2025-11-17T04:46:35Z",
        "cashier": {
          "username": "cashier1"
        }
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 50
    }
  }
}
```

### 4. Inventory Management Endpoints

#### GET /api/inventory/overview
```json
// Query Parameters
{
  "branch_id": "uuid", // optional, auto-filtered
  "category_id": "uuid", // optional
  "low_stock": false, // optional
  "page": 1,
  "limit": 50
}

// Response
{
  "success": true,
  "data": {
    "inventory": [
      {
        "id": "uuid",
        "sku": "PROD001",
        "name": "Coffee",
        "price": 15000,
        "cost": 12000,
        "stock": 25,
        "minStock": 10,
        "stockStatus": "IN_STOCK", // IN_STOCK, LOW_STOCK, OUT_OF_STOCK
        "stockValue": 300000,
        "category": {
          "name": "Beverages"
        }
      }
    ],
    "summary": {
      "totalProducts": 150,
      "lowStockProducts": 5,
      "outOfStockProducts": 2,
      "totalValue": 15000000
    }
  }
}
```

#### GET /api/inventory/low-stock
```json
// Response
{
  "success": true,
  "data": {
    "lowStockProducts": [
      {
        "id": "uuid",
        "name": "Coffee",
        "sku": "PROD001",
        "stock": 5,
        "minStock": 10,
        "stockStatus": "LOW_STOCK",
        "stockValue": 75000,
        "category": {
          "name": "Beverages"
        }
      }
    ],
    "summary": {
      "totalLowStock": 5,
      "criticalCount": 2
    }
  }
}
```

#### POST /api/inventory/adjust
```json
// Request
{
  "productId": "uuid",
  "type": "IN", // IN, OUT, ADJUSTMENT
  "quantity": 10,
  "reason": "Stock replenishment",
  "reference": "PO-2025-001"
}

// Response
{
  "success": true,
  "data": {
    "product": { /* updated product */ },
    "log": {
      "id": "uuid",
      "type": "IN",
      "quantity": 10,
      "reason": "Stock replenishment"
    }
  },
  "message": "Stock adjusted successfully"
}
```

### 5. Shift Management Endpoints

#### POST /api/shifts/open
```json
// Request
{
  "openingBalance": 500000,
  "notes": "Starting shift"
}

// Response
{
  "success": true,
  "data": {
    "shift": {
      "id": "uuid",
      "cashierId": "uuid",
      "branchId": "uuid",
      "startTime": "2025-11-17T04:46:35Z",
      "openingBalance": 500000,
      "status": "OPEN"
    }
  },
  "message": "Shift opened successfully"
}
```

#### POST /api/shifts/:id/close
```json
// Request
{
  "closingBalance": 750000,
  "notes": "Ending shift - all good"
}

// Response
{
  "success": true,
  "data": {
    "shift": {
      "id": "uuid",
      "endTime": "2025-11-17T08:46:35Z",
      "closingBalance": 750000,
      "expectedCash": 750000,
      "actualCash": 750000,
      "shortageSurplus": 0,
      "status": "CLOSED"
    },
    "report": {
      "openingBalance": 500000,
      "cashSales": 200000,
      "cardSales": 50000,
      "expenses": 0,
      "closingBalance": 750000
    }
  },
  "message": "Shift closed successfully"
}
```

#### GET /api/shifts/current
```json
// Response
{
  "success": true,
  "data": {
    "shift": {
      "id": "uuid",
      "startTime": "2025-11-17T04:46:35Z",
      "openingBalance": 500000,
      "status": "OPEN",
      "cashMovements": [
        {
          "type": "SALE",
          "amount": 30000,
          "paymentMethod": "cash"
        }
      ]
    }
  }
}
```

### 6. Hold Transaction Endpoints

#### POST /api/holds
```json
// Request
{
  "customerName": "John Doe",
  "customerPhone": "081234567890",
  "items": [
    {
      "productId": "uuid",
      "productName": "Coffee",
      "quantity": 2,
      "unitPrice": 15000,
      "total": 30000
    }
  ],
  "totalAmount": 30000,
  "priority": 0 // 0=normal, 1=urgent
}

// Response
{
  "success": true,
  "data": {
    "hold": {
      "id": "uuid",
      "holdNumber": "HOLD-001",
      "customerName": "John Doe",
      "totalAmount": 30000,
      "status": "HELD",
      "expiresAt": "2025-11-18T04:46:35Z"
    }
  },
  "message": "Transaction held successfully"
}
```

#### GET /api/holds
```json
// Query Parameters
{
  "status": "HELD", // optional, filter by status
  "customerPhone": "081234567890", // optional
  "page": 1,
  "limit": 50
}

// Response
{
  "success": true,
  "data": {
    "holds": [
      {
        "id": "uuid",
        "holdNumber": "HOLD-001",
        "customerName": "John Doe",
        "customerPhone": "081234567890",
        "totalAmount": 30000,
        "itemCount": 2,
        "holdTimestamp": "2025-11-17T04:46:35Z",
        "expiresAt": "2025-11-18T04:46:35Z",
        "priority": 0
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 50
    }
  }
}
```

#### POST /api/holds/:id/retrieve
```json
// Response
{
  "success": true,
  "data": {
    "transaction": {
      "id": "uuid",
      "items": [
        {
          "productId": "uuid",
          "quantity": 2,
          "unitPrice": 15000,
          "total": 30000
        }
      ],
      "totalAmount": 30000,
      "holdNumber": "HOLD-001"
    }
  },
  "message": "Held transaction retrieved successfully"
}
```

#### DELETE /api/holds/:id
```json
// Response
{
  "success": true,
  "message": "Held transaction deleted successfully"
}
```

### 7. Categories Management Endpoints

#### GET /api/categories
```json
// Response
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "uuid",
        "name": "Beverages",
        "description": "Drinks and beverages",
        "productCount": 25
      }
    ]
  }
}
```

#### POST /api/categories
```json
// Request
{
  "name": "Food",
  "description": "Food items",
  "parentId": null
}

// Response
{
  "success": true,
  "data": {
    "category": { /* created category */ }
  }
}
```

### 8. Receipt Template Management Endpoints

#### GET /api/receipt-templates
```json
// Response
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "uuid",
        "name": "Standard Thermal",
        "formatType": "thermal",
        "isActive": true,
        "version": 1,
        "templateConfig": {
          "header": {
            "logo": true,
            "storeName": true,
            "address": true
          },
          "footer": {
            "thankYou": true,
            "contact": true
          }
        }
      }
    ]
  }
}
```

#### POST /api/receipt-templates
```json
// Request
{
  "name": "Custom Template",
  "templateConfig": {
    "header": {
      "logo": true,
      "storeName": true,
      "address": true,
      "taxId": true
    },
    "body": {
      "items": true,
      "subtotal": true,
      "tax": true,
      "total": true
    },
    "footer": {
      "thankYou": true,
      "contact": true,
      "policies": true
    }
  },
  "themeConfig": {
    "primaryColor": "#1e40af",
    "fontSize": "12px",
    "fontFamily": "Arial"
  },
  "formatType": "thermal"
}

// Response
{
  "success": true,
  "data": {
    "template": { /* created template */ }
  }
}
```

#### PUT /api/receipt-templates/:id
```json
// Request
{
  "name": "Updated Template",
  "templateConfig": { /* updated config */ },
  "isActive": false
}

// Response
{
  "success": true,
  "data": {
    "template": { /* updated template */ }
  }
}
```

### 9. Sync Endpoints

#### POST /api/sync/products
```json
// Request (for offline sync)
{
  "lastSync": "2025-11-17T04:00:00Z",
  "branchId": "uuid"
}

// Response
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "sku": "PROD001",
        "name": "Coffee",
        "price": 15000,
        "stock": 25,
        "lastSync": "2025-11-17T04:46:35Z"
      }
    ],
    "lastSync": "2025-11-17T04:46:35Z"
  }
}
```

#### POST /api/sync/transactions
```json
// Request (upload offline transactions)
{
  "transactions": [
    {
      "localId": "pos_123456789",
      "transactionCode": "TXN-20251117-001",
      "items": [ /* transaction items */ ],
      "totalAmount": 30000,
      "paymentMethod": "cash",
      "createdAt": "2025-11-17T04:46:35Z"
    }
  ]
}

// Response
{
  "success": true,
  "data": {
    "synced": [
      {
        "localId": "pos_123456789",
        "serverId": "uuid",
        "transactionCode": "TXN-20251117-001"
      }
    ],
    "failed": []
  }
}
```

### 10. Health & System Endpoints

#### GET /api/health
```json
// Response
{
  "status": "ok",
  "timestamp": "2025-11-17T04:46:35Z",
  "version": "1.0.0",
  "database": "connected",
  "services": {
    "database": "ok",
    "cache": "ok",
    "payment_gateway": "ok"
  }
}
```

#### GET /api/stats/dashboard
```json
// Response
{
  "success": true,
  "data": {
    "todaySales": {
      "total": 1500000,
      "transactionCount": 45,
      "avgTransaction": 33333
    },
    "topProducts": [
      {
        "productId": "uuid",
        "name": "Coffee",
        "quantity": 25,
        "revenue": 375000
      }
    ],
    "paymentMethods": {
      "cash": 900000,
      "card": 450000,
      "qris": 150000
    }
  }
}
```

---

## 💳 Payment Gateway Integration

### QRIS Integration Requirements
**Provider**: QRIS standard (Bank Indonesia)
**Endpoints needed**:
- Generate QR code for payment
- Check payment status
- Webhook for payment confirmation

### Card Payment Integration
**Provider**: Midtrans, Xendit, atau similar
**Required features**:
- Credit/Debit card processing
- 3D Secure authentication
- Refund support
- Webhook notifications

### Payment Webhook Handler
```javascript
// POST /api/payments/webhook
{
  "event": "payment.success",
  "data": {
    "transaction_id": "uuid",
    "payment_method": "qris",
    "amount": 30000,
    "status": "success",
    "reference": "QRIS_REF_123"
  }
}
```

---

## 📊 Business Logic Requirements

### Transaction Code Generation
```javascript
// Format: TXN-YYYYMMDD-XXX
function generateTransactionCode(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const sequence = await getNextSequence(`TXN-${year}${month}${day}`);
  return `TXN-${year}${month}${day}-${String(sequence).padStart(3, '0')}`;
}
```

### Stock Validation Logic
```javascript
async function validateStockAvailability(items) {
  for (const item of items) {
    const product = await getProduct(item.productId);
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
  }
  return true;
}
```

### Shift Cash Calculation
```javascript
async function calculateExpectedCash(shiftId) {
  const cashMovements = await getCashMovements(shiftId);
  const expenses = await getExpenses(shiftId);
  const shift = await getShift(shiftId);
  
  const cashSales = cashMovements
    .filter(m => m.type === 'SALE' && m.paymentMethod === 'cash')
    .reduce((sum, m) => sum + m.amount, 0);
    
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  return {
    expectedCash: shift.openingBalance + cashSales - totalExpenses,
    cashSales,
    totalExpenses
  };
}
```

### Hold Transaction Auto-Expiration
```javascript
// Cron job to run every hour
async function expireOldHolds() {
  const expiredHolds = await db.query(`
    UPDATE held_transactions 
    SET status = 'EXPIRED' 
    WHERE status = 'HELD' 
    AND expires_at < NOW()
  `);
  
  return expiredHolds.rowCount;
}
```

---

## 🔄 Sync Requirements

### Data Sync Strategy
1. **Products**: Push from server to POS (master data)
2. **Transactions**: Push from POS to server (transactional data)
3. **Inventory**: Bi-directional sync with conflict resolution
4. **Users**: Server to POS (user data)
5. **Settings**: Server to POS (configuration)

### Conflict Resolution Rules
```javascript
const syncRules = {
  products: 'server_wins', // Products are master data
  transactions: 'reject_duplicates', // Prevent duplicate transactions
  inventory: 'server_wins_with_log', // Server wins, log conflicts
  users: 'server_wins', // User data is authoritative
  settings: 'server_wins' // Configuration is authoritative
};
```

### Sync Error Handling
```javascript
{
  "success": false,
  "error": "SYNC_CONFLICT",
  "message": "Data conflict detected",
  "details": {
    "table": "products",
    "record_id": "uuid",
    "conflict_type": "updated_differently",
    "server_data": { /* server version */ },
    "local_data": { /* local version */ }
  }
}
```

---

## 🚀 Performance Requirements

### Database Performance
- Query response time: < 200ms for standard queries
- Index all foreign keys and frequently queried columns
- Connection pooling: minimum 10 connections
- Query optimization for reports and analytics

### API Response Times
- Authentication: < 500ms
- Product search: < 300ms
- Transaction creation: < 1000ms
- Sync operations: < 5000ms for batch operations

### Scalability
- Support 100+ concurrent POS connections per branch
- Handle 10,000+ transactions per day
- Database growth: design for 1M+ products and transactions

---

## 🔒 Security Requirements

### Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all API communications
- Implement rate limiting on API endpoints
- Audit logging for all financial transactions

### Access Control
- Role-based permissions enforced at API level
- Branch-level data isolation
- Session management with secure token storage
- Regular password rotation policies

### Audit Requirements
```sql
-- Audit log for financial transactions
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🧪 Testing Requirements

### API Testing
- Unit tests for all business logic
- Integration tests for database operations
- Performance tests for high-load scenarios
- Security tests for authentication and authorization

### Test Data Setup
```sql
-- Sample data for testing
INSERT INTO branches (name, code, address) VALUES 
('BMS Store Jakarta', 'JKT01', 'Jl. Sudirman No. 123'),
('BMS Store Surabaya', 'SBY01', 'Jl. Tunjungan No. 456');

INSERT INTO users (username, email, role, branch_id) VALUES 
('admin', 'admin@bms.com', 'admin', (SELECT id FROM branches WHERE code = 'JKT01')),
('cashier1', 'cashier1@bms.com', 'cashier', (SELECT id FROM branches WHERE code = 'JKT01'));
```

---

## 📝 Error Handling & Response Standards

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "price",
        "message": "Price must be greater than 0"
      }
    ]
  },
  "timestamp": "2025-11-17T04:46:35Z"
}
```

### Error Codes
```javascript
const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  AUTHORIZATION_DENIED: 'AUTHORIZATION_DENIED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  SYNC_CONFLICT: 'SYNC_CONFLICT',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};
```

---

## 🔧 Development & Deployment

### Environment Configuration
```javascript
// config/database.js
module.exports = {
  development: {
    host: 'localhost',
    database: 'bms_pos_dev',
    username: 'dev_user',
    password: 'dev_pass'
  },
  production: {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    ssl: true
  }
};
```

### Deployment Checklist
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Payment gateway credentials set
- [ ] Backup strategy implemented
- [ ] Monitoring and logging configured
- [ ] Performance testing completed

---

## 📞 Support & Maintenance

### Monitoring Requirements
- Application performance monitoring (APM)
- Database performance monitoring
- API response time tracking
- Error rate monitoring
- Payment gateway status monitoring

### Backup Strategy
- Daily automated database backups
- Point-in-time recovery capability
- Offsite backup storage
- Regular backup restore testing

### Maintenance Windows
- Schedule during low-usage periods
- Communicate planned maintenance to users
- Implement blue-green deployment strategy
- Rollback procedures documented

---

**Document Owner**: Backend Development Team  
**Review Required From**: Technical Lead, DevOps Team, Security Team  
**Last Updated**: 2025-11-17  
**Next Review**: 2025-12-01

---

## 🎯 Implementation Priority

### Phase 1 (Week 1-2): Core APIs
1. Authentication system
2. Product management
3. Basic transaction processing
4. Database schema implementation

### Phase 2 (Week 3-4): Business Logic
1. Shift management
2. Inventory management
3. Hold transactions
4. Payment gateway integration

### Phase 3 (Week 5-6): Advanced Features
1. Receipt template management
2. Sync functionality
3. Reporting and analytics
4. Performance optimization

### Phase 4 (Week 7-8): Production Ready
1. Security hardening
2. Monitoring implementation
3. Load testing
4. Documentation completion

**Total Estimated Timeline: 8 weeks**

---

**Contact Information:**
- Technical Lead: tech.lead@bms.com
- Project Manager: pm@bms.com
- Database Administrator: dba@bms.com