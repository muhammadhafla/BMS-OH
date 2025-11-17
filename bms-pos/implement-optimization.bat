@echo off
REM BMS POS - Dependency Optimization Implementation Script
REM Generated: November 17, 2025
REM Purpose: Remove conflicting and unused dependencies to reduce ~23MB bundle size

echo 🚀 Starting BMS POS Dependency Optimization...

REM Step 1: Backup current package.json
echo 📦 Creating backup of current package.json...
copy package.json package.json.backup
copy package-lock.json package-lock.json.backup
echo ✅ Backup created: package.json.backup ^& package-lock.json.backup

REM Step 2: Remove conflicting and unused dependencies
echo 🗑️  Removing conflicting and unused dependencies...
call npm uninstall sqlite3 electron-store electron-serve swr @hookform/resolvers

if errorlevel 1 (
    echo ❌ Failed to remove dependencies. Restoring backup...
    copy package.json.backup package.json
    copy package-lock.json.backup package-lock.json
    call npm install
    exit /b 1
)

echo ✅ Dependencies removed successfully

REM Step 3: Install with clean lock file
echo 🔄 Installing updated dependencies...
call npm install

if errorlevel 1 (
    echo ❌ Installation failed. Restoring backup...
    copy package.json.backup package.json
    copy package-lock.json.backup package-lock.json
    call npm install
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Step 4: Verify build process
echo 🔍 Testing build process...
call npm run types

if errorlevel 1 (
    echo ❌ TypeScript compilation failed. Check for removed dependencies usage.
    echo 💡 Restore with: rollback-optimization.bat
    exit /b 1
)

echo ✅ TypeScript compilation successful

REM Step 5: Optional - Clean development cache
echo 🧹 Cleaning development cache...
call npm run clean:node
call npm install

echo.
echo 🎉 OPTIMIZATION COMPLETE!
echo 📊 Expected results:
echo    • ~23MB bundle size reduction
echo    • Removed conflicting sqlite3/better-sqlite3
echo    • Removed unused dependencies
echo    • Improved security posture
echo.
echo ⚠️  IMPORTANT: Test the application thoroughly before deploying to production
echo 🔄 To rollback if needed: rollback-optimization.bat

pause