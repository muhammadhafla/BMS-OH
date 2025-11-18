# BMS Dual Platform Architecture Requirements

**Version:** 1.0  
**Date:** 2025-11-17  
**Status:** Final - Architecture Decision Document  

---

## 1. Executive Summary

### Platform Decision Rationale

After comprehensive analysis of BMS requirements and stakeholder needs, we have established a **dual-platform architecture** that optimally serves different user personas and operational requirements:

**Web Platform (bms-web)**: Administration, Management, Reporting, Analytics  
**Electron Desktop Platform (bms-pos)**: Point of Sales (POS) transactions with offline-first capability

### Key Decisions
- **Architecture**: Unified business logic with platform-specific UIs
- **Technology Stack**: Next.js (Web) + React/Electron (Desktop)
- **Database Strategy**: Dual database approach with PostgreSQL (Web) + SQLite (Electron)
- **API Integration**: RESTful API with real-time sync capabilities
- **Data Sharing**: Bidirectional synchronization mechanism

---

## 2. Dual Platform Architecture Overview

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    BMS DUAL PLATFORM                         │
├─────────────────────┬───────────────────────┬─────────────────┤
│   WEB ADMIN PLATFORM │   ELECTRON DESKTOP   │   BACKEND API   │
│   (bms-web)         │   (bms-pos)          │   (bms-api)     │
├─────────────────────┼───────────────────────┼─────────────────┤
│ • Administration    │ • POS Transactions   │ • RESTful API   │
│ • Management        │ • Offline Operations │ • Authentication│
│ • Reporting         │ • Receipt Printing   │ • Data Sync     │
│ • Analytics         │ • Inventory Lookup   │ • WebSocket     │
│ • Settings          │ • Customer Management│ • Middleware    │
├─────────────────────┼───────────────────────┼─────────────────┤
│ Frontend:           │ Frontend:            │ Backend:        │
│ • Next.js 14        │ • React 18           │ • Node.js       │
│ • TypeScript        │ • TypeScript         │ • Express.js    │
│ • Tailwind CSS      │ • Electron           │ • PostgreSQL    │
│ • Shadcn/ui         │ • Vite               │                 │
├─────────────────────┼───────────────────────┼─────────────────┤
│ Database:           │ Database:            │ Integration:    │
│ • PostgreSQL        │ • better-sqlite3     │ • REST API      │
│ • Prisma ORM        │ • Real-time sync     │ • WebSocket     │
│ • Server-side       │ • Local caching      │ • Authentication│
└─────────────────────┴───────────────────────┴─────────────────┘
```

### 2.2 Core Principles

1. **Separation of Concerns**: Each platform focuses on its core strengths
2. **Data Consistency**: Unified data model across platforms
3. **Offline Capability**: Electron platform supports offline transactions
4. **Real-time Sync**: Seamless data synchronization when online
5. **User Experience**: Platform-optimized interfaces for each use case

---

## 3. Platform-Specific Requirements

### 3.1 Web Platform Requirements (bms-web)

#### 3.1.1 Core Features
- **User Management**: Authentication, authorization, role-based access
- **Product Management**: CRUD operations, categorization, pricing
- **Inventory Management**: Stock tracking, adjustments, audit trails
- **Transaction Management**: Sales/purchase order processing
- **Reporting & Analytics**: Dashboards, reports, data visualization
- **System Administration**: Settings, configuration, system health

#### 3.1.2 Technical Requirements
- **Framework**: Next.js 14 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT tokens
- **State Management**: Zustand for client state
- **UI Framework**: Tailwind CSS + Shadcn/ui components
- **Real-time Updates**: WebSocket connections for live data

#### 3.1.3 Performance Requirements
- **Page Load Time**: < 3 seconds for initial load
- **API Response**: < 500ms for standard operations
- **Concurrent Users**: Support 100+ simultaneous users
- **Data Export**: Handle large dataset exports efficiently

### 3.2 Electron Platform Requirements (bms-pos)

#### 3.2.1 Core Features
- **POS Interface**: Touch-friendly transaction interface
- **Offline Operations**: Full POS functionality without internet
- **Receipt Generation**: Thermal printer integration
- **Inventory Lookup**: Quick product and price lookup
- **Customer Management**: Basic customer data entry
- **Data Sync**: Automatic synchronization when online

#### 3.2.2 Technical Requirements
- **Framework**: React 18 + Electron
- **Database**: better-sqlite3 for local storage
- **State Management**: React Context + useReducer
- **Printing**: Node-thermal-printer integration
- **Build Tool**: Vite for development, Electron Builder for distribution
- **Auto-updater**: Electron-updater for application updates

#### 3.2.3 Performance Requirements
- **Startup Time**: < 5 seconds cold start
- **Transaction Time**: < 2 seconds per sale
- **Offline Support**: 24+ hours of continuous operation
- **Printer Response**: < 1 second for receipt printing

---

## 4. Technology Stack Matrix

### 4.1 Frontend Technologies

| Component | Web Platform (bms-web) | Electron Platform (bms-pos) |
|-----------|------------------------|-----------------------------|
| **Framework** | Next.js 14 | React 18 + Electron |
| **Language** | TypeScript | TypeScript |
| **Styling** | Tailwind CSS | Tailwind CSS |
| **UI Components** | Shadcn/ui | Custom components |
| **State Management** | Zustand | React Context |
| **HTTP Client** | Axios | Axios |
| **Build Tool** | Next.js (Webpack) | Vite + Electron |
| **Development Server** | Next.js dev server | Vite dev server |

### 4.2 Backend & Database

| Component | Web Platform | Electron Platform |
|-----------|-------------|-------------------|
| **API Server** | Next.js API Routes | N/A (Offline-first) |
| **Database** | PostgreSQL | SQLite (better-sqlite3) |
| **ORM** | Prisma | Direct SQL queries |
| **Authentication** | NextAuth.js | JWT tokens |
| **File Storage** | PostgreSQL + File system | Local file system |

### 4.3 Development Tools

| Tool Category | Web Platform | Electron Platform |
|---------------|--------------|-------------------|
| **Linting** | ESLint | ESLint |
| **Testing** | Jest + React Testing Library | Vitest + React Testing Library |
| **Type Checking** | TypeScript | TypeScript |
| **Code Formatting** | Prettier | Prettier |
| **Bundle Analysis** | Next.js Bundle Analyzer | Electron Bundle Analyzer |

---

## 5. Database Architecture

### 5.1 Database Strategy Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE ARCHITECTURE                     │
├─────────────────────┬───────────────────────┬─────────────────┤
│   POSTGRESQL        │      SYNC LAYER       │    SQLITE       │
│   (Web/Admin)       │   (API Endpoints)     │ (Electron/POS)  │
├─────────────────────┼───────────────────────┼─────────────────┤
│ • Master Data       │ • REST API            │ • Local Cache   │
│ • User Management   │ • WebSocket           │ • Transaction   │
│ • Reporting Data    │ • Conflict Resolution │ • Offline Queue │
│ • Analytics         │ • Data Validation     │ • Sync Status   │
│ • Audit Logs        │ • Batch Operations    │ • User Prefs    │
└─────────────────────┴───────────────────────┴─────────────────┘
```

### 5.2 Database Comparison

| Aspect | PostgreSQL (Web) | SQLite (Electron) |
|--------|------------------|-------------------|
| **Primary Use** | Master data, admin functions | Local operations, POS |
| **Schema** | Full relational model | Simplified schema |
| **Transactions** | ACID compliant | ACID compliant |
| **Storage** | Server-based | File-based |
| **Concurrency** | Multi-user | Single-user |
| **Backup** | Automated backups | Manual file copy |
| **Sync** | Bidirectional | Pull/Push from PostgreSQL |

### 5.3 Data Synchronization Strategy

#### 5.3.1 Sync Direction
- **Web → Electron**: Master data updates (products, prices, settings)
- **Electron → Web**: Transaction data, inventory changes
- **Bidirectional**: Customer data, product catalog

#### 5.3.2 Sync Frequency
- **Real-time**: Critical transactions (sales, inventory adjustments)
- **Scheduled**: Master data updates (every 15 minutes)
- **Manual**: User-initiated full sync
- **On-demand**: Background sync during idle time

#### 5.3.3 Conflict Resolution
- **Last Writer Wins**: For non-critical data
- **Server Authority**: For master data (products, pricing)
- **Manual Review**: For transaction conflicts
- **Audit Trail**: Track all sync operations

---

## 6. API Integration Strategy

### 6.1 API Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API INTEGRATION                        │
├─────────────────────┬───────────────────────┬─────────────────┤
│   ELECTRON CLIENT   │    API GATEWAY        │  WEB PLATFORM   │
│   (bms-pos)         │   (bms-api)           │   (bms-web)     │
├─────────────────────┼───────────────────────┼─────────────────┤
│ • REST API Calls    │ • Authentication      │ • Next.js API   │
│ • WebSocket Events  │ • Rate Limiting       │ • Prisma ORM    │
│ • Background Sync   │ • Data Validation     │ • PostgreSQL    │
│ • Offline Queue     │ • Response Formatting │ • File Upload   │
│ • Error Handling    │ • Logging/Monitoring  │ • Real-time     │
└─────────────────────┴───────────────────────┴─────────────────┘
```

### 6.2 API Endpoints Structure

#### 6.2.1 Authentication Endpoints
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/profile
POST   /api/auth/refresh
```

#### 6.2.2 Product Management
```
GET    /api/products              # List products
GET    /api/products/:id          # Get product details
POST   /api/products              # Create product (Web only)
PUT    /api/products/:id          # Update product (Web only)
DELETE /api/products/:id          # Delete product (Web only)
GET    /api/products/search       # Search products (POS)
```

#### 6.2.3 Inventory Management
```
GET    /api/inventory             # Stock levels
POST   /api/inventory/adjustment  # Stock adjustment (Both)
GET    /api/inventory/low-stock   # Low stock alerts (Web)
GET    /api/inventory/history     # Movement history (Web)
```

#### 6.2.4 Transactions
```
POST   /api/transactions          # Create transaction (POS)
GET    /api/transactions          # List transactions (Web)
GET    /api/transactions/:id      # Transaction details
POST   /api/transactions/:id/receipt  # Generate receipt (POS)
```

#### 6.2.5 Synchronization
```
GET    /api/sync/status           # Sync status
POST   /api/sync/pull             # Pull data from server
POST   /api/sync/push             # Push local data
GET    /api/sync/conflicts        # Handle conflicts
```

### 6.3 WebSocket Events

#### 6.3.1 Real-time Updates
```javascript
// Inventory updates
'inventory:updated'
'product:updated'
'transaction:created'

// System notifications
'system:notification'
'sync:status'

// User management
'user:online'
'user:offline'
```

### 6.4 Error Handling Strategy

#### 6.4.1 HTTP Error Codes
- **400**: Bad Request - Invalid data
- **401**: Unauthorized - Authentication required
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource doesn't exist
- **409**: Conflict - Data conflict during sync
- **429**: Too Many Requests - Rate limiting
- **500**: Internal Server Error - Server issues

#### 6.4.2 Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Product name is required",
    "details": {
      "field": "name",
      "value": ""
    }
  }
}
```

---

## 7. Data Synchronization Approach

### 7.1 Sync Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   DATA SYNCHRONIZATION                      │
├─────────────────────┬───────────────────────┬─────────────────┤
│   LOCAL DATABASE    │     SYNC MANAGER      │   REMOTE DB     │
│   (SQLite/Electron) │   (Background Task)   │ (PostgreSQL/Web)│
├─────────────────────┼───────────────────────┼─────────────────┤
│ • Transactions      │ • Change Detection    │ • Master Data   │
│ • Offline Queue     │ • Conflict Resolution │ • User Data     │
│ • Cached Products   │ • Batch Processing    │ • Reports       │
│ • User Preferences  │ • Retry Logic         │ • Analytics     │
│ • Sync Metadata     │ • Progress Tracking   │ • Audit Logs    │
└─────────────────────┴───────────────────────┴─────────────────┘
```

### 7.2 Synchronization Phases

#### 7.2.1 Initialization Phase
1. **Initial Setup**: Create local database schema
2. **Data Download**: Pull master data from server
3. **User Authentication**: Establish secure connection
4. **Configuration Sync**: Download application settings

#### 7.2.2 Operational Phase
1. **Local Operations**: Store data in SQLite
2. **Change Detection**: Track modifications
3. **Background Sync**: Periodically sync with server
4. **Conflict Resolution**: Handle data conflicts

#### 7.2.3 Recovery Phase
1. **Connection Restore**: Resume sync after disconnection
2. **Queue Processing**: Upload pending transactions
3. **Data Validation**: Verify data integrity
4. **Status Update**: Update sync status

### 7.3 Sync Data Types

#### 7.3.1 Master Data (Server → Client)
- **Products**: Catalog, pricing, categories
- **Users**: Profiles, permissions, settings
- **Inventory**: Stock levels, locations
- **Customers**: Contact information, history

#### 7.3.2 Transaction Data (Client → Server)
- **Sales**: Completed transactions
- **Adjustments**: Inventory changes
- **Returns**: Product returns
- **Payments**: Payment methods, amounts

#### 7.3.3 System Data (Bidirectional)
- **Settings**: User preferences
- **Audit Logs**: Activity tracking
- **Notifications**: System messages
- **Sync Status**: Progress indicators

### 7.4 Conflict Resolution Rules

#### 7.4.1 Conflict Types
- **Product Updates**: Server wins (authoritative data)
- **Transaction Conflicts**: Check timestamps, last writer wins
- **Inventory Discrepancies**: Server reconciliation required
- **User Settings**: Client preference with server backup

#### 7.4.2 Resolution Strategies
```
Product Catalog: Server Authority Rule
├─ New Product: Always from server
├─ Price Changes: Server wins
└─ Stock Updates: Combine both sources

Transactions: Last Writer Wins
├─ Sale Record: Check timestamps
├─ Payment Status: Server validation
└─ Receipt Data: Merge if possible

User Data: Client Preference
├─ Preferences: Client wins
├─ Permissions: Server wins
└─ Custom Fields: Merge intelligently
```

---

## 8. Feature Allocation per Platform

### 8.1 Web Platform Features

#### 8.1.1 Administration & Management
| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| **User Management** | High | Medium | Full CRUD, role management |
| **System Settings** | High | Low | Configuration, preferences |
| **Branch Management** | Medium | Medium | Multi-location support |
| **Permission Control** | High | High | Role-based access control |

#### 8.1.2 Product & Inventory Management
| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| **Product Catalog** | High | High | Full CRUD, categorization |
| **Inventory Tracking** | High | High | Stock levels, movements |
| **Bulk Operations** | Medium | High | CSV import/export, batch updates |
| **Supplier Management** | Medium | Medium | Vendor relationships |

#### 8.1.3 Reporting & Analytics
| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| **Sales Reports** | High | Medium | Daily, weekly, monthly |
| **Inventory Reports** | High | Medium | Stock levels, movements |
| **Financial Reports** | Medium | High | P&L, balance sheet |
| **Custom Analytics** | Low | High | Dashboard customization |

#### 8.1.4 Transaction Management
| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| **Purchase Orders** | Medium | Medium | Supplier orders |
| **Sales Orders** | Low | Medium | Web-based sales |
| **Returns Processing** | Medium | Low | Return merchandise |
| **Payment Tracking** | Medium | Low | Payment status updates |

### 8.2 Electron Platform Features

#### 8.2.1 Point of Sales
| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| **Transaction Interface** | Critical | High | Touch-optimized UI |
| **Product Lookup** | Critical | Medium | Fast barcode/name search |
| **Payment Processing** | Critical | Medium | Multiple payment methods |
| **Receipt Generation** | Critical | Low | Thermal printer integration |

#### 8.2.2 Inventory Operations
| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| **Stock Lookup** | High | Low | Quick inventory check |
| **Stock Adjustment** | High | Medium | Manual adjustments |
| **Low Stock Alert** | High | Low | Visual notifications |
| **Inventory Sync** | High | Medium | Background synchronization |

#### 8.2.3 Customer Management
| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| **Customer Search** | Medium | Low | Quick customer lookup |
| **Customer Entry** | Medium | Low | Basic information entry |
| **Purchase History** | Medium | Low | Customer transaction history |
| **Customer Loyalty** | Low | Medium | Points/ rewards system |

#### 8.2.4 Offline Operations
| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| **Offline Transactions** | Critical | High | Full POS without internet |
| **Data Caching** | Critical | Medium | Essential data locally |
| **Sync Status** | High | Low | Visual sync indicators |
| **Error Handling** | High | Medium | Graceful degradation |

### 8.3 Shared Features

| Feature | Web Implementation | Electron Implementation | Sync Strategy |
|---------|-------------------|------------------------|---------------|
| **Authentication** | NextAuth.js | JWT tokens | Token synchronization |
| **Product Search** | Advanced filtering | Quick lookup | Client-side caching |
| **Transaction History** | Full history | Recent transactions | Periodic sync |
| **Notifications** | Real-time alerts | Status indicators | WebSocket + local |
| **Data Export** | Multiple formats | Receipt printing | Server-initiated |

---

## 9. Development Timeline

### 9.1 Phase 1: Foundation Setup (4 weeks)

#### Week 1-2: Core Infrastructure
- [ ] Set up dual project structure
- [ ] Configure PostgreSQL database schema
- [ ] Implement basic authentication system
- [ ] Create shared API endpoints

#### Week 3-4: Database & API
- [ ] Design SQLite schema for Electron
- [ ] Implement basic CRUD operations
- [ ] Set up WebSocket connections
- [ ] Create data synchronization framework

### 9.2 Phase 2: Core Features (8 weeks)

#### Week 5-6: Web Platform Core
- [ ] User management interface
- [ ] Product management system
- [ ] Basic inventory tracking
- [ ] Dashboard and reporting

#### Week 7-8: Electron Platform Core
- [ ] POS transaction interface
- [ ] Product lookup functionality
- [ ] Receipt printing system
- [ ] Offline data storage

#### Week 9-10: Integration
- [ ] API integration testing
- [ ] Data synchronization logic
- [ ] Conflict resolution implementation
- [ ] Error handling and recovery

#### Week 11-12: Testing & Optimization
- [ ] Cross-platform testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] User acceptance testing

### 9.3 Phase 3: Advanced Features (6 weeks)

#### Week 13-14: Enhanced Web Features
- [ ] Advanced reporting system
- [ ] Analytics dashboard
- [ ] Bulk operations interface
- [ ] System administration tools

#### Week 15-16: Enhanced Electron Features
- [ ] Customer management system
- [ ] Advanced payment processing
- [ ] Inventory management tools
- [ ] User preferences interface

#### Week 17-18: Sync & Integration
- [ ] Real-time synchronization
- [ ] Advanced conflict resolution
- [ ] Data validation and integrity
- [ ] Performance monitoring

### 9.4 Phase 4: Deployment & Launch (4 weeks)

#### Week 19-20: Production Preparation
- [ ] Production database setup
- [ ] Security hardening
- [ ] Backup and recovery systems
- [ ] Monitoring and logging

#### Week 21-22: User Training & Documentation
- [ ] User manuals creation
- [ ] Training material development
- [ ] Administrator guides
- [ ] Technical documentation

### 9.5 Milestone Summary

| Phase | Duration | Key Deliverables | Success Criteria |
|-------|----------|------------------|------------------|
| **Foundation** | 4 weeks | Core infrastructure, basic authentication | Both platforms can authenticate and sync basic data |
| **Core Features** | 8 weeks | POS system, web admin, basic sync | Complete transaction flow and data management |
| **Advanced Features** | 6 weeks | Full feature set, advanced sync | All requirements implemented and tested |
| **Deployment** | 4 weeks | Production ready, documentation | System deployed and users trained |

---

## 10. Implementation Guidelines

### 10.1 Development Standards

#### 10.1.1 Code Quality
- **TypeScript**: Strict type checking enabled
- **ESLint**: Zero warnings policy
- **Prettier**: Consistent code formatting
- **Testing**: Minimum 80% code coverage
- **Documentation**: JSDoc for all public APIs

#### 10.1.2 Architecture Patterns
```
Web Platform (Next.js):
├─ App Router structure
├─ Server components for data fetching
├─ Client components for interactivity
├─ API routes for backend logic
└─ Middleware for auth and validation

Electron Platform:
├─ Main process: System integration
├─ Renderer process: UI components
├─ IPC communication: Inter-process
├─ Background service: Data sync
└─ Local database: SQLite operations
```

### 10.2 Database Guidelines

#### 10.2.1 PostgreSQL Schema (Web)
```sql
-- Core tables structure
users: id, email, name, role, created_at, updated_at
products: id, name, price, category_id, created_at, updated_at
categories: id, name, description, parent_id
transactions: id, user_id, total_amount, created_at, status
transaction_items: transaction_id, product_id, quantity, unit_price
inventory: product_id, quantity, location, last_updated
audit_logs: id, table_name, record_id, action, user_id, timestamp
```

#### 10.2.2 SQLite Schema (Electron)
```sql
-- Simplified local schema
users: id, email, name, role, settings_json
products: id, name, price, category_id, sync_status, last_sync
transactions: id, user_id, total_amount, created_at, status, sync_status
transaction_items: transaction_id, product_id, quantity, unit_price
inventory: product_id, quantity, last_updated
sync_queue: id, operation, table_name, record_data, status, created_at
```

### 10.3 API Design Guidelines

#### 10.3.1 RESTful Conventions
```
Resource Operations:
GET    /api/products          # List products
POST   /api/products          # Create product
GET    /api/products/:id      # Get product
PUT    /api/products/:id      # Update product
DELETE /api/products/:id      # Delete product

Sub-resources:
GET    /api/products/:id/inventory    # Product inventory
GET    /api/products/:id/transactions # Product transactions
```

#### 10.3.2 Error Handling Standards
```typescript
// Standard error response interface
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
  }
}

// Error codes enum
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_DENIED = 'AUTHORIZATION_DENIED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}
```

### 10.4 Synchronization Guidelines

#### 10.4.1 Data Change Detection
```typescript
// Change tracking interface
interface ChangeRecord {
  id: string;
  table: string;
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  timestamp: string;
  userId: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'CONFLICT' | 'ERROR';
}

// Change detection triggers
enum ChangeTrigger {
  DATABASE_TRIGGER = 'database_trigger',
  APPLICATION_EVENT = 'application_event',
  MANUAL_EXPORT = 'manual_export',
  SYNC_SERVICE = 'sync_service'
}
```

#### 10.4.2 Conflict Resolution
```typescript
// Conflict resolution strategies
interface ConflictResolution {
  strategy: 'SERVER_WINS' | 'CLIENT_WINS' | 'MERGE' | 'MANUAL';
  priority: number;
  fields?: string[]; // Fields to apply strategy to
  customLogic?: (serverData: any, clientData: any) => any;
}

// Resolution priority
const RESOLUTION_PRIORITY = {
  PRODUCT_CATALOG: { strategy: 'SERVER_WINS', priority: 100 },
  TRANSACTIONS: { strategy: 'LAST_WRITER_WINS', priority: 80 },
  USER_SETTINGS: { strategy: 'CLIENT_WINS', priority: 60 },
  INVENTORY: { strategy: 'MERGE', priority: 40 }
};
```

### 10.5 Security Guidelines

#### 10.5.1 Authentication & Authorization
```typescript
// JWT token structure
interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  expiresAt: number;
  issuedAt: number;
}

// Role-based permissions
enum Permission {
  READ_PRODUCTS = 'READ_PRODUCTS',
  WRITE_PRODUCTS = 'WRITE_PRODUCTS',
  READ_TRANSACTIONS = 'READ_TRANSACTIONS',
  WRITE_TRANSACTIONS = 'WRITE_TRANSACTIONS',
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_REPORTS = 'VIEW_REPORTS',
  ADMIN_ACCESS = 'ADMIN_ACCESS'
}
```

#### 10.5.2 Data Protection
- **Encryption**: AES-256 for sensitive data
- **API Security**: Rate limiting, input validation
- **Local Storage**: Encrypted SQLite database
- **Network Security**: HTTPS/WSS only
- **Audit Logging**: All critical operations logged

### 10.6 Testing Strategy

#### 10.6.1 Testing Pyramid
```
E2E Tests (Cypress)
├─ Complete user workflows
├─ Cross-platform testing
└─ Data synchronization

Integration Tests (Jest)
├─ API endpoint testing
├─ Database operations
├─ WebSocket communication
└─ Sync process validation

Unit Tests (Jest/Vitest)
├─ Component testing
├─ Function testing
├─ Utility testing
└─ Hook testing

Component Tests
├─ React component testing
├─ Electron IPC testing
├─ Database schema testing
└─ Configuration testing
```

#### 10.6.2 Test Coverage Requirements
- **Unit Tests**: ≥ 90% code coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user journeys
- **Performance Tests**: Load and stress testing

### 10.7 Deployment Guidelines

#### 10.7.1 Web Platform Deployment
```bash
# Production build
npm run build
npm run start

# Docker deployment
docker build -t bms-web .
docker run -p 3000:3000 bms-web

# Environment configuration
NODE_ENV=production
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://...
```

#### 10.7.2 Electron Platform Distribution
```bash
# Package application
npm run build
npm run electron-builder

# Create installers
electron-builder --win
electron-builder --mac
electron-builder --linux

# Auto-updater configuration
update.yml:
  provider: github
  owner: your-org
  repo: bms-pos
```

---

## 11. Conflict Resolution Summary

### 11.1 Resolved Conflicts

| Original Conflict | Resolution | Implementation |
|-------------------|------------|----------------|
| **Platform Target** | Dual platform approach | Web admin + Electron POS |
| **Backend Architecture** | Web API complete, Electron offline-first | Separate database strategies |
| **Database Strategy** | Dual database approach | PostgreSQL (Web) + SQLite (Electron) |
| **Technology Stack** | Platform-optimized stacks | Next.js (Web) + React/Electron (POS) |
| **Feature Allocation** | Clear platform boundaries | Web: Admin, Electron: POS |
| **Documentation Level** | Balanced technical detail | Comprehensive but focused |

### 11.2 Unified Architecture Benefits

1. **Optimized User Experience**: Each platform designed for its primary use case
2. **Offline Capability**: Electron platform enables uninterrupted POS operations
3. **Scalable Administration**: Web platform provides comprehensive management tools
4. **Data Consistency**: Unified synchronization ensures data integrity
5. **Development Efficiency**: Clear separation allows parallel development
6. **Maintenance Simplicity**: Focused codebase per platform reduces complexity

### 11.3 Success Metrics

#### 11.3.1 Technical Metrics
- **Performance**: < 3s web load time, < 2s POS transaction time
- **Reliability**: 99.9% uptime for web, 24h offline operation for POS
- **Data Integrity**: Zero data loss during synchronization
- **User Satisfaction**: > 90% positive feedback on both platforms

#### 11.3.2 Business Metrics
- **Adoption Rate**: 100% migration from existing systems
- **Training Time**: < 4 hours for basic POS operation
- **Error Rate**: < 1% transaction errors
- **Support Tickets**: < 5% of users requiring assistance

---

## 12. Conclusion

This BMS Dual Platform Architecture provides a comprehensive solution that addresses all identified conflicts while optimizing for each platform's strengths. The architecture ensures:

- **Web Platform**: Complete administrative, management, and analytical capabilities
- **Electron Platform**: Robust, offline-first POS functionality
- **Unified Data Model**: Consistent information across both platforms
- **Seamless Integration**: Real-time synchronization and conflict resolution
- **Scalable Foundation**: Architecture that grows with business needs

The implementation timeline of 22 weeks provides sufficient time for thorough development, testing, and deployment while maintaining quality standards and ensuring user adoption success.

**Next Steps:**
1. Begin Phase 1 development (Foundation Setup)
2. Set up development environments and CI/CD pipelines
3. Create detailed technical specifications for each platform
4. Establish regular stakeholder review meetings
5. Begin user acceptance testing preparation

---

**Document Approval:**
- [ ] Technical Lead: ________________ Date: __________
- [ ] Product Manager: ______________ Date: __________
- [ ] Development Team: _____________ Date: __________
- [ ] Stakeholder: _________________ Date: __________

**Revision History:**
- v1.0 (2025-11-17): Initial dual platform architecture document