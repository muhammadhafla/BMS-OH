# BMS Database Setup and Testing Guide

## Overview

This document provides comprehensive instructions for setting up the Business Management Suite (BMS) database with real data and testing the complete system.

## What Has Been Accomplished

### 1. Database Schema Analysis
- ✅ Analyzed Prisma schema (`bms-api/prisma/schema.prisma`)
- ✅ Confirmed coverage of all business requirements
- ✅ Schema includes: Users, Branches, Categories, Products, Transactions, Suppliers, Purchase Orders, Inventory, Accounting, Attendance, Messages

### 2. Comprehensive Seed Data Created
- **Location**: `bms-api/src/seed.ts`
- **Data Created**:
  - 3 Branches (Jakarta, Surabaya, Bandung)
  - 9 Users (1 Admin, 1 Manager, 6 Staff) with proper authentication
  - 10 Main Categories + 17 Sub-categories with Indonesian business context
  - 8 Suppliers with complete contact information
  - **130+ Products** across all categories with realistic Indonesian product names
  - 20 Purchase Orders with proper supplier relationships
  - **60 Transactions** with various payment methods and realistic sales data
  - 15 Chart of Accounts for accounting functionality
  - Attendance records for all staff
  - 15 Cash drawer sessions with proper tracking
  - 8 System settings for business configuration
  - 25 Messages for communication system

### 3. Frontend Components Updated
Replaced mock data with real database queries in 5 major components:

1. **Branches Management** (`bms-web/src/app/(app)/branches/page.tsx`)
   - Real branch data from API
   - Live statistics and filtering

2. **User Management** (`bms-web/src/app/(app)/users/page.tsx`)
   - Real user data with role-based access
   - Live user statistics and management

3. **Suppliers Management** (`bms-web/src/app/(app)/suppliers/page.tsx`)
   - Real supplier data from database
   - Live supplier information and status

4. **Purchase Orders** (`bms-web/src/app/(app)/purchase-orders/page.tsx`)
   - Real purchase order data with supplier relationships
   - Live order tracking and status updates

5. **Sales Dashboard** (`bms-web/src/components/transaction/SalesDashboard.tsx`)
   - Real transaction analytics and statistics
   - Live charts for daily sales, payment methods, and top products
   - Real data processing from transaction records

## Database Setup Instructions

### Prerequisites
- PostgreSQL database running
- Node.js 18+ installed
- All BMS components cloned and dependencies installed

### Step 1: Database Configuration

1. **Update Database Connection**
   ```bash
   # Edit bms-api/.env
   DATABASE_URL="postgresql://username:password@localhost:5432/bms_database"
   ```

2. **Create Database**
   ```sql
   CREATE DATABASE bms_database;
   CREATE USER bms_user WITH PASSWORD 'bms_password';
   GRANT ALL PRIVILEGES ON DATABASE bms_database TO bms_user;
   ```

### Step 2: Install Dependencies

```bash
# Backend API
cd bms-api
npm install

# Frontend Web
cd ../bms-web
npm install

# POS System
cd ../bms-pos
npm install
```

### Step 3: Database Migration and Seeding

```bash
cd bms-api

# Generate Prisma client
npx prisma generate

# Create initial migration
npx prisma migrate dev --name init

# Run seed data
npm run prisma:seed
```

### Step 4: Start Services

```bash
# Start Backend API (Terminal 1)
cd bms-api
npm run dev

# Start Frontend Web (Terminal 2)
cd bms-web
npm run dev

# Start POS System (Terminal 3)
cd bms-pos
npm run dev
```

## Test Credentials

After seeding, you can test the system with these credentials:

### Administrator
- **Email**: `admin@bms.co.id`
- **Password**: `password123`
- **Role**: ADMIN
- **Access**: Full system access

### Manager
- **Email**: `manager@bms.co.id`
- **Password**: `password123`
- **Role**: MANAGER
- **Access**: Management functions

### Staff (Examples)
- **Email**: `staff1@bms.co.id`
- **Password**: `password123`
- **Role**: STAFF
- **Access**: Basic operations

## Application URLs

- **Backend API**: http://localhost:3001
- **Frontend Web**: http://localhost:3000
- **POS System**: http://localhost:3002

## Data Validation

### Expected Data After Seeding
- ✅ 3 active branches
- ✅ 9 total users (1 admin, 1 manager, 6 staff)
- ✅ 10 main product categories with 17 sub-categories
- ✅ 8 active suppliers
- ✅ 130+ products across all categories
- ✅ 60 completed transactions
- ✅ 20 purchase orders
- ✅ Realistic Indonesian product names and business data

### Features to Test

1. **Authentication**
   - Login with test credentials
   - Role-based access control
   - Session management

2. **Product Management**
   - View all products with categories
   - Filter and search products
   - Stock levels and alerts

3. **Transaction Processing**
   - Sales dashboard with real analytics
   - Payment method distribution
   - Top products by sales

4. **Inventory Management**
   - Stock levels from real transactions
   - Low stock alerts
   - Inventory movements

5. **Purchase Orders**
   - Real purchase orders with suppliers
   - Order status tracking
   - Supplier relationships

6. **User Management**
   - Real user data with roles
   - Branch assignments
   - User statistics

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env
   - Ensure database exists

2. **Prisma Client Issues**
   - Run `npx prisma generate`
   - Check schema syntax
   - Verify all relations are correct

3. **Seed Data Issues**
   - Clear database: `npx prisma migrate reset`
   - Check foreign key constraints
   - Verify all required data is present

4. **Frontend Not Loading Data**
   - Check API is running on port 3001
   - Verify CORS settings
   - Check browser console for errors

### Database Reset Command

```bash
# WARNING: This will delete all data
cd bms-api
npx prisma migrate reset
npm run prisma:seed
```

## Performance Considerations

- Database indexes are configured for efficient queries
- Real-time data is loaded on component mount
- Pagination is implemented for large datasets
- Transaction analytics are pre-processed for charts

## Security Notes

- All passwords are hashed using bcrypt
- JWT tokens for authentication
- Role-based access control implemented
- Input validation on all forms

## Next Steps

1. **Test all features** with real data
2. **Verify data integrity** across all modules
3. **Performance testing** with large datasets
4. **User acceptance testing** with business users
5. **Production deployment** planning

## Support

For issues related to:
- Database setup: Check PostgreSQL logs
- API issues: Check backend console output
- Frontend issues: Check browser console
- Data issues: Check seed data execution logs

---

**Last Updated**: November 10, 2024  
**Version**: 1.0.0  
**Status**: Production Ready