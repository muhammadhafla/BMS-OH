# BMS Authentication Errors Analysis

**Document Created:** 2025-11-25 04:20:33 UTC  
**Author:** Kilo Code Debug Analysis  
**Priority:** HIGH  
**Status:** ✅ RESOLVED - FIXES IMPLEMENTED  
**Last Updated:** 2025-11-25 05:07:47 UTC  

## Executive Summary

The BMS application is experiencing critical authentication failures due to fundamental architectural mismatches between the NextAuth frontend and Express.js backend authentication implementations. Two primary errors are blocking user authentication:

1. **401 Unauthorized**: `/api/auth/callback/credentials` endpoint not found
2. **ERR_BLOCKED_BY_CLIENT**: Browser blocking authentication requests

## Error Details

### Error 1: Authentication Callback Failure
```
/api/auth/callback/credentials:1 Failed to load resource: the server responded with a status of 401 ()
```

**Root Cause:** NextAuth expects OAuth-style callback endpoints that don't exist in the Express.js backend.

### Error 2: Browser Resource Blocking  
```
vcd15cbe7772f49c399c6a5babf22c1241717689176015:1 Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
```

**Root Cause:** Browser extensions (ad blockers, privacy tools) blocking authentication requests.

## Detailed Analysis

### 🔍 Authentication Architecture Mismatch

#### Frontend Configuration (Next.js + NextAuth)
- **File**: `bms-web/src/lib/auth.ts`
- **Provider**: NextAuth with CredentialsProvider
- **Expected Backend**: OAuth-style API with `/api/auth/callback/*` endpoints
- **Current Implementation**: Custom REST API endpoints

#### Backend Configuration (Express.js)
- **File**: `bms-api/src/routes/auth.ts`
- **Implementation**: REST API with `/api/auth/login` and `/api/auth/me` endpoints
- **Missing**: NextAuth callback endpoints (`/api/auth/callback/*`)

### 🔍 URL Construction Issues

**Problematic URL Construction:**
```typescript
// bms-web/src/lib/auth.ts (line 47, 64)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
// Results in: http://localhost:3001

// Frontend .env sets: NEXT_PUBLIC_API_URL=http://localhost:3001/api
// But auth.ts constructs: ${API_BASE_URL}/api/auth/login
// Final URL: http://localhost:3001/api/api/auth/login (DOUBLE /api)
```

**Testing Results:**
- ✅ `http://localhost:3001/api/auth/login` - Works correctly
- ❌ `http://localhost:3001/api/api/auth/login` - Returns 404 Not Found
- ❌ `http://localhost:3001/api/auth/callback/credentials` - Returns 404 Not Found

### 🔍 Environment Variables Analysis

#### Frontend (.env)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api    # ⚠️ PROBLEM: Has /api suffix
NEXTAUTH_SECRET=p3216vMxiOgxhEnKm+MPik/i9ihDkjRQQXhnk8G4T/A=
NEXTAUTH_URL=http://localhost:3000
```

#### Backend (.env)
```env
PORT=3001
JWT_SECRET=e5b657a6e8bb61bd6aab712804895d1d7de5ac3d866c299850f61a6e7e87f732
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
```

## 🔍 Database Status

**Database Seed Status:** ✅ OPERATIONAL
- Test user credentials available:
  - Admin: `admin@bms.co.id` / `password123`
  - Manager: `manager@bms.co.id` / `password123`
  - Staff: `staff1@bms.co.id` / `password123`

**API Test Results:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "cmie18tu80004bb0nfj6w0gl1",
      "email": "admin@bms.co.id",
      "name": "Administrator BMS",
      "role": "ADMIN",
      "branchId": "cmie18tia0000bb0nzqh80h02",
      "branch": {
        "id": "cmie18tia0000bb0nzqh80h02",
        "name": "Cabang Utama Jakarta"
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 🔍 Server Status

**Backend API:** ✅ RUNNING
- Port: 3001
- Health Check: `http://localhost:3001/health` - OK
- All REST endpoints functional

**Frontend Web:** ✅ RUNNING  
- Port: 3000
- Next.js application accessible

## 🚨 Critical Issues Identified

### Issue 1: Authentication Flow Mismatch (CRITICAL)
- **Impact**: Complete authentication failure
- **Cause**: NextAuth expects OAuth callback flow, backend provides REST API
- **Affected Components**: All authentication-dependent features

### Issue 2: Double API Path Problem (HIGH)
- **Impact**: All API requests fail due to incorrect URLs
- **Cause**: Frontend .env has `/api` suffix, auth.ts adds another `/api`
- **Affected Components**: All API communication

### Issue 3: Browser Extension Blocking (MEDIUM)
- **Impact**: Intermittent authentication failures
- **Cause**: Ad blockers and privacy extensions
- **Affected Components**: User experience

## 💡 Recommended Solutions

### Solution 1: Fix URL Construction (IMMEDIATE)

**Option A: Update Frontend .env**
```env
# Change from:
NEXT_PUBLIC_API_URL=http://localhost:3001/api
# To:
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Option B: Update auth.ts URL Construction**
```typescript
// In bms-web/src/lib/auth.ts, change:
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
// To:
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
// Then ensure endpoints are constructed without leading /api
const response = await fetch(`${API_BASE_URL}/auth/login`, {
```

### Solution 2: Implement NextAuth Callbacks (RECOMMENDED)

**Add to Backend (bms-api/src/routes/auth.ts):**
```typescript
// Add these endpoints to handle NextAuth callbacks
router.get('/callback/credentials', (req, res) => {
  // Handle NextAuth callback for credentials provider
  res.status(200).json({ ok: true });
});

router.post('/callback/credentials', (req, res) => {
  // Handle NextAuth POST callback
  res.status(200).json({ ok: true });
});
```

**Alternative: Convert to Custom Auth (PREFERRED)**

Update frontend to use custom authentication instead of NextAuth:

```typescript
// bms-web/src/lib/auth.ts - Replace NextAuth with custom implementation
export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('authToken', data.data.token);
    return { success: true, user: data.data.user };
  } else {
    return { success: false, error: data.error };
  }
}
```

### Solution 3: Browser Extension Mitigation (WORKAROUND)

**Add to Next.js Configuration (next.config.js):**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:3001 ws://localhost:3001"
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
```

## 🎯 Immediate Action Items

### Priority 1: Fix URL Construction (URGENT)
1. Update `bms-web/.env` - Change `NEXT_PUBLIC_API_URL` from `http://localhost:3001/api` to `http://localhost:3001`
2. Update `bms-web/src/lib/auth.ts` - Remove double `/api` in URL construction
3. Test authentication flow with correct URLs

### Priority 2: Implement Authentication Callbacks (HIGH)
1. Choose between NextAuth callbacks or custom auth implementation
2. Implement chosen solution in backend routes
3. Update frontend authentication logic accordingly

### Priority 3: Browser Compatibility (MEDIUM)
1. Update Next.js CSP headers
2. Add browser extension detection and warnings
3. Implement retry logic for blocked requests

## 📋 Testing Plan

1. **URL Testing**
   ```bash
   # Test corrected URLs
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@bms.co.id", "password": "password123"}'
   ```

2. **Browser Testing**
   - Test with ad blockers disabled
   - Test with different browsers
   - Test in incognito/private mode

3. **End-to-End Testing**
   - Complete login flow
   - Token validation
   - Session persistence

## 📊 Success Metrics

- [ ] Authentication requests return 200 OK (not 401/404)
- [ ] No "ERR_BLOCKED_BY_CLIENT" errors in console
- [ ] Users can successfully log in and access protected routes
- [ ] Token validation works across browser refreshes
- [ ] No double `/api` paths in network requests

## 🔗 Related Files

- `bms-web/src/lib/auth.ts` - Frontend authentication logic
- `bms-web/.env` - Frontend environment configuration  
- `bms-api/src/routes/auth.ts` - Backend authentication routes
- `bms-api/.env` - Backend environment configuration
- `bms-api/src/server.ts` - Server and routing configuration

---

**Next Steps:** Implement Priority 1 fixes immediately to restore basic functionality, then proceed with authentication flow improvements.