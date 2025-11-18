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

#### Stock Adjustments Table (NEW)
```sql
CREATE TABLE stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  adjustment_type ENUM('IN', 'OUT', 'ADJUSTMENT', 'DAMAGE', 'RETURN', 'LOSS', 'FOUND') NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(15,2),
  reason VARCHAR(100) NOT NULL,
  reference VARCHAR(100),
  notes TEXT,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  created_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP NULL,
  approval_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for stock adjustments
CREATE INDEX idx_stock_adjustments_product ON stock_adjustments(product_id);
CREATE INDEX idx_stock_adjustments_branch ON stock_adjustments(branch_id);
CREATE INDEX idx_stock_adjustments_status ON stock_adjustments(status);
CREATE INDEX idx_stock_adjustments_created ON stock_adjustments(created_at);
CREATE INDEX idx_stock_adjustments_created_by ON stock_adjustments(created_by);
```

#### Low Stock Alerts Table (NEW)
```sql
CREATE TABLE low_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  alert_threshold INTEGER NOT NULL,
  current_stock INTEGER NOT NULL,
  min_stock_level INTEGER NOT NULL,
  status ENUM('ACTIVE', 'DISMISSED', 'RESOLVED') DEFAULT 'ACTIVE',
  alert_type ENUM('LOW_STOCK', 'OUT_OF_STOCK', 'REORDER_POINT') NOT NULL,
  dismissed_by UUID REFERENCES users(id),
  dismissed_at TIMESTAMP NULL,
  dismissed_reason TEXT,
  resolved_at TIMESTAMP NULL,
  resolved_by UUID REFERENCES users(id),
  resolved_notes TEXT,
  auto_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for low stock alerts
CREATE INDEX idx_low_stock_alerts_product ON low_stock_alerts(product_id);
CREATE INDEX idx_low_stock_alerts_branch ON low_stock_alerts(branch_id);
CREATE INDEX idx_low_stock_alerts_status ON low_stock_alerts(status);
CREATE INDEX idx_low_stock_alerts_type ON low_stock_alerts(alert_type);
```

#### Inventory Audits Table (NEW)
```sql
CREATE TABLE inventory_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_number VARCHAR(50) UNIQUE NOT NULL,
  audit_date DATE NOT NULL,
  branch_id UUID NOT NULL REFERENCES branches(id),
  auditor_id UUID NOT NULL REFERENCES users(id),
  status ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PLANNED',
  total_variance DECIMAL(15,2) DEFAULT 0,
  total_expected_value DECIMAL(15,2) DEFAULT 0,
  total_actual_value DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_audits_branch ON inventory_audits(branch_id);
CREATE INDEX idx_inventory_audits_date ON inventory_audits(audit_date);
CREATE INDEX idx_inventory_audits_status ON inventory_audits(status);
```

#### Inventory Audit Items Table (NEW)
```sql
CREATE TABLE inventory_audit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES inventory_audits(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  expected_quantity INTEGER NOT NULL,
  actual_quantity INTEGER NOT NULL,
  variance INTEGER NOT NULL,
  expected_value DECIMAL(15,2) NOT NULL,
  actual_value DECIMAL(15,2) NOT NULL,
  value_variance DECIMAL(15,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_audit_items_audit ON inventory_audit_items(audit_id);
CREATE INDEX idx_inventory_audit_items_product ON inventory_audit_items(product_id);
```

#### Batch Lots Table (NEW)
```sql
CREATE TABLE batch_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  batch_number VARCHAR(100) NOT NULL,
  lot_number VARCHAR(100),
  manufacture_date DATE,
  expiry_date DATE,
  received_date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  remaining_quantity INTEGER NOT NULL,
  unit_cost DECIMAL(15,2) NOT NULL,
  total_cost DECIMAL(15,2) NOT NULL,
  supplier_lot VARCHAR(100),
  status ENUM('ACTIVE', 'EXPIRED', 'RECALLED', 'CONSUMED') DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, branch_id, batch_number)
);

-- Indexes for batch lots
CREATE INDEX idx_batch_lots_product ON batch_lots(product_id);
CREATE INDEX idx_batch_lots_branch ON batch_lots(branch_id);
CREATE INDEX idx_batch_lots_expiry ON batch_lots(expiry_date);
CREATE INDEX idx_batch_lots_status ON batch_lots(status);
```

#### Stock Valuations Table (NEW)
```sql
CREATE TABLE stock_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_date DATE NOT NULL,
  branch_id UUID NOT NULL REFERENCES branches(id),
  total_value DECIMAL(15,2) NOT NULL,
  total_quantity INTEGER NOT NULL,
  valuation_method ENUM('FIFO', 'LIFO', 'AVERAGE', 'STANDARD_COST') DEFAULT 'AVERAGE',
  product_count INTEGER NOT NULL,
  category_breakdown JSONB,
  method_details JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  status ENUM('DRAFT', 'CALCULATED', 'APPROVED') DEFAULT 'DRAFT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_valuations_date ON stock_valuations(valuation_date);
CREATE INDEX idx_stock_valuations_branch ON stock_valuations(branch_id);
CREATE INDEX idx_stock_valuations_method ON stock_valuations(valuation_method);
```

#### Stock Valuation Items Table (NEW)
```sql
CREATE TABLE stock_valuation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_id UUID NOT NULL REFERENCES stock_valuations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  category_id UUID REFERENCES categories(id),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(15,2) NOT NULL,
  total_value DECIMAL(15,2) NOT NULL,
  valuation_method VARCHAR(20) NOT NULL,
  last_purchase_price DECIMAL(15,2),
  average_cost DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_valuation_items_valuation ON stock_valuation_items(valuation_id);
CREATE INDEX idx_stock_valuation_items_product ON stock_valuation_items(product_id);
```

#### CSV Import History Table (NEW)
```sql
CREATE TABLE csv_import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type ENUM('PRODUCTS', 'CATEGORIES', 'STOCK_ADJUSTMENTS', 'CUSTOMERS', 'SUPPLIERS') NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  total_rows INTEGER NOT NULL,
  successful_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  errors JSONB,
  warnings JSONB,
  processed_data JSONB,
  branch_id UUID REFERENCES branches(id),
  imported_by UUID NOT NULL REFERENCES users(id),
  status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  processing_time_ms INTEGER,
  notes TEXT
);

CREATE INDEX idx_csv_import_history_type ON csv_import_history(import_type);
CREATE INDEX idx_csv_import_history_branch ON csv_import_history(branch_id);
CREATE INDEX idx_csv_import_history_status ON csv_import_history(status);
CREATE INDEX idx_csv_import_history_date ON csv_import_history(started_at);
```

#### Suppliers Table (ENHANCED)
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  tax_id VARCHAR(50),
  payment_terms INTEGER DEFAULT 30, -- days
  credit_limit DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'IDR',
  is_active BOOLEAN DEFAULT true,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suppliers_branch ON suppliers(branch_id);
CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);
```

#### Purchase Orders Table (NEW)
```sql
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  created_by UUID NOT NULL REFERENCES users(id),
  status ENUM('DRAFT', 'PENDING', 'APPROVED', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED') DEFAULT 'DRAFT',
  order_date DATE NOT NULL,
  expected_date DATE,
  received_date DATE,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  final_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_status ENUM('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE') DEFAULT 'UNPAID',
  notes TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_branch ON purchase_orders(branch_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(order_date);
```

#### Purchase Order Items Table (NEW)
```sql
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  unit_cost DECIMAL(15,2) NOT NULL,
  total_cost DECIMAL(15,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_order_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_purchase_order_items_product ON purchase_order_items(product_id);
```

#### Products Table Enhancements
```sql
-- Add these columns to existing products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_trackable BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS batch_tracking_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_expiry BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight DECIMAL(8,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_purchase_price DECIMAL(15,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS average_cost DECIMAL(15,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS attributes JSONB;

-- Add indexes for new columns
CREATE INDEX idx_products_reorder_point ON products(reorder_point);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_trackable ON products(is_trackable);
CREATE INDEX idx_products_batch_tracking ON products(batch_tracking_enabled);
```

#### Transactions Table Enhancements
```sql
-- Add these columns to existing transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50) UNIQUE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS voided_at TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_points_earned INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_points_redeemed INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS loyalty_discount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS membership_discount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS promo_discount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'POS'; -- POS, WEB, MOBILE, API

-- Add indexes for new columns
CREATE INDEX idx_transactions_receipt ON transactions(receipt_number);
CREATE INDEX idx_transactions_voided ON transactions(voided_at);
CREATE INDEX idx_transactions_source ON transactions(source);
#### Enhanced Users Table (NEW)
```sql
CREATE TABLE users_enhanced (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  phone VARCHAR(20),
  address TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  hire_date DATE,
  employment_status ENUM('ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE') DEFAULT 'ACTIVE',
  hourly_rate DECIMAL(8,2),
  department VARCHAR(50),
  manager_id UUID REFERENCES users(id),
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_enhanced_manager ON users_enhanced(manager_id);
CREATE INDEX idx_users_enhanced_status ON users_enhanced(employment_status);
```

#### User Sessions Table (NEW)
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  refresh_token VARCHAR(255),
  device_info JSONB,
  ip_address INET,
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_time TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
```

#### User Permissions Table (NEW)
```sql
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  permission VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  actions TEXT[], -- ['create', 'read', 'update', 'delete']
  conditions JSONB, -- Additional conditions for the permission
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, permission, resource)
);

CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_active ON user_permissions(is_active);
```

#### System Settings Table (NEW)
```sql
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  data_type ENUM('string', 'number', 'boolean', 'json', 'array') DEFAULT 'string',
  is_public BOOLEAN DEFAULT false, -- Can be accessed by frontend
  is_encrypted BOOLEAN DEFAULT false,
  validation_rules JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_system_settings_public ON system_settings(is_public);
```

#### Branch Settings Table (NEW)
```sql
CREATE TABLE branch_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, key)
);

CREATE INDEX idx_branch_settings_branch ON branch_settings(branch_id);
CREATE INDEX idx_branch_settings_active ON branch_settings(is_active);
```

#### Activity Logs Table (NEW)
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  branch_id UUID REFERENCES branches(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50), -- 'product', 'transaction', 'user', etc.
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id UUID REFERENCES user_sessions(id),
  severity ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') DEFAULT 'INFO',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_branch ON activity_logs(branch_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX idx_activity_logs_severity ON activity_logs(severity);
```

#### API Rate Limits Table (NEW)
```sql
CREATE TABLE api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL, -- IP address, user ID, or API key
  endpoint VARCHAR(255) NOT NULL,
  limit_count INTEGER NOT NULL,
  window_seconds INTEGER NOT NULL DEFAULT 3600, -- 1 hour default
  current_count INTEGER DEFAULT 0,
  reset_at TIMESTAMP NOT NULL,
  blocked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(identifier, endpoint)
);

CREATE INDEX idx_api_rate_limits_identifier ON api_rate_limits(identifier);
CREATE INDEX idx_api_rate_limits_reset ON api_rate_limits(reset_at);
CREATE INDEX idx_api_rate_limits_blocked ON api_rate_limits(blocked_until);
```

#### File Uploads Table (NEW)
```sql
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_hash VARCHAR(64) UNIQUE, -- SHA256 hash for deduplication
  category VARCHAR(50), -- 'product_image', 'document', 'receipt', etc.
  entity_type VARCHAR(50), -- 'product', 'transaction', 'user', etc.
  entity_id UUID,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  metadata JSONB,
  processing_status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
  processing_errors JSONB,
  download_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_uploads_hash ON file_uploads(file_hash);
CREATE INDEX idx_file_uploads_entity ON file_uploads(entity_type, entity_id);
CREATE INDEX idx_file_uploads_uploader ON file_uploads(uploaded_by);
CREATE INDEX idx_file_uploads_branch ON file_uploads(branch_id);
CREATE INDEX idx_file_uploads_status ON file_uploads(processing_status);
```

#### Cache Management Table (NEW)
```sql
CREATE TABLE cache_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  cache_value JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  tags TEXT[], -- For cache invalidation by tag
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 0
);

CREATE INDEX idx_cache_entries_key ON cache_entries(cache_key);
CREATE INDEX idx_cache_entries_expires ON cache_entries(expires_at);
CREATE INDEX idx_cache_entries_tags ON cache_entries USING GIN(tags);
```

#### Search Queries Table (NEW)
```sql
CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  branch_id UUID REFERENCES branches(id),
  query_text TEXT NOT NULL,
  entity_types TEXT[], -- ['products', 'transactions', 'customers']
  filters_applied JSONB,
  results_count INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_search_queries_user ON search_queries(user_id);
CREATE INDEX idx_search_queries_branch ON search_queries(branch_id);
CREATE INDEX idx_search_queries_created ON search_queries(created_at);
CREATE INDEX idx_search_queries_text ON search_queries USING GIN(to_tsvector('english', query_text));
```

#### System Notifications Table (NEW)
```sql
CREATE TABLE system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional notification data
  recipients TEXT[] NOT NULL, -- User IDs or roles
  channels TEXT[] DEFAULT ['in_app'], -- ['in_app', 'email', 'sms', 'webhook']
  is_global BOOLEAN DEFAULT false,
  branch_id UUID REFERENCES branches(id),
  expires_at TIMESTAMP NULL,
  read_by JSONB, -- Array of user IDs who have read this notification
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_notifications_recipients ON system_notifications USING GIN(recipients);
CREATE INDEX idx_system_notifications_branch ON system_notifications(branch_id);
CREATE INDEX idx_system_notifications_created ON system_notifications(created_at);
CREATE INDEX idx_system_notifications_type ON system_notifications(type);
```
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

### 4.1. Stock Adjustment System APIs (NEW)

#### POST /api/inventory/adjustments
Create a new stock adjustment request
```json
// Request
{
  "productId": "uuid",
  "adjustmentType": "IN", // IN, OUT, ADJUSTMENT, DAMAGE, RETURN, LOSS, FOUND
  "quantity": 10,
  "unitCost": 12000,
  "reason": "Stock replenishment",
  "reference": "PO-2025-001",
  "notes": "Additional stock received from supplier"
}

// Response
{
  "success": true,
  "data": {
    "adjustment": {
      "id": "uuid",
      "adjustmentType": "IN",
      "quantity": 10,
      "status": "PENDING",
      "requiresApproval": true,
      "createdAt": "2025-11-17T12:05:17Z"
    }
  },
  "message": "Stock adjustment created successfully and pending approval"
}
```

#### POST /api/inventory/adjustments/bulk
Create multiple stock adjustments in a single request
```json
// Request
{
  "adjustments": [
    {
      "productId": "uuid-1",
      "adjustmentType": "IN",
      "quantity": 5,
      "unitCost": 10000,
      "reason": "Bulk replenishment"
    },
    {
      "productId": "uuid-2",
      "adjustmentType": "OUT",
      "quantity": 3,
      "reason": "Damaged goods"
    }
  ]
}

// Response
{
  "success": true,
  "data": {
    "totalRequested": 2,
    "successful": 2,
    "failed": 0,
    "adjustments": [
      {
        "id": "uuid-1",
        "status": "PENDING",
        "requiresApproval": true
      },
      {
        "id": "uuid-2",
        "status": "PENDING",
        "requiresApproval": true
      }
    ]
  },
  "message": "Bulk stock adjustments created successfully"
}
```

#### GET /api/inventory/adjustments
List stock adjustments with pagination and filtering
```json
// Query Parameters
{
  "page": 1,
  "limit": 50,
  "status": "PENDING", // PENDING, APPROVED, REJECTED
  "adjustmentType": "IN", // IN, OUT, ADJUSTMENT, DAMAGE, RETURN, LOSS, FOUND
  "productId": "uuid", // optional
  "branchId": "uuid", // optional, auto-filtered
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "createdBy": "uuid", // optional
  "search": "coffee", // optional search in reason/notes
  "sortBy": "createdAt", // createdAt, quantity, adjustmentType
  "sortOrder": "desc" // asc, desc
}

// Response
{
  "success": true,
  "data": {
    "adjustments": [
      {
        "id": "uuid",
        "adjustmentType": "IN",
        "quantity": 10,
        "status": "PENDING",
        "reason": "Stock replenishment",
        "reference": "PO-2025-001",
        "createdAt": "2025-11-17T12:05:17Z",
        "createdBy": {
          "id": "uuid",
          "username": "admin"
        },
        "product": {
          "id": "uuid",
          "name": "Coffee",
          "sku": "COF001"
        }
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    },
    "summary": {
      "totalAdjustments": 25,
      "pendingCount": 5,
      "approvedCount": 18,
      "rejectedCount": 2,
      "totalValue": 1250000
    }
  }
}
```

#### GET /api/inventory/adjustments/:id
Get single stock adjustment details
```json
// Response
{
  "success": true,
  "data": {
    "adjustment": {
      "id": "uuid",
      "adjustmentType": "IN",
      "quantity": 10,
      "unitCost": 12000,
      "totalValue": 120000,
      "reason": "Stock replenishment",
      "reference": "PO-2025-001",
      "notes": "Additional stock received from supplier",
      "status": "PENDING",
      "requiresApproval": true,
      "createdAt": "2025-11-17T12:05:17Z",
      "updatedAt": "2025-11-17T12:05:17Z",
      "createdBy": {
        "id": "uuid",
        "username": "admin",
        "role": "admin"
      },
      "product": {
        "id": "uuid",
        "name": "Coffee",
        "sku": "COF001",
        "currentStock": 25
      },
      "approvalHistory": []
    }
  }
}
```

#### PATCH /api/inventory/adjustments/:id/approve
Approve or reject a stock adjustment
```json
// Request
{
  "action": "APPROVE", // APPROVE, REJECT
  "approvalNotes": "Approved - Stock received and verified",
  "updateStock": true // if true, update product stock immediately
}

// Response
{
  "success": true,
  "data": {
    "adjustment": {
      "id": "uuid",
      "status": "APPROVED",
      "approvedAt": "2025-11-17T12:15:17Z",
      "approvedBy": {
        "id": "uuid",
        "username": "manager"
      },
      "approvalNotes": "Approved - Stock received and verified"
    },
    "product": {
      "id": "uuid",
      "name": "Coffee",
      "stock": 35, // updated stock
      "averageCost": 11800 // updated average cost if applicable
    }
  },
  "message": "Stock adjustment approved successfully"
}
```

#### GET /api/inventory/adjustments/pending-approvals
Get list of adjustments pending approval for managers
```json
// Response
{
  "success": true,
  "data": {
    "pendingAdjustments": [
      {
        "id": "uuid",
        "adjustmentType": "IN",
        "quantity": 10,
        "reason": "Stock replenishment",
        "createdAt": "2025-11-17T12:05:17Z",
        "createdBy": {
          "id": "uuid",
          "username": "admin"
        },
        "product": {
          "id": "uuid",
          "name": "Coffee",
          "sku": "COF001"
        }
      }
    ],
    "summary": {
      "totalPending": 5,
      "highValueCount": 2,
      "avgApprovalTime": "2.5 hours"
    }
  }
}
```

#### GET /api/inventory/adjustments/stats
Get stock adjustment statistics and analytics
```json
// Response
{
  "success": true,
  "data": {
    "periodStats": {
      "totalAdjustments": 125,
      "pendingCount": 5,
      "approvedCount": 115,
      "rejectedCount": 5,
      "totalValue": 2500000
    },
    "typeBreakdown": {
      "IN": { "count": 80, "value": 2000000 },
      "OUT": { "count": 25, "value": 300000 },
      "ADJUSTMENT": { "count": 15, "value": 100000 },
      "DAMAGE": { "count": 5, "value": 100000 }
    },
    "monthlyTrends": [
      {
        "month": "2025-10",
        "adjustments": 45,
        "value": 800000
      },
      {
        "month": "2025-11",
        "adjustments": 35,
        "value": 600000
      }
    ],
    "topReasons": [
      {
        "reason": "Stock replenishment",
        "count": 35,
        "value": 1200000
      },
      {
        "reason": "Damaged goods",
        "count": 15,
        "value": 300000
      }
    ],
    "approvalMetrics": {
      "avgApprovalTime": "2.5 hours",
      "approvalRate": "92%",
      "rejectionRate": "4%"
    }
  }
}
```

#### GET /api/inventory/adjustments/report
Get detailed stock adjustment report
```json
// Query Parameters
{
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "adjustmentType": "IN",
  "status": "APPROVED",
  "format": "json" // json, csv, pdf
}

// Response
{
  "success": true,
  "data": {
    "report": {
      "period": {
        "startDate": "2025-11-01T00:00:00Z",
        "endDate": "2025-11-17T23:59:59Z"
      },
      "summary": {
        "totalAdjustments": 45,
        "totalValue": 1200000,
        "avgAdjustmentValue": 26667,
        "approvalRate": "94%"
      },
      "adjustments": [
        {
          "date": "2025-11-17T12:05:17Z",
          "product": "Coffee",
          "type": "IN",
          "quantity": 10,
          "value": 120000,
          "reason": "Stock replenishment",
          "approvedBy": "manager"
        }
      ],
      "categoryBreakdown": [
        {
          "category": "Beverages",
          "adjustments": 25,
          "value": 800000
        },
        {
          "category": "Food",
          "adjustments": 20,
          "value": 400000
        }
      ]
    }
  }
}
```

#### GET /api/products/:id/adjustment-history
Get adjustment history for a specific product
```json
// Response
{
  "success": true,
  "data": {
    "adjustmentHistory": [
      {
        "id": "uuid",
        "adjustmentType": "IN",
        "quantity": 10,
        "reason": "Stock replenishment",
        "status": "APPROVED",
        "createdAt": "2025-11-17T12:05:17Z",
        "createdBy": {
          "username": "admin"
        },
        "approvedBy": {
          "username": "manager"
        },
        "approvalDate": "2025-11-17T12:15:17Z"
      }
    ],
    "summary": {
      "totalAdjustments": 15,
      "netChange": 45, // total IN - total OUT
      "lastAdjustment": "2025-11-17T12:05:17Z"
    }
  }
}
```

#### POST /api/inventory/adjustments/import-csv
Import stock adjustments from CSV file
```json
// Request: multipart/form-data
{
  "file": <csv_file>,
  "validateOnly": false, // if true, only validate without importing
  "branchId": "uuid" // optional, auto-filled from user
}

// Response
{
  "success": true,
  "data": {
    "importId": "uuid",
    "totalRows": 50,
    "processedRows": 50,
    "successfulRows": 48,
    "failedRows": 2,
    "errors": [
      {
        "row": 15,
        "productSku": "COF999",
        "error": "Product not found"
      },
      {
        "row": 32,
        "adjustmentType": "INVALID",
        "error": "Invalid adjustment type"
      }
    ],
    "warnings": [
      {
        "row": 10,
        "message": "Adjustment type not specified, defaulting to ADJUSTMENT"
      }
    ],
    "createdAdjustments": 48,
    "status": "COMPLETED"
  },
  "message": "Stock adjustments imported successfully with 2 errors"
}
### 4.2. CSV Import/Export System APIs (NEW)

#### POST /api/products/import-csv
Import products from CSV file
```json
// Request: multipart/form-data
{
  "file": <csv_file>,
  "validateOnly": false, // if true, only validate without importing
  "updateExisting": true, // if true, update existing products
  "branchId": "uuid" // optional, auto-filled from user
}

// Response
{
  "success": true,
  "data": {
    "importId": "uuid",
    "totalRows": 100,
    "processedRows": 100,
    "successfulRows": 95,
    "failedRows": 5,
    "createdProducts": 50,
    "updatedProducts": 45,
    "errors": [
      {
        "row": 15,
        "sku": "DUP001",
        "error": "SKU already exists"
      },
      {
        "row": 32,
        "name": "",
        "error": "Product name is required"
      }
    ],
    "warnings": [
      {
        "row": 10,
        "message": "Price not specified, using default price"
      }
    ],
    "status": "COMPLETED"
  },
  "message": "Products imported successfully with 5 errors"
}
```

#### POST /api/categories/import-csv
Import categories from CSV file
```json
// Request: multipart/form-data
{
  "file": <csv_file>,
  "validateOnly": false,
  "updateExisting": true,
  "branchId": "uuid"
}

// Response
{
  "success": true,
  "data": {
    "importId": "uuid",
    "totalRows": 25,
    "processedRows": 25,
    "successfulRows": 24,
    "failedRows": 1,
    "createdCategories": 20,
    "updatedCategories": 4,
    "errors": [
      {
        "row": 8,
        "name": "",
        "error": "Category name is required"
      }
    ],
    "warnings": [],
    "status": "COMPLETED"
  },
  "message": "Categories imported successfully with 1 error"
}
```

#### GET /api/products/sample-csv
Download sample CSV template for products
```json
// Response: CSV file download
// CSV Content:
sku,name,price,cost,stock,min_stock,unit,barcode,category_name,description
PROD001,Coffee,15000,12000,25,10,cups,123456789,Beverages,Premium coffee
PROD002,Tea,12000,10000,30,5,packages,987654321,Beverages,Green tea
```

#### GET /api/categories/sample-csv
Download sample CSV template for categories
```json
// Response: CSV file download
// CSV Content:
name,description,parent_category
Beverages,Drinks and beverages,
Food,Food items,
Coffee,Coffee products,Beverages
Tea,Tea products,Beverages
```

#### GET /api/inventory/adjustments/sample-csv
Download sample CSV template for stock adjustments
```json
// Response: CSV file download
// CSV Content:
product_sku,adjustment_type,quantity,unit_cost,reason,reference,notes
PROD001,IN,10,12000,Stock replenishment,PO-2025-001,Additional stock
PROD002,OUT,5,10000,Damaged goods,DAM-001,Damaged packages
```

#### GET /api/csv-imports
Get list of CSV import history
```json
// Query Parameters
{
  "page": 1,
  "limit": 50,
  "importType": "PRODUCTS", // PRODUCTS, CATEGORIES, STOCK_ADJUSTMENTS
  "status": "COMPLETED", // PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "importedBy": "uuid"
}

// Response
{
  "success": true,
  "data": {
    "imports": [
      {
        "id": "uuid",
        "importType": "PRODUCTS",
        "fileName": "products_batch_1.csv",
        "totalRows": 100,
        "successfulRows": 95,
        "failedRows": 5,
        "status": "COMPLETED",
        "importedBy": {
          "id": "uuid",
          "username": "admin"
        },
        "startedAt": "2025-11-17T10:30:00Z",
        "completedAt": "2025-11-17T10:35:00Z",
        "processingTimeMs": 300000
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    }
  }
}
```

#### GET /api/csv-imports/:id
Get detailed import results
```json
// Response
{
  "success": true,
  "data": {
    "import": {
      "id": "uuid",
      "importType": "PRODUCTS",
      "fileName": "products_batch_1.csv",
      "fileSize": 2048000, // bytes
      "totalRows": 100,
      "successfulRows": 95,
      "failedRows": 5,
      "skippedRows": 0,
      "status": "COMPLETED",
      "importedBy": {
        "id": "uuid",
        "username": "admin"
      },
      "startedAt": "2025-11-17T10:30:00Z",
      "completedAt": "2025-11-17T10:35:00Z",
      "processingTimeMs": 300000,
      "errors": [
        {
          "row": 15,
          "sku": "DUP001",
          "field": "sku",
          "error": "SKU already exists",
          "value": "DUP001"
        }
      ],
      "warnings": [
        {
          "row": 10,
          "field": "price",
          "message": "Price not specified, using default price",
          "value": null
        }
      ]
    }
  }
}
```

#### DELETE /api/csv-imports/:id
Delete import record (and rollback if possible)
```json
// Response
{
  "success": true,
  "data": {
    "deleted": true,
    "rollbackPerformed": false,
### 4.3. Enhanced Category Management APIs (NEW)

#### GET /api/categories/tree
Get hierarchical category tree structure
```json
// Query Parameters
{
  "includeProductCount": true, // include product counts
  "includeStats": true, // include category statistics
  "branchId": "uuid" // optional, auto-filtered
}

// Response
{
  "success": true,
  "data": {
    "tree": [
      {
        "id": "uuid",
        "name": "Beverages",
        "description": "Drinks and beverages",
        "productCount": 25,
        "totalValue": 1500000,
        "averagePrice": 60000,
        "isActive": true,
        "level": 0,
        "path": "Beverages",
        "children": [
          {
            "id": "uuid-child",
            "name": "Coffee",
            "description": "Coffee products",
            "productCount": 15,
            "totalValue": 900000,
            "averagePrice": 60000,
            "isActive": true,
            "level": 1,
            "path": "Beverages > Coffee",
            "children": []
          },
          {
            "id": "uuid-child-2",
            "name": "Tea",
            "description": "Tea products",
            "productCount": 10,
            "totalValue": 600000,
            "averagePrice": 60000,
            "isActive": true,
            "level": 1,
            "path": "Beverages > Tea",
            "children": []
          }
        ]
      }
    ],
    "summary": {
      "totalCategories": 15,
      "activeCategories": 14,
      "totalProducts": 150,
      "averageProductsPerCategory": 10
    }
  }
}
```

#### GET /api/categories/:id/stats
Get detailed category statistics
```json
// Response
{
  "success": true,
  "data": {
    "category": {
      "id": "uuid",
      "name": "Beverages",
      "description": "Drinks and beverages"
    },
    "stats": {
      "productMetrics": {
        "totalProducts": 25,
        "activeProducts": 23,
        "inactiveProducts": 2,
        "lowStockProducts": 3,
        "outOfStockProducts": 1
      },
      "salesMetrics": {
        "totalSales": 2500000,
        "monthlySales": 450000,
        "avgTransactionValue": 35000,
        "topSellingProduct": {
          "id": "uuid",
          "name": "Coffee",
          "sales": 800000
        }
      },
      "financialMetrics": {
        "totalValue": 1500000,
        "avgProductPrice": 60000,
        "profitMargin": "25%",
        "turnoverRate": 2.3
      },
      "inventoryMetrics": {
        "totalStock": 1250,
        "avgStockPerProduct": 50,
        "stockValue": 1500000,
        "reorderNeeded": 3
      }
    },
    "trends": {
      "salesGrowth": "+15%",
      "productGrowth": "+5%",
      "inventoryGrowth": "+8%"
    },
    "periodComparison": {
      "current": {
        "sales": 450000,
        "products": 25,
        "value": 1500000
      },
      "previous": {
        "sales": 390000,
        "products": 24,
        "value": 1380000
      }
    }
  }
}
```

#### PATCH /api/categories/bulk-update-products
Bulk update products to different categories
```json
// Request
{
  "productIds": ["uuid-1", "uuid-2", "uuid-3"],
  "fromCategoryId": "uuid-old-category",
  "toCategoryId": "uuid-new-category",
  "reason": "Category restructuring"
}

// Response
{
  "success": true,
  "data": {
    "updatedProducts": 3,
    "fromCategory": {
      "id": "uuid-old-category",
      "name": "Old Category",
      "productCount": 47 // updated count
    },
    "toCategory": {
      "id": "uuid-new-category",
      "name": "New Category",
      "productCount": 28 // updated count
    }
  },
  "message": "3 products moved to new category successfully"
}
```

#### GET /api/categories/export-csv
Export categories to CSV
```json
// Query Parameters
{
  "includeProductCount": true,
  "includeHierarchy": true,
  "branchId": "uuid"
}

// Response: CSV file download
// CSV Content:
name,description,parent_category,product_count,total_value,level,path
Beverages,Drinks and beverages,,25,1500000,0,Beverages
Food,Food items,,30,1800000,0,Food
Coffee,Coffee products,Beverages,15,900000,1,Beverages > Coffee
Tea,Tea products,Beverages,10,600000,1,Beverages > Tea
```

#### POST /api/categories/bulk
Create multiple categories in a single request
```json
// Request
{
  "categories": [
    {
      "name": "Snacks",
      "description": "Snack items",
      "parentId": "uuid-food-category"
    },
    {
      "name": "Chips",
      "description": "Potato chips",
      "parentId": "uuid-snacks-category"
    }
  ]
}

// Response
{
  "success": true,
  "data": {
    "created": 2,
    "categories": [
      {
        "id": "uuid-1",
        "name": "Snacks",
        "description": "Snack items"
      },
      {
        "id": "uuid-2",
        "name": "Chips",
        "description": "Potato chips"
      }
    ]
  },
  "message": "2 categories created successfully"
}
```

#### GET /api/categories/search
Search categories with advanced filtering
```json
// Query Parameters
{
  "search": "beverage",
  "level": 0, // filter by hierarchy level
  "hasProducts": true, // only categories with products
  "isActive": true,
  "minProductCount": 5,
  "sortBy": "productCount", // name, productCount, createdAt
  "sortOrder": "desc",
  "page": 1,
  "limit": 20
}

### 4.4. Advanced Search & Filtering System APIs (NEW)

#### GET /api/search/global
Global search across all entities
```json
// Query Parameters
{
  "q": "coffee", // search query
  "types": "products,categories,transactions", // entity types to search
  "branchId": "uuid", // optional, auto-filtered
  "limit": 50,
  "offset": 0
}

// Response
{
  "success": true,
  "data": {
    "query": "coffee",
    "totalResults": 125,
    "searchTimeMs": 85,
    "results": {
      "products": {
        "total": 50,
        "items": [
          {
            "id": "uuid",
            "type": "product",
            "name": "Coffee",
            "sku": "COF001",
            "price": 15000,
            "stock": 25,
            "category": "Beverages",
            "relevanceScore": 0.95,
            "highlighted": "Coffee <mark>Beans</mark> Premium"
          }
        ]
      },
      "categories": {
        "total": 5,
        "items": [
          {
            "id": "uuid",
            "type": "category",
            "name": "Coffee Beverages",
            "description": "All coffee products",
            "productCount": 15,
            "relevanceScore": 0.88,
            "highlighted": "<mark>Coffee</mark> Products"
          }
        ]
      },
      "transactions": {
        "total": 70,
        "items": [
          {
            "id": "uuid",
            "type": "transaction",
            "transactionCode": "TXN-20251117-001",
            "totalAmount": 30000,
            "createdAt": "2025-11-17T12:05:17Z",
            "items": ["Coffee", "Sugar"],
            "relevanceScore": 0.75
          }
        ]
      }
    },
    "suggestions": [
      "Coffee Beans",
      "Coffee Powder", 
      "Instant Coffee"
    ]
  }
}
```

#### GET /api/search/products
Advanced product search with multiple criteria
```json
// Query Parameters
{
  "q": "coffee",
  "categoryIds": ["uuid-1", "uuid-2"], // multiple category filter
  "priceMin": 5000,
  "priceMax": 50000,
  "stockStatus": "IN_STOCK", // IN_STOCK, LOW_STOCK, OUT_OF_STOCK
  "supplierIds": ["uuid-supplier"],
  "tags": ["organic", "premium"], // comma-separated tags
  "isActive": true,
  "lowStock": false,
  "sortBy": "relevance", // relevance, name, price, stock, createdAt
  "sortOrder": "desc",
  "page": 1,
  "limit": 20,
  "facets": true // include facet counts
}

// Response
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "sku": "COF001",
        "name": "Coffee Beans Premium",
        "price": 25000,
        "cost": 20000,
        "stock": 25,
        "minStock": 10,
        "category": {
          "id": "uuid",
          "name": "Beverages"
        },
        "supplier": {
          "id": "uuid",
          "name": "Premium Coffee Co"
        },
        "tags": ["organic", "premium"],
        "relevanceScore": 0.95,
        "highlighted": "<mark>Coffee</mark> Beans Premium"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    },
    "facets": {
      "categories": [
        {
          "id": "uuid-1",
          "name": "Beverages",
          "count": 25,
          "selected": true
        },
        {
          "id": "uuid-2", 
          "name": "Food",
          "count": 20,
          "selected": false
        }
      ],
      "priceRanges": [
        {
          "min": 0,
          "max": 10000,
          "count": 5
        },
        {
          "min": 10000,
          "max": 25000,
          "count": 25
        },
        {
          "min": 25000,
          "max": 50000,
          "count": 15
        }
      ],
      "suppliers": [
        {
          "id": "uuid-supplier",
          "name": "Premium Coffee Co",
          "count": 10,
          "selected": true
        }
      ]
    },
    "searchMeta": {
      "query": "coffee",
      "totalResults": 45,
      "searchTimeMs": 120,
      "usedFilters": ["categoryIds", "priceRange", "supplierIds"]
    }
  }
}
```

#### GET /api/search/transactions
Advanced transaction search with analytics
```json
// Query Parameters
{
  "q": "TXN-2025",
  "transactionCode": "TXN-20251117",
  "status": "COMPLETED",
  "cashierIds": ["uuid-cashier"],
  "paymentMethod": "cash",
  "amountMin": 10000,
  "amountMax": 100000,
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "hasItems": "coffee", // search in transaction items
  "sortBy": "createdAt",
  "sortOrder": "desc",
  "page": 1,
  "limit": 25,
  "includeAnalytics": true
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
        "createdAt": "2025-11-17T12:05:17Z",
        "cashier": {
          "id": "uuid",
          "username": "cashier1"
        },
        "itemCount": 3,
        "items": [
          {
            "productName": "Coffee",
            "quantity": 2,
            "unitPrice": 15000
          }
        ],
        "relevanceScore": 0.92
      }
    ],
    "pagination": {
      "total": 156,
      "page": 1,
      "limit": 25,
      "totalPages": 7
    },
    "analytics": {
      "summary": {
        "totalTransactions": 156,
        "totalAmount": 4680000,
        "averageTransaction": 30000,
        "topPaymentMethod": "cash",
        "busiestHour": "14:00",
        "topCashier": {
          "id": "uuid-cashier-1",
          "username": "cashier1",
          "transactionCount": 45
        }
      },
      "trends": {
        "dailyTransactions": [
          {
            "date": "2025-11-17",
            "transactions": 25,
            "amount": 750000
          }
        ],
        "paymentMethodBreakdown": {
          "cash": 65,
          "card": 25,
          "qris": 10
        }
      }
    },
    "searchMeta": {
      "query": "TXN-2025",
      "totalResults": 156,
      "searchTimeMs": 95,
      "dateRange": {
        "start": "2025-11-01T00:00:00Z",
        "end": "2025-11-17T23:59:59Z"
      }
    }
  }
}
```

#### GET /api/search/inventory
Advanced inventory search with stock analytics
```json
// Query Parameters
{
  "q": "coffee",
  "categoryIds": ["uuid-beverages"],
  "stockStatus": "LOW_STOCK",
  "supplierIds": ["uuid-supplier"],
  "priceMin": 5000,
  "priceMax": 50000,
  "stockMin": 0,
  "stockMax": 100,
  "turnoverRate": "slow", // fast, medium, slow
  "reorderNeeded": true,
  "sortBy": "stockLevel",
  "sortOrder": "asc",
  "page": 1,
  "limit": 30,
  "includeValuation": true
}

// Response
{
  "success": true,
  "data": {
    "inventory": [
      {
        "id": "uuid",
        "sku": "COF001",
        "name": "Coffee Premium",
        "price": 25000,
        "cost": 20000,
        "stock": 5,
        "minStock": 10,
        "stockValue": 125000,
        "averageCost": 20000,
        "stockStatus": "LOW_STOCK",
        "category": {
          "id": "uuid",
          "name": "Beverages"
        },
        "supplier": {
          "id": "uuid",
          "name": "Premium Coffee Co"
        },
        "analytics": {
          "turnoverRate": 2.1,
          "daysOfStock": 15,
          "reorderPoint": 10,
          "lastSaleDate": "2025-11-16T14:30:00Z",
          "monthlySalesVelocity": 10
        },
        "valuation": {
          "fifo": 125000,
          "lifo": 125000,
          "average": 125000
        }
      }
    ],
    "pagination": {
      "total": 12,
      "page": 1,
### 4.5. File Upload/Download System APIs (NEW)

#### POST /api/upload/products/images
Upload product images
```json
// Request: multipart/form-data
{
  "file": <image_file>,
  "productId": "uuid",
  "altText": "Coffee beans premium quality",
  "isPrimary": true // if true, set as main product image
}

// Response
{
  "success": true,
  "data": {
    "uploadId": "uuid-upload",
    "fileName": "coffee_beans_premium.jpg",
    "fileUrl": "https://cdn.bms.com/products/coffee_beans_premium.jpg",
    "fileSize": 2048000,
    "mimeType": "image/jpeg",
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "processed": {
      "thumbnail": "https://cdn.bms.com/products/thumbs/coffee_beans_premium.jpg",
      "medium": "https://cdn.bms.com/products/medium/coffee_beans_premium.jpg"
    }
  },
  "message": "Product image uploaded successfully"
}
```

#### POST /api/upload/documents
Upload documents (invoices, receipts, etc.)
```json
// Request: multipart/form-data
{
  "file": <document_file>,
  "documentType": "INVOICE", // INVOICE, RECEIPT, PURCHASE_ORDER, CONTRACT
  "referenceId": "uuid-related-record",
  "referenceType": "purchase_order",
  "description": "Invoice from Premium Coffee Co",
  "tags": ["invoice", "supplier", "2025-11"]
}

// Response
{
  "success": true,
  "data": {
    "uploadId": "uuid-upload",
    "fileName": "invoice_premium_coffee_001.pdf",
    "fileUrl": "https://cdn.bms.com/documents/invoice_premium_coffee_001.pdf",
    "fileSize": 512000,
    "mimeType": "application/pdf",
    "documentType": "INVOICE",
    "uploadedBy": {
      "id": "uuid-user",
      "username": "admin"
    },
    "createdAt": "2025-11-17T12:14:02Z"
  },
  "message": "Document uploaded successfully"
}
```

#### POST /api/upload/csv-templates
Upload custom CSV templates
```json
// Request: multipart/form-data
{
  "file": <csv_template_file>,
  "templateName": "Custom Product Import",
  "description": "Modified product import template with additional fields",
  "entityType": "PRODUCTS",
  "isPublic": false
}

// Response
{
  "success": true,
  "data": {
    "uploadId": "uuid-upload",
    "templateId": "uuid-template",
    "fileName": "custom_product_template.csv",
    "fileUrl": "https://cdn.bms.com/templates/custom_product_template.csv",
    "templateName": "Custom Product Import",
    "entityType": "PRODUCTS",
    "preview": {
      "headers": ["sku", "name", "price", "cost", "stock", "custom_field_1", "custom_field_2"],
      "sampleRows": 3
    }
  },
  "message": "CSV template uploaded successfully"
}
```

#### POST /api/upload/bulk
Upload multiple files at once
```json
// Request: multipart/form-data
{
  "files": [<file1>, <file2>, <file3>],
  "uploadType": "PRODUCT_IMAGES", // PRODUCT_IMAGES, DOCUMENTS, RECEIPTS
  "entityId": "uuid-product-or-transaction",
  "autoProcess": true
}

// Response
{
  "success": true,
  "data": {
    "batchId": "uuid-batch",
    "totalFiles": 3,
    "successful": 3,
    "failed": 0,
    "files": [
      {
        "fileName": "image1.jpg",
        "fileUrl": "https://cdn.bms.com/products/image1.jpg",
        "status": "UPLOADED",
        "processingTime": 1200
      },
      {
        "fileName": "image2.jpg", 
        "fileUrl": "https://cdn.bms.com/products/image2.jpg",
        "status": "UPLOADED",
        "processingTime": 980
      },
      {
        "fileName": "image3.jpg",
        "fileUrl": "https://cdn.bms.com/products/image3.jpg", 
        "status": "UPLOADED",
        "processingTime": 1100
      }
    ]
  },
  "message": "Batch upload completed successfully"
}
```

#### GET /api/files/:id/download
Download files with access control
```json
// Query Parameters
{
  "download": true, // force download vs inline viewing
  "version": "original", // original, thumbnail, medium
  "size": "1024x768" // custom resize for images
}

// Response: Binary file download or redirect to CDN
// Headers:
Content-Type: image/jpeg
Content-Disposition: attachment; filename="coffee_beans_premium.jpg"
Cache-Control: public, max-age=31536000
```

#### GET /api/files/:id/metadata
Get file metadata and processing status
```json
// Response
{
  "success": true,
  "data": {
    "fileId": "uuid-file",
    "fileName": "coffee_beans_premium.jpg",
    "fileUrl": "https://cdn.bms.com/products/coffee_beans_premium.jpg",
    "fileSize": 2048000,
    "mimeType": "image/jpeg",
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "uploadedBy": {
      "id": "uuid-user",
      "username": "admin"
    },
    "uploadedAt": "2025-11-17T12:14:02Z",
    "lastAccessed": "2025-11-17T12:20:15Z",
    "downloadCount": 15,
    "tags": ["product", "coffee", "premium"],
    "processingStatus": "COMPLETED",
    "variants": [
      {
        "type": "thumbnail",
        "url": "https://cdn.bms.com/products/thumbs/coffee_beans_premium.jpg",
        "size": "150x150"
      },
      {
        "type": "medium",
        "url": "https://cdn.bms.com/products/medium/coffee_beans_premium.jpg", 
        "size": "800x600"
      }
    ]
  }
}
```

#### DELETE /api/files/:id
Delete files with cleanup
```json
// Query Parameters
{
  "deleteVariants": true, // also delete resized variants
  "reason": "Product image updated"
}

// Response
{
  "success": true,
  "data": {
    "deleted": true,
    "deletedVariants": 3,
    "freedSpace": 6144000, // bytes
    "message": "File and variants deleted successfully"
  }
}
```

#### GET /api/files/search
Search uploaded files
```json
// Query Parameters
{
  "q": "coffee",
  "fileType": "image", // image, document, csv
  "entityType": "product", // product, transaction, purchase_order
  "entityId": "uuid-entity",
  "tags": "product,premium",
  "uploadedBy": "uuid-user",
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "sortBy": "uploadedAt",
  "sortOrder": "desc",
  "page": 1,
  "limit": 20
}

// Response
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "uuid-file",
        "fileName": "coffee_beans_premium.jpg",
        "fileUrl": "https://cdn.bms.com/products/coffee_beans_premium.jpg",
        "fileSize": 2048000,
        "mimeType": "image/jpeg",
        "uploadedBy": {
          "id": "uuid-user",
          "username": "admin"
        },
        "uploadedAt": "2025-11-17T12:14:02Z",
        "tags": ["product", "coffee", "premium"],
        "entityType": "product",
        "entityId": "uuid-product",
        "downloadCount": 15
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 20,
      "totalPages": 2
    },
    "summary": {
      "totalFiles": 25,
      "totalSize": 52428800,
      "fileTypes": {
        "image": 20,
        "document": 3,
        "csv": 2
      }
    }
  }
}
```

#### POST /api/files/:id/process
Process uploaded files (image optimization, PDF conversion, etc.)
```json
// Request
{
  "operations": [
    {
      "type": "RESIZE",
      "width": 800,
      "height": 600,
      "quality": 85
    },
    {
      "type": "CONVERT",
      "format": "webp",
      "quality": 90
    },
    {
      "type": "WATERMARK", 
      "text": "BMS POS",
      "position": "bottom-right",
      "opacity": 50
    }
  ],
  "async": true // process in background
}

// Response
{
  "success": true,
  "data": {
    "jobId": "uuid-processing-job",
    "status": "QUEUED",
    "estimatedTime": "30 seconds",
    "operations": [
      {
        "type": "RESIZE",
        "status": "PENDING"
      },
      {
        "type": "CONVERT", 
        "status": "PENDING"
      },
      {
        "type": "WATERMARK",
        "status": "PENDING"
      }
    ]
  },
  "message": "File processing started"
}
```

### 4.6. WebSocket and Real-time Communication APIs (NEW)

#### Connection Establishment
```javascript
// WebSocket connection endpoint
const ws = new WebSocket('wss://api.bms.com/ws?token=jwt_token_here');

// Connection authentication
{
  "type": "AUTH",
  "token": "jwt_token_here",
  "branchId": "uuid-branch",
  "userRole": "cashier"
}

// Authentication response
{
  "type": "AUTH_RESPONSE", 
  "success": true,
  "userId": "uuid-user",
  "branchId": "uuid-branch",
  "permissions": ["view_products", "create_transaction"],
  "connectionId": "conn_12345"
}
```

#### Real-time Inventory Updates
```javascript
// Stock level changes
{
  "type": "INVENTORY_UPDATE",
  "data": {
    "productId": "uuid-product",
    "sku": "COF001",
    "name": "Coffee Premium",
    "oldStock": 25,
    "newStock": 23,
    "changeType": "SALE",
    "transactionId": "uuid-transaction",
    "branchId": "uuid-branch",
    "timestamp": "2025-11-17T12:15:49Z"
  }
}

// Low stock alerts
{
  "type": "LOW_STOCK_ALERT", 
  "data": {
    "productId": "uuid-product",
    "sku": "COF001",
    "name": "Coffee Premium",
    "currentStock": 5,
    "minStock": 10,
    "alertType": "LOW_STOCK",
    "branchId": "uuid-branch",
    "timestamp": "2025-11-17T12:15:49Z"
  }
}

// Stock adjustment notifications
{
  "type": "STOCK_ADJUSTMENT",
  "data": {
    "adjustmentId": "uuid-adjustment",
    "productId": "uuid-product", 
    "adjustmentType": "IN",
    "quantity": 10,
    "reason": "Stock replenishment",
    "status": "APPROVED",
    "approvedBy": "uuid-manager",
    "branchId": "uuid-branch",
    "timestamp": "2025-11-17T12:15:49Z"
  }
}
```

#### Real-time Transaction Notifications
```javascript
// New transaction created
{
  "type": "TRANSACTION_CREATED",
  "data": {
    "transactionId": "uuid-transaction",
    "transactionCode": "TXN-20251117-001",
    "cashierId": "uuid-cashier",
    "cashierName": "cashier1",
    "totalAmount": 30000,
    "paymentMethod": "cash",
    "itemCount": 3,
    "branchId": "uuid-branch",
    "timestamp": "2025-11-17T12:15:49Z"
  }
}

// Transaction status updates
{
  "type": "TRANSACTION_UPDATE",
  "data": {
    "transactionId": "uuid-transaction",
    "status": "COMPLETED",
    "paymentStatus": "PAID",
    "receiptGenerated": true,
    "branchId": "uuid-branch",
    "timestamp": "2025-11-17T12:15:49Z"
  }
}

// Transaction void/refund
{
  "type": "TRANSACTION_VOIDED",
  "data": {
    "transactionId": "uuid-transaction",
    "transactionCode": "TXN-20251117-001", 
    "voidReason": "Customer request",
    "voidedBy": "uuid-cashier",
    "refundAmount": 30000,
    "branchId": "uuid-branch",
    "timestamp": "2025-11-17T12:15:49Z"
  }
}
```

#### Real-time Shift Management
```javascript
// Shift status updates
{
  "type": "SHIFT_UPDATE",
  "data": {
    "shiftId": "uuid-shift",
    "status": "OPEN", // OPEN, CLOSED, SUSPENDED
    "cashierId": "uuid-cashier",
    "openingBalance": 500000,
    "currentCash": 650000,
    "expectedCash": 650000,
    "variance": 0,
    "branchId": "uuid-branch",
    "timestamp": "2025-11-17T12:15:49Z"
  }
}

// Cash movement alerts
{
  "type": "CASH_MOVEMENT_ALERT",
  "data": {
    "shiftId": "uuid-shift",
    "movementType": "LARGE_EXPENSE",
    "amount": 100000,
    "description": "Equipment purchase",
    "cashierId": "uuid-cashier",
    "approvalRequired": true,
    "branchId": "uuid-branch",
    "timestamp": "2025-11-17T12:15:49Z"
  }
}
```

#### Real-time User Presence
```javascript
// User status updates
{
  "type": "USER_STATUS",
  "data": {
    "userId": "uuid-user",
    "username": "cashier1",
    "status": "ONLINE", // ONLINE, AWAY, BUSY, OFFLINE
    "currentActivity": "PROCESSING_TRANSACTION",
    "branchId": "uuid-branch",
    "lastSeen": "2025-11-17T12:15:49Z"
  }
}

// Active users in branch
{
  "type": "ACTIVE_USERS",
  "data": {
    "branchId": "uuid-branch",
    "activeUsers": [
      {
        "userId": "uuid-user-1",
        "username": "cashier1",
        "status": "ONLINE",
        "currentActivity": "IDLE"
      },
      {
        "userId": "uuid-user-2", 
        "username": "manager1",
        "status": "BUSY",
        "currentActivity": "APPROVING_ADJUSTMENTS"
      }
    ]
  }
}
```

#### Real-time System Notifications
```javascript
// System alerts
{
  "type": "SYSTEM_ALERT",
  "data": {
    "alertType": "PAYMENT_GATEWAY_DOWN",
    "severity": "HIGH", // LOW, MEDIUM, HIGH, CRITICAL
    "title": "Payment Gateway Unavailable",
    "message": "QRIS payments are currently unavailable. Please use cash or card payments.",
    "affectedServices": ["qris", "card"],
    "estimatedResolution": "2025-11-17T13:00:00Z",
    "branchId": "uuid-branch",
    "timestamp": "2025-11-17T12:15:49Z"
  }
}

// Sync status updates
{
  "type": "SYNC_STATUS",
  "data": {
    "syncType": "PRODUCTS",
    "status": "IN_PROGRESS", // IDLE, IN_PROGRESS, COMPLETED, FAILED
    "progress": 75,
    "itemsProcessed": 750,
    "totalItems": 1000,
    "lastSyncTime": "2025-11-17T12:14:00Z",
    "branchId": "uuid-branch",
    "timestamp": "2025-11-17T12:15:49Z"
  }
}

// CSV Import progress
{
  "type": "CSV_IMPORT_PROGRESS",
  "data": {
    "importId": "uuid-import",
    "importType": "PRODUCTS",
    "status": "PROCESSING",
    "progress": 60,
    "processedRows": 60,
    "totalRows": 100,
    "successfulRows": 58,
    "failedRows": 2,
    "currentRow": "Product Name: Coffee Beans",
    "estimatedTimeRemaining": "45 seconds",
    "branchId": "uuid-branch",
    "timestamp": "2025-11-17T12:15:49Z"
  }
}
```

#### Client Message Types
```javascript
// Subscribe to events
{
  "type": "SUBSCRIBE",
  "channels": ["inventory", "transactions", "shifts"],
  "filters": {
    "branchId": "uuid-branch",
    "userRole": "cashier"
  }
}

// Unsubscribe from events
{
  "type": "UNSUBSCRIBE", 
  "channels": ["inventory", "transactions"]
}

// Ping/Pong for connection health
{
  "type": "PING",
  "timestamp": "2025-11-17T12:15:49Z"
}

// Pong response
{
  "type": "PONG",
  "timestamp": "2025-11-17T12:15:49Z",
  "latency": 45 // ms
}

// Typing indicators (for messaging features)
{
  "type": "TYPING_START",
  "channel": "messaging",
  "userId": "uuid-user",
  "username": "cashier1"
}

// User activity status
{
  "type": "USER_ACTIVITY",
  "data": {
    "activity": "VIEWING_INVENTORY", // VIEWING_PRODUCTS, PROCESSING_TRANSACTION, etc.
    "metadata": {
      "currentPage": "/inventory",
      "filters": {"category": "beverages"}
    }
  }
}
```

#### WebSocket Error Handling
```javascript
// Connection errors
{
  "type": "ERROR",
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid or expired token",
    "details": "Please re-authenticate",
    "timestamp": "2025-11-17T12:15:49Z"
  }
}

// Rate limiting
{
  "type": "ERROR",
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many messages sent",
    "retryAfter": 5000, // ms
    "timestamp": "2025-11-17T12:15:49Z"
  }
}

// Channel subscription denied
{
  "type": "ERROR", 
  "error": {
    "code": "SUBSCRIPTION_DENIED",
    "message": "Insufficient permissions for channel: analytics",
    "requiredPermission": "view_analytics",
    "timestamp": "2025-11-17T12:15:49Z"
  }
}
```

#### Connection Management
```javascript
// Automatic reconnection logic
class WebSocketManager {
  constructor(token, branchId) {
    this.token = token;
    this.branchId = branchId;
    this.reconnectInterval = 5000;
    this.maxReconnectAttempts = 10;
    this.reconnectAttempts = 0;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(`wss://api.bms.com/ws?token=${this.token}`);
    
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.authenticate();
    };
    
    this.ws.onclose = () => {
      this.handleReconnect();
    };
    
    this.ws.onmessage = (event) => {
      this.handleMessage(JSON.parse(event.data));
    };
  }
  
  authenticate() {
    this.send({
      type: "AUTH",
      token: this.token,
      branchId: this.branchId,
      clientInfo: {
        userAgent: navigator.userAgent,
        version: "1.0.0"
      }
    });
  }
  
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, this.reconnectInterval * this.reconnectAttempts);
    }
  }
}
### 4.7. Enhanced Analytics & Reporting APIs (NEW)

#### GET /api/analytics/inventory
Comprehensive inventory analytics dashboard
```json
// Query Parameters
{
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "branchId": "uuid",
  "includeForecasting": true,
  "metrics": "all" // all, stock_levels, turnover, valuation, alerts
}

// Response
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2025-11-17T23:59:59Z",
      "days": 17
    },
    "overview": {
      "totalProducts": 150,
      "totalValue": 15000000,
      "averageTurnover": 2.3,
      "stockoutRate": "2.1%",
      "slowMovingCount": 25,
      "fastMovingCount": 45
    },
    "stockAnalysis": {
      "stockLevels": {
        "adequate": 100, // >= min_stock
        "low": 35, // < min_stock but > 0
        "out": 15, // = 0
        "overstocked": 20 // > max_stock threshold
      },
      "categories": [
        {
          "categoryId": "uuid",
          "categoryName": "Beverages",
          "productCount": 25,
          "totalValue": 3000000,
          "turnoverRate": 3.2,
          "stockoutRisk": "LOW"
        }
      ],
      "abcAnalysis": {
        "A": { // High value, high frequency
          "count": 30,
          "percentage": 20,
          "value": 9000000,
          "valuePercentage": 60
        },
        "B": { // Medium value, medium frequency  
          "count": 45,
          "percentage": 30,
          "value": 4500000,
          "valuePercentage": 30
        },
        "C": { // Low value, low frequency
          "count": 75,
          "percentage": 50,
          "value": 1500000,
          "valuePercentage": 10
        }
      }
    },
    "turnoverAnalysis": {
      "fastMoving": [
        {
          "productId": "uuid",
          "sku": "COF001",
          "name": "Coffee Premium",
          "turnoverRate": 5.2,
          "daysToSellOut": 7,
          "recommendedReorder": 50
        }
      ],
      "slowMoving": [
        {
          "productId": "uuid",
          "sku": "SLOW001", 
          "name": "Specialty Item",
          "turnoverRate": 0.3,
          "daysToSellOut": 180,
          "recommendedAction": "CONSIDER_DISCONTINUATION"
        }
      ],
      "trends": [
        {
          "date": "2025-11-01",
          "avgTurnover": 2.1,
          "totalValue": 14500000
        }
      ]
    },
    "valuation": {
      "totalValue": 15000000,
      "valuationMethods": {
        "fifo": 15200000,
        "lifo": 14800000,
        "average": 15000000,
        "standard": 15100000
      },
      "categoryBreakdown": [
        {
          "categoryId": "uuid",
          "categoryName": "Beverages",
          "value": 3000000,
          "percentage": 20,
          "method": "average"
        }
      ]
    },
    "alertsAndRisks": {
      "lowStock": 35,
      "overstocked": 20,
      "nearExpiry": 8,
      "slowMoving": 25,
      "discontinued": 5,
      "reorderNeeded": [
        {
          "productId": "uuid",
          "sku": "COF001",
          "name": "Coffee Premium",
          "currentStock": 5,
          "minStock": 10,
          "recommendedOrder": 25,
          "priority": "HIGH"
        }
      ]
    },
    "forecasting": {
      "demandForecast": [
        {
          "productId": "uuid",
          "sku": "COF001",
          "predictedDemand": 45,
          "confidence": 0.85,
          "recommendedStock": 55
        }
      ],
      "seasonalTrends": {
        "highSeason": ["December", "January"],
        "lowSeason": ["February", "March"],
        "growthRate": "+15%"
      }
    }
  }
}
```

#### GET /api/analytics/sales
Detailed sales analytics and performance metrics
```json
// Query Parameters
{
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "branchId": "uuid",
  "groupBy": "day", // hour, day, week, month
  "includeComparison": true,
  "metrics": "revenue,transactions,items,customers"
}

// Response
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2025-11-17T23:59:59Z",
      "previousPeriod": {
        "startDate": "2025-10-18T00:00:00Z", 
        "endDate": "2025-11-03T23:59:59Z"
      }
    },
    "overview": {
      "totalRevenue": 15750000,
      "totalTransactions": 525,
      "averageTransactionValue": 30000,
      "totalItemsSold": 2625,
      "uniqueCustomers": 350,
      "repeatCustomerRate": "68%"
    },
    "performanceMetrics": {
      "revenue": {
        "current": 15750000,
        "previous": 14250000,
        "growth": "+10.5%",
        "dailyAverage": 926471
      },
      "transactions": {
        "current": 525,
        "previous": 485,
        "growth": "+8.2%",
        "dailyAverage": 31
      },
      "avgTransactionValue": {
        "current": 30000,
        "previous": 29381,
        "growth": "+2.1%"
      }
    },
    "salesTrends": {
      "dailyData": [
        {
          "date": "2025-11-17",
          "revenue": 950000,
          "transactions": 32,
          "avgValue": 29688,
          "itemsSold": 160
        }
      ],
      "hourlyPatterns": [
        {
          "hour": 9,
          "revenue": 450000,
          "transactions": 15,
          "avgValue": 30000
        },
        {
          "hour": 10,
          "revenue": 680000,
          "transactions": 22,
          "avgValue": 30909
        }
      ]
    },
    "productPerformance": {
      "topSelling": [
        {
          "productId": "uuid",
          "sku": "COF001",
          "name": "Coffee Premium",
          "quantity": 125,
          "revenue": 3125000,
          "profit": 625000,
          "margin": "20%"
        }
      ],
      "revenueDrivers": [
        {
          "productId": "uuid",
          "sku": "COF001",
          "name": "Coffee Premium",
          "revenuePercentage": "19.8%",
          "cumulativePercentage": "19.8%"
        }
      ]
    },
    "paymentMethodAnalysis": {
      "breakdown": {
        "cash": {
          "amount": 9450000,
          "percentage": 60,
          "transactions": 315
        },
        "card": {
          "amount": 4725000,
          "percentage": 30,
          "transactions": 158
        },
        "qris": {
          "amount": 1575000,
          "percentage": 10,
          "transactions": 52
        }
      },
      "trends": {
        "cashDecline": "-5%",
        "digitalGrowth": "+25%"
      }
    },
    "customerAnalytics": {
      "customerSegments": {
        "new": 105,
        "returning": 245,
        "vip": 35
      },
      "customerValue": {
        "avgCustomerValue": 45000,
        "customerLifetimeValue": 180000,
        "retentionRate": "68%"
      },
      "peakHours": {
        "weekday": {
          "morning": "09:00-11:00",
          "lunch": "12:00-14:00",
          "evening": "17:00-19:00"
        },
        "weekend": {
          "morning": "08:00-12:00",
          "afternoon": "13:00-17:00"
        }
      }
    },
    "profitability": {
      "grossProfit": 3937500,
      "grossMargin": "25%",
      "netProfit": 3150000,
      "netMargin": "20%",
      "costBreakdown": {
        "cogs": 11812500,
        "operating": 787500
      }
    }
  }
}
```

#### GET /api/analytics/products
Product performance and optimization analytics
```json
// Query Parameters
{
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "branchId": "uuid",
  "categoryIds": ["uuid-category-1"],
  "limit": 50,
  "sortBy": "revenue", // revenue, quantity, profit, margin
  "includeRecommendations": true
}

// Response
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2025-11-17T23:59:59Z"
    },
    "productPerformance": {
      "topPerformers": [
        {
          "productId": "uuid",
          "sku": "COF001",
          "name": "Coffee Premium",
          "category": "Beverages",
          "metrics": {
            "quantity": 125,
            "revenue": 3125000,
            "profit": 625000,
            "margin": "20%",
            "turnoverRate": 5.2
          },
          "trends": {
            "salesGrowth": "+15%",
            "priceTrend": "STABLE",
            "demandTrend": "INCREASING"
          }
        }
      ],
      "underPerformers": [
        {
          "productId": "uuid",
          "sku": "SLOW001",
          "name": "Specialty Item",
          "category": "Food",
          "metrics": {
            "quantity": 3,
            "revenue": 75000,
            "profit": 15000,
            "margin": "20%",
            "turnoverRate": 0.1
          },
          "issues": ["Low sales", "High inventory", "Low margin impact"],
          "recommendations": ["Consider discontinuation", "Price adjustment", "Promotional campaign"]
        }
      ],
      "newProducts": [
        {
          "productId": "uuid",
          "sku": "NEW001",
          "name": "New Product",
          "launchDate": "2025-11-10T00:00:00Z",
          "metrics": {
            "quantity": 25,
            "revenue": 500000,
            "profit": 100000
          },
          "performance": "EXCEEDING_EXPECTATIONS"
        }
      ]
    },
    "productAnalytics": {
      "priceAnalysis": {
        "optimalPricing": [
          {
            "productId": "uuid",
            "sku": "COF001",
            "currentPrice": 25000,
            "optimalPrice": 27500,
            "elasticity": -1.2,
            "revenueImpact": "+12%"
          }
        ],
        "priceSensitivity": {
          "elastic": 35,
          "inelastic": 65,
          "neutral": 50
        }
      },
      "inventoryOptimization": {
        "reorderRecommendations": [
          {
            "productId": "uuid",
            "sku": "COF001",
            "currentStock": 5,
            "recommendedOrder": 25,
            "orderValue": 625000,
            "priority": "HIGH"
          }
        ],
        "overstockAlerts": [
          {
            "productId": "uuid",
            "sku": "OVER001",
            "currentStock": 150,
            "maxRecommended": 50,
            "excessValue": 2500000,
            "action": "PROMOTIONAL_CAMPAIGN"
          }
        ]
      },
      "crossSelling": {
        "opportunities": [
          {
            "primaryProduct": "Coffee",
            "suggestedProducts": ["Sugar", "Creamer", "Cup"],
            "confidence": 0.78,
            "potentialRevenue": 450000
          }
        ]
      }
    },
    "competitiveAnalysis": {
      "marketPosition": {
        "leader": 20,
        "follower": 60,
        "niche": 20
      },
      "opportunities": [
        {
          "category": "Premium Beverages",
          "opportunity": "Expand premium coffee range",
          "potential": "HIGH",
          "investment": "MEDIUM"
        }
      ]
    }
  }
}
```

#### GET /api/analytics/categories
Category performance and optimization analytics
```json
// Query Parameters
{
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "branchId": "uuid",
  "includeSubcategories": true,
  "metrics": "sales,inventory,profit"
}

// Response
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2025-11-17T23:59:59Z"
    },
    "categoryPerformance": {
      "overview": {
        "totalCategories": 8,
        "profitableCategories": 7,
        "averageMargin": "24%",
        "totalRevenue": 15750000
      },
      "categoryBreakdown": [
        {
          "categoryId": "uuid",
          "name": "Beverages",
          "metrics": {
            "revenue": 4725000,
            "profit": 1181250,
            "margin": "25%",
            "products": 25,
            "transactions": 157
          },
          "performance": {
            "rank": 1,
            "growth": "+15%",
            "marketShare": "30%"
          },
          "subcategories": [
            {
              "name": "Coffee",
              "revenue": 3150000,
              "margin": "26%",
              "products": 15
            },
            {
              "name": "Tea",
              "revenue": 1575000,
              "margin": "24%",
              "products": 10
            }
          ]
### 4.8. Webhook & Event System APIs (NEW)

#### POST /api/webhooks
Create a new webhook subscription
```json
// Request
{
  "name": "Inventory Low Stock Alerts",
  "url": "https://external-system.com/webhooks/bms-inventory",
  "events": ["inventory.low_stock", "inventory.stockout"],
  "secret": "webhook_secret_key",
  "isActive": true,
  "filters": {
    "branchId": "uuid-branch",
    "categories": ["uuid-beverages"],
    "minStockThreshold": 5
  },
  "retryConfig": {
    "maxRetries": 3,
    "retryDelay": 60,
    "backoffMultiplier": 2
  },
  "headers": {
    "Authorization": "Bearer external_api_token",
    "X-Custom-Header": "bms-webhook"
  }
}

// Response
{
  "success": true,
  "data": {
    "webhookId": "uuid-webhook",
    "name": "Inventory Low Stock Alerts",
    "url": "https://external-system.com/webhooks/bms-inventory",
    "events": ["inventory.low_stock", "inventory.stockout"],
    "status": "ACTIVE",
    "secret": "webhook_secret_key",
    "createdAt": "2025-11-17T12:19:37Z",
    "lastTriggered": null,
    "deliveryStats": {
      "totalDeliveries": 0,
      "successfulDeliveries": 0,
      "failedDeliveries": 0
    }
  },
  "message": "Webhook created successfully"
}
```

#### GET /api/webhooks
List all webhook subscriptions
```json
// Query Parameters
{
  "page": 1,
  "limit": 50,
  "status": "ACTIVE", // ACTIVE, INACTIVE, PAUSED
  "events": "inventory,transaction",
  "branchId": "uuid"
}

// Response
{
  "success": true,
  "data": {
    "webhooks": [
      {
        "webhookId": "uuid-webhook",
        "name": "Inventory Low Stock Alerts",
        "url": "https://external-system.com/webhooks/bms-inventory",
        "events": ["inventory.low_stock", "inventory.stockout"],
        "status": "ACTIVE",
        "createdAt": "2025-11-17T12:19:37Z",
        "lastTriggered": "2025-11-17T12:15:00Z",
        "deliveryStats": {
          "totalDeliveries": 25,
          "successfulDeliveries": 23,
          "failedDeliveries": 2,
          "successRate": "92%"
        }
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    }
  }
}
```

#### GET /api/webhooks/:id
Get webhook details and statistics
```json
// Response
{
  "success": true,
  "data": {
    "webhook": {
      "webhookId": "uuid-webhook",
      "name": "Inventory Low Stock Alerts",
      "url": "https://external-system.com/webhooks/bms-inventory",
      "events": ["inventory.low_stock", "inventory.stockout"],
      "status": "ACTIVE",
      "secret": "webhook_secret_key",
      "filters": {
        "branchId": "uuid-branch",
        "categories": ["uuid-beverages"],
        "minStockThreshold": 5
      },
      "retryConfig": {
        "maxRetries": 3,
        "retryDelay": 60,
        "backoffMultiplier": 2
      },
      "headers": {
        "Authorization": "Bearer external_api_token",
        "X-Custom-Header": "bms-webhook"
      },
      "createdAt": "2025-11-17T12:19:37Z",
      "updatedAt": "2025-11-17T12:19:37Z"
    },
    "statistics": {
      "totalDeliveries": 25,
      "successfulDeliveries": 23,
      "failedDeliveries": 2,
      "lastDelivery": "2025-11-17T12:15:00Z",
      "averageResponseTime": "245ms",
      "last30Days": {
        "deliveries": 25,
        "successRate": "92%",
        "avgResponseTime": "245ms"
      }
    },
    "recentDeliveries": [
      {
        "deliveryId": "uuid-delivery",
        "event": "inventory.low_stock",
        "triggeredAt": "2025-11-17T12:15:00Z",
        "status": "DELIVERED",
        "responseTime": "234ms",
        "httpStatus": 200
      }
    ]
  }
}
```

#### PATCH /api/webhooks/:id
Update webhook configuration
```json
// Request
{
  "name": "Updated Inventory Alerts",
  "events": ["inventory.low_stock", "inventory.stockout", "inventory.reorder"],
  "isActive": false,
  "filters": {
    "minStockThreshold": 3
  }
}

// Response
{
  "success": true,
  "data": {
    "webhook": {
      "webhookId": "uuid-webhook",
      "name": "Updated Inventory Alerts",
      "events": ["inventory.low_stock", "inventory.stockout", "inventory.reorder"],
      "status": "INACTIVE",
      "updatedAt": "2025-11-17T12:19:37Z"
    }
  },
  "message": "Webhook updated successfully"
}
```

#### DELETE /api/webhooks/:id
Delete webhook subscription
```json
// Response
{
  "success": true,
  "data": {
    "deleted": true,
    "pendingDeliveries": 0
  },
  "message": "Webhook deleted successfully"
}
```

#### GET /api/webhooks/:id/test
Test webhook delivery
```json
// Request
{
  "eventType": "inventory.low_stock",
  "testData": {
    "productId": "uuid-test-product",
    "currentStock": 3,
    "minStock": 5
  }
}

// Response
{
  "success": true,
  "data": {
    "testDeliveryId": "uuid-test-delivery",
    "status": "DELIVERED",
    "responseTime": "156ms",
    "httpStatus": 200,
    "responseBody": "OK",
    "deliveredAt": "2025-11-17T12:19:37Z"
  },
  "message": "Webhook test delivered successfully"
}
```

#### GET /api/webhooks/:id/deliveries
Get webhook delivery history
```json
// Query Parameters
{
  "page": 1,
  "limit": 50,
  "status": "DELIVERED", // PENDING, DELIVERED, FAILED, CANCELLED
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z"
}

// Response
{
  "success": true,
  "data": {
    "deliveries": [
      {
        "deliveryId": "uuid-delivery",
        "event": "inventory.low_stock",
        "triggeredAt": "2025-11-17T12:15:00Z",
        "status": "DELIVERED",
        "attempts": 1,
        "responseTime": "234ms",
        "httpStatus": 200,
        "responseBody": "OK",
        "requestHeaders": {
          "X-BMS-Event": "inventory.low_stock",
          "X-BMS-Signature": "sha256=signature_hash"
        },
        "payload": {
          "event": "inventory.low_stock",
          "timestamp": "2025-11-17T12:15:00Z",
          "data": {
            "productId": "uuid-product",
            "sku": "COF001",
            "name": "Coffee Premium",
            "currentStock": 5,
            "minStock": 10,
            "branchId": "uuid-branch"
          }
        }
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 50,
      "totalPages": 2
    }
  }
}
```

### 4.8.1. Event Types and Payloads

#### Transaction Events
```json
// Transaction Completed
{
  "event": "transaction.completed",
  "timestamp": "2025-11-17T12:19:37Z",
  "data": {
    "transactionId": "uuid-transaction",
    "transactionCode": "TXN-20251117-001",
    "branchId": "uuid-branch",
    "cashierId": "uuid-cashier",
    "customerId": null,
    "totalAmount": 30000,
    "discount": 0,
    "taxAmount": 0,
    "finalAmount": 30000,
    "paymentMethod": "cash",
    "items": [
      {
        "productId": "uuid-product",
        "sku": "COF001",
        "name": "Coffee Premium",
        "quantity": 2,
        "unitPrice": 15000,
        "total": 30000
      }
    ],
    "metadata": {
      "source": "POS",
      "shiftId": "uuid-shift"
    }
  }
}

// Transaction Voided
{
  "event": "transaction.voided",
  "timestamp": "2025-11-17T12:19:37Z",
  "data": {
    "transactionId": "uuid-transaction",
    "transactionCode": "TXN-20251117-001",
    "branchId": "uuid-branch",
    "voidReason": "Customer request",
    "voidedBy": "uuid-cashier",
    "voidedAt": "2025-11-17T12:19:37Z",
    "refundAmount": 30000,
    "originalTransaction": {
      "totalAmount": 30000,
      "items": []
    }
  }
}
```

#### Inventory Events
```json
// Stock Level Changed
{
  "event": "inventory.stock_changed",
  "timestamp": "2025-11-17T12:19:37Z",
  "data": {
    "productId": "uuid-product",
    "sku": "COF001",
    "branchId": "uuid-branch",
    "changeType": "SALE", // SALE, ADJUSTMENT, PURCHASE, RETURN
    "quantity": -2,
    "oldStock": 25,
    "newStock": 23,
    "transactionId": "uuid-transaction",
    "reason": "Sale transaction",
    "reference": "TXN-20251117-001"
  }
}

// Low Stock Alert
{
  "event": "inventory.low_stock",
  "timestamp": "2025-11-17T12:19:37Z",
  "data": {
    "productId": "uuid-product",
    "sku": "COF001",
    "name": "Coffee Premium",
    "branchId": "uuid-branch",
    "categoryId": "uuid-category",
    "currentStock": 5,
    "minStock": 10,
    "reorderPoint": 15,
    "reorderQuantity": 25,
    "stockValue": 125000,
    "alertType": "LOW_STOCK",
    "priority": "MEDIUM"
  }
}

// Stock Adjustment Approved
{
  "event": "inventory.adjustment_approved",
  "timestamp": "2025-11-17T12:19:37Z",
  "data": {
    "adjustmentId": "uuid-adjustment",
    "productId": "uuid-product",
    "branchId": "uuid-branch",
    "adjustmentType": "IN",
    "quantity": 10,
    "unitCost": 20000,
    "totalValue": 200000,
    "reason": "Stock replenishment",
    "reference": "PO-2025-001",
    "status": "APPROVED",
    "approvedBy": "uuid-manager",
    "approvedAt": "2025-11-17T12:19:37Z"
  }
}
```

#### User Events
```json
// User Login
{
  "event": "user.login",
  "timestamp": "2025-11-17T12:19:37Z",
  "data": {
    "userId": "uuid-user",
    "username": "cashier1",
    "role": "cashier",
    "branchId": "uuid-branch",
    "ipAddress": "192.168.1.100",
    "userAgent": "BMS POS v1.0.0",
    "loginMethod": "password",
    "success": true
  }
}

// Shift Opened
{
  "event": "shift.opened",
  "timestamp": "2025-11-17T12:19:37Z",
  "data": {
    "shiftId": "uuid-shift",
    "cashierId": "uuid-cashier",
    "branchId": "uuid-branch",
    "openingBalance": 500000,
    "openedAt": "2025-11-17T08:00:00Z"
  }
}
```

#### System Events
```json
// Payment Gateway Status
{
  "event": "system.payment_gateway_status",
  "timestamp": "2025-11-17T12:19:37Z",
  "data": {
    "gateway": "qris",
    "status": "DOWN", // UP, DOWN, DEGRADED
    "message": "QRIS service temporarily unavailable",
    "affectedMethods": ["qris"],
    "estimatedResolution": "2025-11-17T13:00:00Z",
    "branchId": "uuid-branch"
  }
}

// CSV Import Completed
{
  "event": "system.csv_import_completed",
  "timestamp": "2025-11-17T12:19:37Z",
  "data": {
    "importId": "uuid-import",
    "importType": "PRODUCTS",
    "branchId": "uuid-branch",
    "fileName": "products_batch_1.csv",
    "totalRows": 100,
    "successfulRows": 95,
    "failedRows": 5,
    "processedBy": "uuid-user",
    "completedAt": "2025-11-17T12:19:37Z",
    "processingTime": 120
  }
}
```

### 4.8.2. Webhook Security

#### Signature Verification
```javascript
// Webhook signature calculation
const crypto = require('crypto');

function calculateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

// Verification middleware
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-bms-signature'];
  const timestamp = req.headers['x-bms-timestamp'];
  const payload = JSON.stringify(req.body);
  const expectedSignature = calculateSignature(payload, secret);
  
  if (signature !== `sha256=${expectedSignature}`) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Check timestamp to prevent replay attacks
  const currentTime = Math.floor(Date.now() / 1000);
  const eventTime = parseInt(timestamp);
  
  if (Math.abs(currentTime - eventTime) > 300) { // 5 minutes
    return res.status(401).json({ error: 'Event timestamp too old' });
  }
  
  next();
}
```

#### Webhook Retry Logic
```json
// Retry configuration
{
  "retryConfig": {
    "maxRetries": 3,
    "retryDelay": 60,
    "backoffMultiplier": 2,
    "maxRetryDelay": 3600,
    "retryOnStatusCodes": [408, 429, 500, 502, 503, 504]
  }
}

// Delivery attempt tracking
{
  "deliveryId": "uuid-delivery",
  "webhookId": "uuid-webhook",
  "event": "inventory.low_stock",
  "attempts": [
    {
      "attempt": 1,
      "timestamp": "2025-11-17T12:15:00Z",
      "status": "FAILED",
      "httpStatus": 500,
      "error": "Internal Server Error",
      "responseTime": "5000ms"
    },
    {
      "attempt": 2,
      "timestamp": "2025-11-17T12:16:00Z",
      "status": "DELIVERED",
      "httpStatus": 200,
      "responseTime": "234ms"
    }
  ],
  "finalStatus": "DELIVERED"
}
```

### 4.8.3. Event Filtering and Routing

#### Event Filters
```json
// Webhook filters
{
  "filters": {
    "branchId": "uuid-branch",
    "categories": ["uuid-beverages", "uuid-food"],
    "minAmount": 10000, // For transaction events
    "stockThreshold": 5, // For inventory events
    "userRoles": ["cashier", "manager"],
    "eventSources": ["POS", "API"],
    "excludeInternal": true
  }
}
```

#### Event Routing Rules
```json
// Complex routing configuration
{
  "routingRules": [
    {
      "name": "High Value Transactions",
      "condition": {
        "event": "transaction.completed",
        "filters": {
          "finalAmount": {"gte": 100000}
        }
      },
      "actions": [
        {
          "type": "webhook",
          "url": "https://alerts.company.com/high-value",
          "priority": "high"
        },
        {
          "type": "email",
          "recipients": ["manager@company.com"],
          "template": "high_value_transaction"
        }
      ]
    },
    {
      "name": "Critical Stock Alerts",
      "condition": {
        "event": "inventory.low_stock",
        "filters": {
          "priority": "CRITICAL"
        }
      },
      "actions": [
        {
          "type": "webhook",
          "url": "https://alerts.company.com/critical-stock",
          "priority": "urgent"
        },
        {
          "type": "sms",
          "recipients": ["+6281234567890"]
        }
      ]
    }
  ]
}
```

#### Webhook Event Registry
```json
// Available events
{
  "events": {
    "transaction.completed": {
      "description": "Transaction completed successfully",
      "category": "transaction",
      "priority": "normal",
      "retryable": true
    },
    "transaction.voided": {
      "description": "Transaction voided or refunded",
      "category": "transaction",
      "priority": "high",
      "retryable": true
    },
    "inventory.low_stock": {
      "description": "Product stock below minimum level",
      "category": "inventory",
      "priority": "medium",
      "retryable": true
    },
    "inventory.stockout": {
      "description": "Product out of stock",
      "category": "inventory",
      "priority": "high",
      "retryable": true
    },
    "user.login": {
      "description": "User logged into the system",
      "category": "user",
      "priority": "low",
      "retryable": false
    },
    "system.payment_gateway_status": {
      "description": "Payment gateway status changed",
      "category": "system",
      "priority": "high",
      "retryable": true
    }
  }
}
```
        }
      ]
    },
    "categoryTrends": {
      "growthLeaders": [
        {
          "categoryId": "uuid",
          "name": "Beverages",
          "growth": "+15%",
          "trend": "STRONG_GROWTH"
        }
      ],
      "declining": [
        {
          "categoryId": "uuid",
          "name": "Non-Essential",
          "growth": "-8%",
          "trend": "DECLINING"
        }
      ],
      "seasonal": [
        {
          "categoryId": "uuid",
          "name": "Seasonal Items",
          "peakSeason": "December-January",
          "currentPerformance": "BELOW_EXPECTATIONS"
        }
      ]
    },
    "optimization": {
      "categoryRestructuring": [
        {
          "currentStructure": ["Beverages", "Coffee", "Hot Coffee"],
          "suggestedStructure": ["Beverages", "Coffee", "Hot Coffee", "Cold Coffee"],
          "benefits": ["Better categorization", "Improved inventory management"]
        }
      ],
      "portfolioRecommendations": [
        {
          "action": "EXPAND",
          "category": "Premium Beverages",
          "reason": "High growth potential",
          "investment": "HIGH",
          "expectedReturn": "+25%"
        },
        {
          "action": "RATIONALIZE",
          "category": "Low-performing items",
          "reason": "Below breakeven",
          "actionItems": ["Review pricing", "Consider discontinuation"]
        }
      ]
    },
    "inventoryByCategory": {
      "adequateStock": [
        {
          "categoryId": "uuid",
          "name": "Beverages",
          "products": 23,
          "totalValue": 3000000,
          "turnoverRate": 3.2
        }
      ],
      "stockIssues": [
        {
          "categoryId": "uuid",
          "name": "Seasonal Items",
          "issue": "OVERSTOCKED",
          "affectedProducts": 8,
          "excessValue": 800000
        }
      ]
    }
  }
}
```

#### GET /api/reports/inventory
Comprehensive inventory reports
```json
// Query Parameters
{
  "reportType": "detailed", // summary, detailed, valuation, turnover
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "branchId": "uuid",
  "categoryIds": ["uuid-category"],
  "includeValuation": true,
  "format": "json", // json, csv, pdf
  "groupBy": "category" // none, category, supplier
}

// Response
{
  "success": true,
  "data": {
    "reportMetadata": {
      "reportType": "detailed",
      "generatedAt": "2025-11-17T12:17:25Z",
      "period": {
        "startDate": "2025-11-01T00:00:00Z",
        "endDate": "2025-11-17T23:59:59Z"
      },
      "branch": {
        "id": "uuid",
        "name": "BMS Store Jakarta"
      }
    },
    "summary": {
      "totalProducts": 150,
      "totalValue": 15000000,
      "totalQuantity": 7500,
      "averageValue": 100000,
      "categories": 8,
      "suppliers": 25
    },
    "inventoryData": [
      {
        "productId": "uuid",
        "sku": "COF001",
        "name": "Coffee Premium",
        "category": "Beverages",
        "supplier": "Premium Coffee Co",
        "currentStock": 25,
        "minStock": 10,
        "maxStock": 100,
        "unitCost": 20000,
        "totalValue": 500000,
        "turnoverRate": 5.2,
        "daysOfStock": 15,
        "reorderPoint": 15,
        "reorderQuantity": 50,
        "lastSale": "2025-11-16T14:30:00Z",
        "status": "IN_STOCK"
      }
    ],
    "valuationReport": {
      "totalValue": 15000000,
      "valuationMethods": {
        "fifo": 15200000,
        "lifo": 14800000,
        "average": 15000000
      },
      "categoryBreakdown": [
        {
          "categoryId": "uuid",
          "name": "Beverages",
          "value": 3000000,
          "percentage": 20
        }
      ]
    },
    "alertsAndIssues": {
      "lowStock": 15,
      "overstocked": 8,
      "slowMoving": 12,
      "nearExpiry": 3,
      "discontinued": 2
    }
  }
}
```

#### GET /api/reports/sales
Comprehensive sales reports
```json
// Query Parameters
{
  "reportType": "comprehensive", // summary, detailed, by_product, by_category, by_cashier
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "branchId": "uuid",
  "cashierIds": ["uuid-cashier"],
  "groupBy": "day", // hour, day, week, month
  "format": "json"
}

// Response
{
  "success": true,
  "data": {
    "reportMetadata": {
      "reportType": "comprehensive",
      "generatedAt": "2025-11-17T12:17:25Z",
      "period": {
        "startDate": "2025-11-01T00:00:00Z",
        "endDate": "2025-11-17T23:59:59Z"
      },
      "branch": {
        "id": "uuid",
        "name": "BMS Store Jakarta"
      }
    },
    "summary": {
      "totalRevenue": 15750000,
      "totalTransactions": 525,
      "averageTransactionValue": 30000,
      "totalItems": 2625,
      "profit": 3937500,
      "profitMargin": "25%"
    },
    "salesData": [
      {
        "date": "2025-11-17",
        "transactions": 32,
        "revenue": 950000,
        "profit": 237500,
        "items": 160,
        "avgTransactionValue": 29688,
        "cashierPerformance": [
          {
            "cashierId": "uuid",
            "name": "cashier1",
            "transactions": 18,
            "revenue": 540000,
            "avgValue": 30000
          }
        ]
      }
    ],
    "productBreakdown": [
      {
        "productId": "uuid",
        "sku": "COF001",
        "name": "Coffee Premium",
        "quantity": 125,
        "revenue": 3125000,
        "profit": 625000,
        "margin": "20%"
      }
    ],
    "categoryBreakdown": [
      {
        "categoryId": "uuid",
        "name": "Beverages",
        "transactions": 157,
        "revenue": 4725000,
        "profit": 1181250,
        "percentage": "30%"
      }
    ],
    "paymentMethodBreakdown": {
      "cash": {
        "amount": 9450000,
        "transactions": 315,
        "percentage": 60
      },
      "card": {
        "amount": 4725000,
        "transactions": 158,
        "percentage": 30
      },
      "qris": {
        "amount": 1575000,
        "transactions": 52,
        "percentage": 10
      }
    }
  }
}
```

#### GET /api/analytics/dashboard
Real-time dashboard analytics
```json
// Query Parameters
{
  "branchId": "uuid",
  "includeComparisons": true,
  "timeRange": "today" // today, week, month
}

// Response
{
  "success": true,
  "data": {
    "timestamp": "2025-11-17T12:17:25Z",
    "currentPeriod": {
      "startDate": "2025-11-17T00:00:00Z",
      "endDate": "2025-11-17T23:59:59Z"
    },
    "kpis": {
      "todaySales": {
        "value": 950000,
        "target": 1000000,
        "achievement": "95%",
        "trend": "+5%",
        "vsYesterday": "+12%"
      },
      "transactions": {
        "value": 32,
        "target": 35,
        "achievement": "91%",
        "trend": "STABLE",
        "vsYesterday": "+8%"
      },
      "avgTransaction": {
        "value": 29688,
        "target": 28571,
        "achievement": "104%",
        "trend": "+3%",
        "vsYesterday": "+2%"
      },
      "inventoryHealth": {
        "score": 8.5,
        "status": "GOOD",
        "lowStockItems": 15,
        "overstockItems": 8,
        "criticalItems": 3
      }
    },
    "realTimeMetrics": {
      "currentTransaction": {
        "amount": 45000,
        "items": 3,
        "paymentMethod": "cash",
        "cashier": "cashier1",
        "startedAt": "2025-11-17T12:15:00Z"
      },
      "hourlyProgress": [
        {
          "hour": 9,
          "target": 125000,
          "actual": 118000,
          "transactions": 4,
          "achievement": "94%"
        }
      ]
    },
    "alerts": [
      {
        "type": "LOW_STOCK",
        "severity": "MEDIUM",
        "message": "Coffee Premium stock below minimum",
        "productId": "uuid",
        "actionRequired": true
      }
    ],
    "trends": {
      "salesVelocity": "INCREASING",
      "customerTraffic": "STABLE",
      "productivity": "ABOVE_TARGET",
      "inventoryTurnover": "OPTIMAL"
    }
  }
}
```

// Usage
const wsManager = new WebSocketManager(jwtToken, branchId);

// Subscribe to relevant channels
wsManager.send({
  type: "SUBSCRIBE",
  channels: ["inventory", "transactions", "shifts", "system_alerts"]
});
```

#### WebSocket Security
```javascript
// Token refresh handling
{
  "type": "TOKEN_EXPIRY_WARNING",
  "data": {
    "expiresAt": "2025-11-17T13:15:49Z",
    "warningTime": 3600 // seconds before expiry
  }
}

// Token refresh request
{
  "type": "REFRESH_TOKEN",
  "refreshToken": "refresh_token_here"
}

// Token refresh response
{
  "type": "TOKEN_REFRESHED",
  "data": {
    "newToken": "new_jwt_token",
    "expiresAt": "2025-11-18T12:15:49Z"
  }
}
```
#### GET /api/files/:id/processing-status
Check file processing status
```json
// Response
{
  "success": true,
  "data": {
    "jobId": "uuid-processing-job",
    "status": "COMPLETED",
    "progress": 100,
    "completedAt": "2025-11-17T12:15:32Z",
    "processingTime": 28, // seconds
    "operations": [
      {
        "type": "RESIZE",
        "status": "COMPLETED",
        "output": {
          "url": "https://cdn.bms.com/products/800x600/coffee_beans_premium.jpg",
          "size": "800x600"
        }
      },
      {
        "type": "CONVERT",
        "status": "COMPLETED", 
        "output": {
          "url": "https://cdn.bms.com/products/webp/coffee_beans_premium.webp",
          "size": "512x384"
        }
      },
      {
        "type": "WATERMARK",
        "status": "COMPLETED",
        "output": {
          "url": "https://cdn.bms.com/products/watermarked/coffee_beans_premium.jpg",
          "size": "1920x1080"
        }
      }
    ]
  }
}
```

#### POST /api/files/generate-signed-url
Generate temporary signed URLs for secure access
```json
// Request
{
  "fileId": "uuid-file",
  "expiresIn": 3600, // seconds
  "download": true,
  "allowedIps": ["192.168.1.100", "10.0.0.50"]
}

// Response
{
  "success": true,
  "data": {
    "signedUrl": "https://cdn.bms.com/products/signed/coffee_beans_premium.jpg?signature=abc123&expires=1731833642",
    "expiresAt": "2025-11-17T13:14:02Z",
    "allowedIps": ["192.168.1.100", "10.0.0.50"],
    "downloadCount": 0
  },
  "message": "Signed URL generated successfully"
}
```

#### GET /api/files/usage-analytics
File usage analytics and storage optimization
```json
// Query Parameters
{
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "groupBy": "day", // day, week, month
  "includeStorage": true
}

// Response
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2025-11-17T23:59:59Z"
    },
    "analytics": {
      "totalUploads": 450,
      "totalDownloads": 2350,
      "totalStorage": 10737418240, // bytes
      "avgFileSize": 5242880,
      "uploadTrends": [
        {
          "date": "2025-11-17",
          "uploads": 25,
          "downloads": 150,
          "storageUsed": 131072000
        }
      ],
      "topFiles": [
        {
          "fileId": "uuid-file",
          "fileName": "coffee_beans_premium.jpg",
          "downloads": 89,
          "storageUsed": 2048000
        }
      ],
      "fileTypeBreakdown": {
        "image": {
          "count": 350,
          "storage": 8589934592,
          "avgSize": 24542699
        },
        "document": {
          "count": 80,
          "storage": 2147483648,
          "avgSize": 26843545
        },
        "csv": {
          "count": 20,
          "storage": 1048576,
          "avgSize": 52428
        }
      },
      "storageOptimization": {
        "compressedFiles": 200,
        "savedSpace": 2147483648,
        "optimizationRate": "44%"
      }
    },
    "recommendations": [
      {
        "type": "compress_large_files",
        "description": "Compress 25 files larger than 5MB",
        "potentialSavings": "500MB"
      },
      {
        "type": "delete_unused_files",
        "description": "Delete 15 files not accessed in 30 days",
        "potentialSavings": "200MB"
      }
    ]
  }
}
```
      "limit": 30,
      "totalPages": 1
    },
    "summary": {
      "totalProducts": 12,
      "totalValue": 2400000,
      "lowStockCount": 8,
      "outOfStockCount": 2,
      "reorderNeeded": 6,
      "averageTurnover": 1.8
    }
  }
}
```

#### GET /api/search/suggestions
Get search suggestions and autocomplete
```json
// Query Parameters
{
  "q": "cof", // partial query
  "types": "products,categories", // entity types
  "limit": 10,
  "branchId": "uuid"
}

// Response
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "text": "Coffee Beans",
        "type": "product",
        "id": "uuid",
        "category": "Beverages",
        "price": 25000,
        "score": 0.95
      },
      {
        "text": "Coffee",
        "type": "category",
        "id": "uuid-category",
        "productCount": 15,
        "score": 0.88
      }
    ],
    "popularSearches": [
      "coffee",
      "tea",
      "snacks",
      "beverages"
    ],
    "recentSearches": [
      "coffee beans premium",
      "organic coffee",
      "instant coffee"
    ]
  }
}
```

#### POST /api/search/save-search
Save search criteria for future use
```json
// Request
{
  "name": "Low Stock Beverages",
  "description": "Beverages with low stock",
  "entityType": "inventory",
  "criteria": {
    "categoryIds": ["uuid-beverages"],
    "stockStatus": "LOW_STOCK"
  },
  "isPublic": false,
  "tags": ["inventory", "low-stock"]
}

// Response
{
  "success": true,
  "data": {
    "searchId": "uuid-search",
    "name": "Low Stock Beverages",
    "criteria": {
      "categoryIds": ["uuid-beverages"],
      "stockStatus": "LOW_STOCK"
    },
    "createdAt": "2025-11-17T12:12:22Z"
  },
  "message": "Search saved successfully"
}
```

#### GET /api/search/saved-searches
Get user's saved searches
```json
// Response
{
  "success": true,
  "data": {
    "savedSearches": [
      {
        "id": "uuid-search",
        "name": "Low Stock Beverages",
        "description": "Beverages with low stock",
        "entityType": "inventory",
        "criteria": {
          "categoryIds": ["uuid-beverages"],
          "stockStatus": "LOW_STOCK"
        },
        "tags": ["inventory", "low-stock"],
        "usageCount": 5,
        "lastUsed": "2025-11-17T10:30:00Z",
        "createdAt": "2025-11-15T08:00:00Z"
      }
    ]
  }
}
```

#### GET /api/search/analytics
Search analytics and optimization
```json
// Query Parameters
{
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "entityType": "products"
}

// Response
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2025-11-17T23:59:59Z"
    },
    "analytics": {
      "totalSearches": 15420,
      "uniqueQueries": 1250,
      "avgResultsPerSearch": 15,
      "searchSuccessRate": "94%",
      "topQueries": [
        {
          "query": "coffee",
          "count": 850,
          "avgResults": 25,
          "clickThroughRate": "68%"
        },
        {
          "query": "tea",
          "count": 620,
          "avgResults": 18,
          "clickThroughRate": "72%"
        }
      ],
      "searchTrends": {
        "dailySearches": [
          {
            "date": "2025-11-17",
            "searches": 850,
            "avgResults": 15
          }
        ],
        "noResultsQueries": [
          "coffee pods",
          "espresso machine",
          "filter paper"
        ]
      },
      "performanceMetrics": {
        "avgSearchTime": "85ms",
        "cacheHitRate": "76%",
        "indexHitRate": "98%"
      }
    },
    "recommendations": [
      {
        "type": "add_synonym",
        "query": "cofee",
        "suggestion": "coffee",
        "impact": "high"
      },
      {
        "type": "improve_index",
        "field": "tags",
        "suggestion": "Add more product tags",
        "impact": "medium"
      }
    ]
  }
}
```
// Response
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "uuid",
        "name": "Beverages",
        "description": "Drinks and beverages",
        "productCount": 25,
        "level": 0,
        "relevanceScore": 0.95
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    },
    "searchMeta": {
      "query": "beverage",
      "totalResults": 1,
      "searchTimeMs": 45
    }
  }
}
```

#### PATCH /api/categories/:id/reorder
Reorder categories within same parent
```json
// Request
{
  "newPosition": 1, // 0-based position within parent
  "parentId": "uuid-parent-category"
}

// Response
{
  "success": true,
  "data": {
    "category": {
      "id": "uuid",
      "name": "Coffee",
      "position": 1,
      "parentId": "uuid-parent-category"
    }
  },
  "message": "Category reordered successfully"
}
```

#### GET /api/categories/analytics
Get category performance analytics
```json
// Query Parameters
{
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "metrics": "sales,inventory,products" // comma-separated
}

// Response
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2025-11-17T23:59:59Z"
    },
    "analytics": {
      "topPerforming": [
        {
          "categoryId": "uuid",
          "name": "Beverages",
          "sales": 800000,
          "growth": "+15%"
        }
      ],
      "growthLeaders": [
        {
          "categoryId": "uuid",
          "name": "Coffee",
          "growth": "+25%",
          "sales": 500000
        }
      ],
      "needsAttention": [
        {
          "categoryId": "uuid",
          "name": "Slow Movers",
          "issue": "Low sales",
          "sales": 50000,
          "growth": "-10%"
        }
      ],
      "categoryTrends": [
        {
          "categoryId": "uuid",
          "name": "Beverages",
          "monthlyData": [
            {
              "month": "2025-10",
              "sales": 400000,
              "products": 20
            },
            {
              "month": "2025-11",
              "sales": 450000,
              "products": 25
            }
          ]
        }
      ]
    }
  }
}
```
    "message": "Import record deleted successfully"
  }
}
```
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
    "primaryColor": "rgba(184, 87, 23, 1)",
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