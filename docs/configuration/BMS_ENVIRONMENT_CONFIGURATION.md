# BMS Environment Configuration Documentation

## Overview

This document provides a comprehensive analysis of the Business Management Suite (BMS) projects and their environment configuration requirements. Three separate environment files have been created to support the complete BMS ecosystem.

## Project Analysis Summary

### 1. BMS API (Backend)
**Technology Stack:**
- Node.js + TypeScript
- Express.js framework
- PostgreSQL database with Prisma ORM
- JWT authentication
- File upload handling (CSV, Excel)
- Rate limiting and security middleware

**Key Dependencies Analyzed:**
- `@prisma/client` - Database ORM
- `jsonwebtoken` - JWT token handling
- `bcryptjs` - Password hashing
- `express-rate-limit` - API rate limiting
- `helmet` - Security headers
- `morgan` - Request logging
- `csv-stringify`, `exceljs`, `xlsx` - File processing

### 2. BMS Web (Frontend)
**Technology Stack:**
- Next.js 14 with TypeScript
- React 18
- Axios for API communication
- Zustand for state management
- React Hook Form with Zod validation
- Tailwind CSS with Radix UI components

**Key Dependencies Analyzed:**
- `axios` - HTTP client with token management
- `js-cookie` - Cookie-based token storage
- `swr` - Data fetching and caching
- `zustand` - State management
- `react-hook-form` + `@hookform/resolvers` - Form handling
- `recharts` - Charts and analytics
- `jspdf`, `html2canvas` - PDF generation

### 3. BMS POS (Desktop Application)
**Technology Stack:**
- Electron + Vite
- React 18
- SQLite (better-sqlite3) for local database
- Axios for API communication
- Local product caching and transaction sync

**Key Dependencies Analyzed:**
- `better-sqlite3` - Local SQLite database
- `electron-is-dev` - Environment detection
- `axios` - API communication
- `concurrently`, `wait-on` - Development tools
- `cross-env` - Environment variable management

## Environment Files Created

### 1. `/bms-api/.env` (171 lines)
**Purpose:** Backend API server configuration

**Key Configuration Categories:**
- **Server Configuration**: PORT, NODE_ENV, timezone
- **Database**: PostgreSQL connection with pooling
- **Authentication**: JWT secrets and expiration times
- **Security**: CORS, rate limiting, security headers
- **File Management**: Upload limits, file types, directories
- **Business Rules**: Currency, tax rates, company info
- **Logging & Monitoring**: Log levels, health checks
- **External Services**: Email/SMS configuration placeholders

**Critical Environment Variables:**
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/database
JWT_SECRET=your-secure-secret-key
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### 2. `/bms-web/.env.local` (267 lines)
**Purpose:** Next.js frontend application configuration

**Key Configuration Categories:**
- **API Configuration**: Base URL, timeout, debugging
- **Authentication**: Token storage, refresh handling
- **UI/UX**: Theme, language, animations
- **Currency & Formatting**: Indonesian Rupiah formatting
- **Search & Filtering**: Debounce, limits
- **File Upload**: Size limits, types, drag & drop
- **Export & Reporting**: CSV, client/server-side processing
- **Charts & Analytics**: Default themes, colors
- **Performance**: Caching, image optimization

**Critical Environment Variables:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_DEFAULT_CURRENCY=IDR
NEXT_PUBLIC_DEFAULT_LOCALE=id
NEXT_PUBLIC_TOKEN_STORAGE=cookie
```

### 3. `/bms-pos/.env` (383 lines)
**Purpose:** Electron desktop POS application configuration

**Key Configuration Categories:**
- **Application**: Version, company info, environment
- **API Configuration**: Server connection, retry logic
- **Local Database**: SQLite configuration and backup
- **Synchronization**: Offline mode, sync intervals
- **POS Operations**: Barcode, receipt printing, cash drawer
- **Transaction Settings**: Payment methods, tax, discounts
- **Inventory Management**: Stock tracking, alerts
- **Hardware Integration**: Printers, scales, displays
- **Security**: Authentication, session management
- **Business Logic**: Branch management, multi-location

**Critical Environment Variables:**
```bash
VITE_API_URL=http://localhost:3001/api
SQLITE_DB_PATH=./pos.db
DEFAULT_CURRENCY=IDR
ENABLE_OFFLINE_MODE=true
```

## Database Architecture

### PostgreSQL (bms-api)
- **Primary Database**: Main business data storage
- **Users & Authentication**: JWT-based auth system
- **Multi-tenant**: Branch-based data isolation
- **Full ACID Compliance**: Financial data integrity

### SQLite (bms-pos)
- **Local Cache**: Product information synchronization
- **Offline Transactions**: Store sales when disconnected
- **Lightweight**: No server dependency for core POS functions
- **Automatic Sync**: Push transactions to main server

## Security Considerations

### Authentication Flow
1. **Web Frontend**: JWT tokens stored in HttpOnly cookies
2. **POS Application**: JWT tokens with automatic refresh
3. **API Security**: Role-based access control (ADMIN, MANAGER, STAFF)
4. **Branch Isolation**: Users can only access their branch data

### Data Protection
- Password hashing with bcrypt (12 rounds)
- JWT token expiration and refresh mechanism
- CORS configuration for cross-origin requests
- Rate limiting to prevent abuse
- Input validation with Zod schemas

## Development Setup

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 12+ database server
- Git for version control

### Quick Start
1. **Backend Setup:**
   ```bash
   cd bms-api
   npm install
   # Configure .env file
   npx prisma migrate dev
   npm run dev
   ```

2. **Frontend Setup:**
   ```bash
   cd bms-web
   npm install
   # Configure .env.local file
   npm run dev
   ```

3. **POS Setup:**
   ```bash
   cd bms-pos
   npm install
   # Configure .env file
   npm run dev
   ```

### Environment Variable Guidelines

#### Development
- Use development database URLs
- Enable debugging and logging
- Use permissive CORS settings
- Set appropriate timeouts for development

#### Production
- Use environment-specific secrets
- Enable SSL/TLS connections
- Configure production database
- Set appropriate security headers
- Monitor performance and errors

## Configuration Best Practices

### Security
1. **Never commit .env files** to version control
2. **Use strong secrets** for JWT and session keys
3. **Validate all environment variables** at startup
4. **Use HTTPS** in production environments
5. **Implement proper rate limiting** for API endpoints

### Performance
1. **Configure database connection pooling** appropriately
2. **Set reasonable timeouts** for API calls
3. **Enable caching** where appropriate
4. **Monitor resource usage** and adjust limits

### Maintainability
1. **Document all configuration options**
2. **Use sensible defaults** for development
3. **Group related configuration** logically
4. **Validate configuration** at application startup

## Monitoring & Health Checks

### Backend API
- Health check endpoint: `/health`
- Database connection status
- Memory and CPU usage metrics
- API response time monitoring

### Frontend Web
- Network error handling
- Token refresh monitoring
- Performance metrics collection
- User session tracking

### POS Application
- Local database integrity checks
- Sync status monitoring
- Offline/online state detection
- Transaction queue management

## Troubleshooting

### Common Issues

1. **Database Connection Failures**
   - Check PostgreSQL server status
   - Verify connection string format
   - Ensure database exists and user has permissions

2. **JWT Token Issues**
   - Verify JWT_SECRET is set consistently
   - Check token expiration times
   - Ensure proper token storage and retrieval

3. **CORS Errors**
   - Configure FRONTEND_URL correctly
   - Check allowed origins settings
   - Verify preflight requests

4. **POS Sync Issues**
   - Check API server accessibility
   - Verify network connectivity
   - Monitor sync logs for errors

### Debug Mode
Enable debug logging by setting:
- `DEBUG=true` in API
- `NEXT_PUBLIC_API_DEBUG=true` in Web
- `VITE_API_DEBUG=true` in POS

## Conclusion

The BMS environment configuration provides a robust, secure, and scalable foundation for the entire Business Management Suite. The configuration supports:

- **Multi-environment deployment** (development, staging, production)
- **Offline-capable POS operations** with automatic synchronization
- **Secure authentication** and authorization
- **Flexible business rules** and customization
- **Comprehensive logging** and monitoring
- **Performance optimization** for production workloads

All environment files include sensible defaults and extensive documentation to facilitate development and deployment processes.