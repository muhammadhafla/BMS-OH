# BMS POS Electron - Requirements Specification & Acceptance Criteria

## 📋 Document Information
- **Project**: BMS POS Electron Application
- **Version**: 1.0
- **Date**: 2025-11-17
- **Status**: Draft

---

## 🎯 Executive Summary

Dokumen ini berisi requirements lengkap dan acceptance criteria untuk aplikasi POS Electron BMS yang harus memenuhi 7 kebutuhan utama: offline-first operation, payment handling, multi-item transaction, modern UI, multi-branch support, shift management, dan customizable receipt template.

---

## 🏗️ System Architecture Requirements

### Core Technologies
- **Frontend**: React + TypeScript + Tailwind CSS
- **Database**: SQLite (better-sqlite3) untuk local storage
- **Desktop**: Electron untuk cross-platform desktop application
- **Sync**: REST API dengan auto-sync capabilities
- **Print**: Receipt printer integration

---

## 📊 REQUIREMENTS & ACCEPTANCE CRITERIA

## 1. OFFLINE-FIRST CAPABILITIES

### 1.1 Local Database Management
**Requirements:**
- Must use SQLite database for local data storage
- Must support products, transactions, inventory data locally
- Must persist data when network connection is unavailable

**Acceptance Criteria:**
- [ ] Application works without internet connection for all core functions
- [ ] Local SQLite database created and initialized on first run
- [ ] Data stored locally includes: products, transactions, inventory levels, settings
- [ ] Database schema supports all required tables (products, transactions, transaction_items, sync_log)
- [ ] Database operations (CRUD) work offline with local data

**Test Cases:**
- T01: Install and run application without internet - verify it starts successfully
- T02: Add products and transactions offline - verify data persists
- T03: Restart application offline - verify all data still accessible

### 1.2 Synchronization System
**Requirements:**
- Must auto-sync data with backend API every 5 minutes when online
- Must sync pending transactions from local to server
- Must sync products from server to local
- Must handle sync conflicts gracefully

**Acceptance Criteria:**
- [ ] Auto-sync enabled by default with 5-minute intervals
- [ ] Pending transactions automatically uploaded when connection restored
- [ ] Product catalog synchronized from server to local
- [ ] Sync status visible in UI with real-time indicators
- [ ] Manual sync trigger available in UI
- [ ] Failed sync attempts retry automatically
- [ ] Network status detection (online/offline indicator)

**Test Cases:**
- T04: Go offline and make transactions - verify pending status
- T05: Restore connection - verify auto-sync within 5 minutes
- T06: Test manual sync button - verify immediate sync attempt
- T07: Simulate network failure during sync - verify error handling

### 1.3 Fallback Mechanisms
**Requirements:**
- Must fallback to mock data when backend API unavailable
- Must maintain basic functionality during API outages
- Must queue operations for later sync

**Acceptance Criteria:**
- [ ] Application functional with backend API down
- [ ] Mock product data available for testing/demo
- [ ] Transaction queue system for offline operations
- [ ] User notifications for sync status and pending operations

---

## 2. PAYMENT PROCESSING SYSTEM

### 2.1 Payment Methods Support
**Requirements:**
- Must support Cash payments with change calculation
- Must support QRIS payments (Indonesian QR payment standard)
- Must support Debit/Credit Card payments
- Must support split payments (multiple methods in one transaction)

**Acceptance Criteria:**
- [ ] Cash payments: input amount, calculate change, validate payment
- [ ] QRIS payments: generate/display QR code, payment confirmation
- [ ] Card payments: process card transactions (simulated)
- [ ] Split payments: combine multiple payment methods in single transaction
- [ ] Payment validation: prevent insufficient payments
- [ ] Real-time calculation of totals, discounts, and change

**Test Cases:**
- T08: Process cash payment with exact amount - verify completion
- T09: Process cash payment with excess - verify correct change calculation
- T10: Process QRIS payment - verify QR code generation and confirmation
- T11: Process split payment (50% cash, 50% card) - verify completion
- T12: Attempt insufficient payment - verify validation prevents completion

### 2.2 Discount System
**Requirements:**
- Must support percentage and fixed amount discounts
- Must apply discounts at item level and transaction level
- Must display discount calculations clearly

**Acceptance Criteria:**
- [ ] Percentage discount: input 1-100%, calculate discounted price
- [ ] Fixed amount discount: input rupiah amount, reduce total
- [ ] Item-level discounts: apply to specific products
- [ ] Transaction-level discounts: apply to entire sale
- [ ] Clear display of original price, discount amount, final price
- [ ] Discount limits: percentage max 100%, amount max transaction total

**Test Cases:**
- T13: Apply 10% discount to single item - verify calculation
- T14: Apply Rp 5,000 discount to transaction - verify calculation
- T15: Apply both item and transaction discounts - verify cumulative effect
- T16: Attempt 150% discount - verify validation prevents

### 2.3 Transaction Completion
**Requirements:**
- Must generate unique transaction codes
- Must save completed transactions to database
- Must update inventory levels after sale
- Must generate receipt for printing

**Acceptance Criteria:**
- [ ] Unique transaction code format: e.g., "TXN-YYYYMMDD-XXXX"
- [ ] Transaction saved with all details: items, payment, totals
- [ ] Inventory decremented for sold items
- [ ] Receipt generated with transaction details
- [ ] Transaction history accessible

**Test Cases:**
- T17: Complete transaction - verify unique code generated
- T18: Complete transaction - verify inventory updated correctly
- T19: View transaction history - verify all transactions listed
- T20: Print receipt - verify receipt content complete

---

## 3. MULTI-ITEM & MULTI-QUANTITY TRANSACTIONS

### 3.1 Shopping Cart Management
**Requirements:**
- Must support unlimited items in single transaction
- Must allow quantity adjustment per item
- Must support per-item modifications

**Acceptance Criteria:**
- [ ] Add multiple different products to cart
- [ ] Modify quantity for any item (increase/decrease)
- [ ] Remove individual items from cart
- [ ] Clear entire cart functionality
- [ ] Real-time total calculation as items modified
- [ ] Cart persistence during session

**Test Cases:**
- T21: Add 5 different products - verify all appear in cart
- T22: Change quantity of item from 1 to 3 - verify update
- T23: Remove one item from multi-item cart - verify removal
- T24: Clear cart - verify all items removed

### 3.2 Stock Validation
**Requirements:**
- Must validate stock availability before adding to cart
- Must prevent overselling products
- Must show current stock levels

**Acceptance Criteria:**
- [ ] Check stock availability before adding to cart
- [ ] Display current stock levels for products
- [ ] Prevent adding items exceeding available stock
- [ ] Show out-of-stock status for unavailable items
- [ ] Real-time stock updates during transaction

**Test Cases:**
- T25: Add item with sufficient stock - verify success
- T26: Attempt to add item with insufficient stock - verify prevention
- T27: Add multiple quantities - verify stock validation
- T28: View product details - verify current stock displayed

---

## 4. MODERN USER INTERFACE & EXPERIENCE

### 4.1 User Interface Standards
**Requirements:**
- Must use modern React + TypeScript architecture
- Must implement responsive design for different screen sizes
- Must use professional UI components (Tailwind CSS)

**Acceptance Criteria:**
- [ ] Responsive design works on desktop (1024px+ primary target)
- [ ] Professional color scheme and typography
- [ ] Consistent component styling throughout application
- [ ] Loading states for all async operations
- [ ] Error boundaries prevent application crashes
- [ ] Toast notifications for user feedback

**Test Cases:**
- T29: Resize window - verify responsive layout adaptation
- T30: Navigate between screens - verify consistent styling
- T31: Trigger loading state - verify loading indicator appears
- T32: Cause error - verify error boundary prevents crash

### 4.2 User Experience Features
**Requirements:**
- Must include keyboard shortcuts for common operations
- Must provide intuitive navigation
- Must include search functionality for products

**Acceptance Criteria:**
- [ ] Keyboard shortcuts: F2 (Payment), F3 (Clear Cart), F4 (Switch View), F5 (Refresh), F11 (Logout)
- [ ] Product search with barcode/SKU/name support
- [ ] Intuitive navigation between POS, Inventory, Reports
- [ ] Quick action buttons for common tasks
- [ ] Clear visual hierarchy and information architecture

**Test Cases:**
- T33: Press F2 - verify payment modal opens
- T34: Press F3 - verify cart clears
- T35: Search product by name - verify results display
- T36: Navigate between tabs - verify smooth transitions

---

## 5. MULTI-BRANCH OPERATION SUPPORT

### 5.1 Branch Management
**Requirements:**
- Must support multiple store locations/branches
- Must filter data by user branch assignment
- Must handle branch-specific configurations

**Acceptance Criteria:**
- [ ] User authentication includes branch assignment
- [ ] Products filtered by user's branch (for staff users)
- [ ] Branch information displayed in UI
- [ ] Transactions tagged with branch ID
- [ ] Branch-specific settings and configurations

**Test Cases:**
- T37: Login as branch staff - verify only branch products visible
- T38: Login as admin - verify access to all branches
- T39: View transaction - verify branch ID included
- T40: Switch branch user - verify data filtering updates

### 5.2 Branch Switching & Warning System
**Requirements:**
- Must warn users before switching to different branch
- Must confirm data replacement when changing branches
- Must preserve current branch data integrity

**Acceptance Criteria:**
- [ ] Warning modal appears when attempting branch change
- [ ] Clear warning about data replacement
- [ ] Confirmation dialog with "Yes/No" options
- [ ] Option to backup/sync current branch data
- [ ] Automatic database clear for new branch

**Test Cases:**
- T41: Attempt branch change - verify warning appears
- T42: Confirm branch change - verify database cleared
- T43: Cancel branch change - verify current data preserved
- T44: Complete branch switch - verify new branch data loaded

---

## 6. SHIFT MANAGEMENT SYSTEM

### 6.1 Shift Session Management
**Requirements:**
- Must track shift sessions with opening/closing procedures
- Must manage cash drawer balances per shift
- Must require authentication for shift operations

**Acceptance Criteria:**
- [ ] Shift opening: input opening cash balance, start timestamp
- [ ] Shift closing: input closing balance, end timestamp
- [ ] Cashier authentication required for shift operations
- [ ] Shift history tracking with all details
- [ ] Prevent overlapping shifts for same cashier

**Test Cases:**
- T45: Open new shift - verify opening balance recorded
- T46: Close shift - verify closing balance and summary
- T47: Attempt second simultaneous shift - verify prevention
- T48: View shift history - verify all shifts recorded

### 6.2 Cash Management & Reconciliation
**Requirements:**
- Must track all cash transactions per shift
- Must calculate expected vs actual cash balance
- Must record cash shortages/surpluses

**Acceptance Criteria:**
- [ ] Track cash sales per shift
- [ ] Record petty cash expenses during shift
- [ ] Calculate expected cash: opening + cash sales - expenses
- [ ] Input actual cash count at shift end
- [ ] Calculate and display shortage/surplus amount
- [ ] Require manager approval for cash adjustments

**Test Cases:**
- T49: Record cash sale during shift - verify tracking
- T50: Enter petty cash expense - verify deduction from expected
- T51: Close shift with shortage - verify alert and recording
- T52: Close shift with surplus - verify recording and flagging

### 6.3 Shift Reporting System
**Requirements:**
- Must generate comprehensive shift reports
- Must include all financial transactions and balances
- Must support shift report printing for handover

**Acceptance Criteria:**
- [ ] Shift report includes: opening balance, transactions summary, expenses, closing balance
- [ ] Breakdown by payment method (cash, card, QRIS)
- [ ] Transaction count and top-selling items
- [ ] Print-ready format for shift handover
- [ ] Digital report accessible in application

**Shift Report Template:**
```
BMS STORE - SHIFT REPORT
================================
Branch: [Branch Name]
Cashier: [Cashier Name] 
Shift Date: [Date]
Time: [Start] - [End]

OPENING CASH BALANCE: Rp [Amount]

SALES SUMMARY:
├── Cash Sales: Rp [Amount] ([Count] transactions)
├── Card Sales: Rp [Amount] ([Count] transactions)
├── QRIS Sales: Rp [Amount] ([Count] transactions)
└── Total Sales: Rp [Amount] ([Total Count] transactions)

EXPENSES:
├── Petty Cash: Rp [Amount]
├── Other: Rp [Amount]
└── Total Expenses: Rp [Amount]

CALCULATION:
├── Opening Balance: Rp [Amount]
├── + Cash Sales: Rp [Amount]
├── - Expenses: Rp [Amount]
└── Expected Cash: Rp [Amount]

ACTUAL COUNT: Rp [Amount]
SHORTAGE/SURPLUS: Rp [Amount]

TOP SELLING ITEMS:
1. [Product] - [Quantity] units
2. [Product] - [Quantity] units
3. [Product] - [Quantity] units

Signature: ________________
```

**Test Cases:**
- T53: Generate shift report - verify all data included
- T54: Print shift report - verify print formatting correct
- T55: View historical shift reports - verify accessibility

---

## 7. CUSTOMIZABLE RECEIPT TEMPLATE SYSTEM

### 7.1 Template Configuration Management
**Requirements:**
- Must support customizable receipt templates without code changes
- Must allow template themes to be pushed from backend
- Must auto-populate store details (address, phone, etc.) from backend
- Must support multiple template formats (thermal, A4, etc.)

**Acceptance Criteria:**
- [ ] Template configuration stored in database/backend
- [ ] Theme updates pushed from backend without app restart
- [ ] Store details (name, address, phone, logo) auto-populated from branch data
- [ ] Support for different receipt formats (standard, compact, detailed)
- [ ] Template versioning and rollback capability
- [ ] Template preview functionality

**Test Cases:**
- T56: Update template theme from backend - verify immediate change
- T57: Change store address - verify receipt reflects new address
- T58: Switch between template formats - verify different layouts
- T59: Preview template before applying - verify preview accuracy

### 7.2 Dynamic Receipt Generation
**Requirements:**
- Must generate receipts using template engine
- Must include all transaction details, store info, cashier info
- Must support QR codes for payment verification
- Must support barcode for product identification

**Acceptance Criteria:**
- [ ] Receipt generated using active template configuration
- [ ] Store information populated automatically from branch data
- [ ] Transaction details: items, quantities, prices, totals, payment method
- [ ] QR code included for digital verification
- [ ] Barcode included for product identification
- [ ] Cashier and timestamp information included
- [ ] Footer with store policies/contact info

**Test Cases:**
- T60: Print receipt - verify all transaction details included
- T61: Print receipt - verify store details auto-populated
- T62: Print receipt - verify QR code generated correctly
- T63: Print receipt - verify barcode for products included

### 7.3 Template FR3 Support
**Requirements:**
- Must support Indonesian standard receipt format (FR3)
- Must comply with government fiscal requirements
- Must include required fiscal information

**Acceptance Criteria:**
- [ ] FR3 template available as standard option
- [ ] Includes tax ID, fiscal number, sequence number
- [ ] Complies with Indonesian POS receipt regulations
- [ ] QR code for tax verification (if required)
- [ ] Proper formatting for government audit

**Test Cases:**
- T64: Generate FR3 receipt - verify compliance
- T65: Print FR3 receipt - verify required fields present
- T66: Verify tax ID format - verify correct formatting
---

## 8. HOLD TRANSACTION SYSTEM

### 8.1 Transaction Hold Management
**Requirements:**
- Must allow users to hold/suspend current transaction
- Must save held transaction details for later retrieval
- Must support multiple held transactions simultaneously
- Must automatically assign unique hold numbers

**Acceptance Criteria:**
- [ ] Hold current transaction with single button click
- [ ] Generate unique hold ID for each suspended transaction
- [ ] Display hold ID in UI for easy reference
- [ ] Clear current cart after hold is created
- [ ] Start new transaction after hold
- [ ] Retrieve held transaction by hold ID or customer info

**Test Cases:**
- T67: Hold transaction with items - verify hold created and cart cleared
- T68: Create new transaction after hold - verify new transaction starts
- T69: Retrieve held transaction - verify all items and totals restored
- T70: Create multiple holds - verify multiple transactions can be held

### 8.2 Hold Transaction Features
**Requirements:**
- Must show list of all held transactions
- Must allow editing held transactions before retrieval
- Must support hold expiration or cleanup
- Must integrate with shift management

**Acceptance Criteria:**
- [ ] Hold list displays: hold ID, timestamp, total amount, item count
- [ ] Edit held transaction: modify items, quantities, discounts
- [ ] Delete held transaction if no longer needed
- [ ] Automatic hold cleanup after shift end (configurable)
- [ ] Search/filter held transactions by customer or date
- [ ] Bulk operations: delete all expired holds

**Hold Transaction List UI:**
```
HELD TRANSACTIONS
┌─────────────────────────────────────┐
│ HOLD #001 | 10:30 AM | Rp 45,000    │ 3 items
├─────────────────────────────────────┤
│ HOLD #002 | 11:15 AM | Rp 125,000   │ 7 items
├─────────────────────────────────────┤
│ HOLD #003 | 11:45 AM | Rp 67,500    │ 4 items
└─────────────────────────────────────┘
[Retrieve] [Edit] [Delete] [Delete All]
```

**Test Cases:**
- T71: View held transactions list - verify all holds displayed
- T72: Edit held transaction - verify changes saved
- T73: Delete specific hold - verify removal from list
- T74: Delete all holds - verify bulk deletion works

### 8.3 Customer Integration
**Requirements:**
- Must associate held transactions with customer information
- Must support customer lookup by phone/name for hold retrieval
- Must provide customer notification when hold is ready

**Acceptance Criteria:**
- [ ] Optional customer information with held transaction
- [ ] Search holds by customer phone or name
- [ ] Display customer info in hold list
- [ ] Notification system for holds ready to continue
- [ ] Customer loyalty integration (if available)

**Test Cases:**
- T75: Add customer info to hold - verify association saved
- T76: Search holds by customer - verify correct results
- T77: View customer holds - verify filtered results
- T78: Retrieve customer hold - verify customer info restored

### 8.4 Advanced Hold Features
**Requirements:**
- Must support priority holds (urgent customer)
- Must provide hold timer/timeout functionality
- Must integrate with queue management system
- Must support hold transfer between cashiers

**Acceptance Criteria:**
- [ ] Priority flag for urgent holds
- [ ] Sort holds by priority and timestamp
- [ ] Hold timeout configuration (default 24 hours)
- [ ] Automatic hold expiration and cleanup
- [ ] Transfer held transaction to another cashier
- [ ] Queue position display for held transactions

**Test Cases:**
- T79: Create priority hold - verify priority flag set
- T80: Configure hold timeout - verify automatic expiration
- T81: Transfer hold between cashiers - verify ownership change
- T82: View hold queue - verify ordering by priority/time

---

## 🗄️ DATABASE SCHEMA REQUIREMENTS

---

## 🗄️ DATABASE SCHEMA REQUIREMENTS

### Core Tables
```sql
-- Products table
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  cost REAL NOT NULL,
  stock INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  barcode TEXT,
  is_active BOOLEAN DEFAULT 1,
  last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  transaction_code TEXT UNIQUE NOT NULL,
  total_amount REAL NOT NULL,
  discount REAL DEFAULT 0,
  final_amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  amount_paid REAL NOT NULL,
  change REAL NOT NULL,
  status TEXT DEFAULT 'COMPLETED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced BOOLEAN DEFAULT 0,
  cashier_id TEXT,
  branch_id TEXT,
  shift_id TEXT
);

-- Transaction items table
CREATE TABLE transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  discount REAL DEFAULT 0,
  total REAL NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE
);

-- NEW: Shift management tables
CREATE TABLE shifts (
  id TEXT PRIMARY KEY,
  cashier_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP,
  opening_balance REAL NOT NULL DEFAULT 0,
  closing_balance REAL,
  expected_cash REAL,
  actual_cash REAL,
  shortage_surplus REAL,
  status TEXT DEFAULT 'OPEN', -- OPEN, CLOSED, SUSPENDED
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cash_movements (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL,
  type TEXT NOT NULL, -- opening, sale, expense, adjustment, closing
  amount REAL NOT NULL,
  description TEXT,
  payment_method TEXT, -- for sales: cash, card, qris
  transaction_id TEXT, -- reference to transaction if applicable
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shift_id) REFERENCES shifts (id) ON DELETE CASCADE
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL,
  category TEXT NOT NULL, -- petty_cash, damaged_goods, sample, etc
  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  approved_by TEXT,
  receipt_number TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shift_id) REFERENCES shifts (id) ON DELETE CASCADE
);

-- NEW: Receipt templates table
CREATE TABLE receipt_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template_config TEXT NOT NULL, -- JSON configuration
  theme_config TEXT, -- JSON theme settings
  format_type TEXT NOT NULL, -- thermal, a4, fr3
  is_active BOOLEAN DEFAULT 0,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NEW: Branch settings table
CREATE TABLE branch_settings (
  id TEXT PRIMARY KEY,
  branch_id TEXT UNIQUE NOT NULL,
  store_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  tax_id TEXT,
  logo_url TEXT,
  receipt_template_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receipt_template_id) REFERENCES receipt_templates (id)
);

-- Sync log table
CREATE TABLE sync_log (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);

-- NEW: Hold transactions table
CREATE TABLE held_transactions (
  id TEXT PRIMARY KEY,
  hold_number TEXT UNIQUE NOT NULL, -- Auto-generated: HOLD-001, HOLD-002, etc
  cashier_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  items_data TEXT NOT NULL, -- JSON of cart items
  total_amount REAL NOT NULL,
  discount REAL DEFAULT 0,
  final_amount REAL NOT NULL,
  priority INTEGER DEFAULT 0, -- 0=normal, 1=urgent
  status TEXT DEFAULT 'HELD', -- HELD, RETRIEVED, EXPIRED, DELETED
  hold_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  retrieved_timestamp TIMESTAMP,
  expires_at TIMESTAMP, -- Auto-calculated: hold_timestamp + 24 hours
  notes TEXT,
  FOREIGN KEY (cashier_id) REFERENCES users (id),
  FOREIGN KEY (branch_id) REFERENCES branch_settings (branch_id)
);

-- NEW: Hold transaction items (snapshot of items when held)
CREATE TABLE held_transaction_items (
  id TEXT PRIMARY KEY,
  held_transaction_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  discount REAL DEFAULT 0,
  total REAL NOT NULL,
  FOREIGN KEY (held_transaction_id) REFERENCES held_transactions (id) ON DELETE CASCADE
);

-- Sync log table
  synced BOOLEAN DEFAULT 0,
  sync_error TEXT
);
```

---

## 🔧 TECHNICAL REQUIREMENTS

### Performance Requirements
**Must Have (Critical)**
- [ ] Offline functionality with local SQLite database
- [ ] Auto-sync with backend API when online
- [ ] Cash, Card, QRIS payment processing
- [ ] Multi-item shopping cart with quantity management
- [ ] Modern responsive UI with professional design
- [ ] **Hold transaction system (hold and retrieve)**
- [ ] Shift management with opening/closing procedures
- [ ] Cash reconciliation and reporting
- [ ] Customizable receipt templates with backend management

**Should Have (Important)**
- [ ] Split payment functionality
- [ ] Multi-branch warning system
- [ ] Keyboard shortcuts and accessibility
- [ ] Advanced reporting and analytics
- [ ] Inventory management integration

**Nice to Have (Enhancement)**
- [ ] Advanced search and filtering
- [ ] Bulk operations
- [ ] Custom themes and branding
- [ ] Integration with external systems
- [ ] Mobile companion app

---
**Test Cases:**
- T67: Hold transaction with items - verify hold created and cart cleared
- T68: Create new transaction after hold - verify new transaction starts
- T69: Retrieve held transaction - verify all items and totals restored
- T70: Create multiple holds - verify multiple transactions can be held
- T71: View held transactions list - verify all holds displayed
- T72: Edit held transaction - verify changes saved
- T73: Delete specific hold - verify removal from list
- T74: Delete all holds - verify bulk deletion works
- T75: Add customer info to hold - verify association saved
- T76: Search holds by customer - verify correct results
- T77: View customer holds - verify filtered results
- T78: Retrieve customer hold - verify customer info restored
- T79: Create priority hold - verify priority flag set
- T80: Configure hold timeout - verify automatic expiration
- T81: Transfer hold between cashiers - verify ownership change
- T82: View hold queue - verify ordering by priority/time
- T83: Test hold expiration - verify automatic cleanup after timeout
- T84: Test hold retrieval from different cashier - verify cross-cashier access

---
- Application startup time: < 5 seconds
- Transaction processing: < 2 seconds
- Database queries: < 500ms for standard operations
- Auto-sync frequency: 5 minutes (configurable)
- Offline operation: 100% functionality when disconnected

### Security Requirements
- User authentication with JWT tokens
- Role-based access control (Admin, Manager, Cashier)
- Session management with timeout
- Sensitive data encryption at rest
- Audit logging for financial transactions

### Compatibility Requirements
- Windows 10/11 support
- MacOS 10.15+ support
- Linux Ubuntu 18.04+ support
- SQLite database compatibility
- Common receipt printers (thermal, dot matrix)
- Barcode scanners (USB/Bluetooth)

---

## 📝 TESTING REQUIREMENTS

### Automated Testing
- Unit tests for all core functions
- Integration tests for payment processing
- End-to-end tests for complete transaction flows
- Database migration tests
- Sync functionality tests

### Manual Testing
- User acceptance testing for each requirement
- Cross-platform compatibility testing
- Performance testing under load
- Security testing for vulnerabilities
- Usability testing for user experience

### Test Environment
- Development environment with mock API
- Staging environment with test database
- Production-like environment for final testing

---

## 🚀 DEPLOYMENT REQUIREMENTS

### Packaging
- Electron application打包 as installer (.exe, .dmg, .deb)
- Auto-updater implementation
- Database migration on application startup
- Configuration file for different environments

### Monitoring
- Application crash reporting
- Performance monitoring
- Sync status monitoring
- User activity logging
- Financial transaction audit trail

---

## ✅ ACCEPTANCE CRITERIA SUMMARY

**Must Have (Critical)**
- [ ] Offline functionality with local better-SQLite3 database
- [ ] Auto-sync with backend API when online
- [ ] Cash, Card, QRIS payment processing
- [ ] Multi-item shopping cart with quantity management
- [ ] Modern responsive UI with professional design
- [ ] Shift management with opening/closing procedures
- [ ] Cash reconciliation and reporting
- [ ] Customizable receipt templates with backend management

**Should Have (Important)**
- [ ] Split payment functionality
- [ ] Multi-branch warning system
- [ ] Keyboard shortcuts and accessibility
- [ ] Advanced reporting and analytics
- [ ] Inventory management integration

**Nice to Have (Enhancement)**
- [ ] Advanced search and filtering
- [ ] Bulk operations
- [ ] Custom themes and branding
- [ ] Integration with external systems
- [ ] Mobile companion app

---

## 📅 IMPLEMENTATION TIMELINE

### Phase 1 (Core - 2 weeks)
- Offline-first database implementation
- Basic payment processing
- UI/UX completion
- Sync system activation

### Phase 2 (Critical - 3 weeks)
- Shift management system
- Branch switching warnings
- Receipt template system
- Testing and bug fixes

### Phase 3 (Enhancement - 2 weeks)
- Split payments
- Advanced reporting
- Performance optimization
- Documentation and training

**Total Estimated Timeline: 7 weeks**

---

**Document Owner**: BMS Development Team  
**Approval Required From**: Product Owner, Technical Lead, QA Lead  
**Last Updated**: 2025-11-17  
**Next Review**: 2025-12-01