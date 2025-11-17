@echo off
REM BMS POS - Dependency Optimization Rollback Script
REM Generated: November 17, 2025
REM Purpose: Restore original dependencies if optimization causes issues

echo 🔄 Starting BMS POS Dependency Rollback...

REM Check if backup exists
if not exist "package.json.backup" (
    echo ❌ Backup file package.json.backup not found!
    echo 📝 Please ensure package.json.backup exists
    exit /b 1
)

if not exist "package-lock.json.backup" (
    echo ❌ Backup file package-lock.json.backup not found!
    echo 📝 Please ensure package-lock.json.backup exists
    exit /b 1
)

echo 📦 Found backup files, proceeding with rollback...

REM Step 1: Remove current node_modules and lock file
echo 🗑️  Cleaning current dependencies...
if exist node_modules rmdir /s /q node_modules
del /f package-lock.json

REM Step 2: Restore original files
echo 📥 Restoring original package.json and package-lock.json...
copy package.json.backup package.json
copy package-lock.json.backup package-lock.json

REM Step 3: Install original dependencies
echo 🔄 Installing original dependencies...
call npm install

if errorlevel 1 (
    echo ❌ Failed to restore dependencies
    echo 💡 Manual intervention may be required
    exit /b 1
)

echo ✅ Dependencies restored successfully

REM Step 4: Verify installation
echo 🔍 Verifying installation...
call npm run types

if errorlevel 1 (
    echo ❌ TypeScript compilation failed
    echo 💡 Some dependencies may have version conflicts
    exit /b 1
)

echo ✅ TypeScript compilation successful

REM Step 5: Clean cache and reinstall
echo 🧹 Performing clean installation...
call npm run clean:node
call npm install

echo.
echo ✅ ROLLBACK COMPLETE!
echo 📊 Restored dependencies:
echo    • sqlite3 (conflicting package)
echo    • electron-store
echo    • electron-serve
echo    • swr
echo    • @hookform/resolvers
echo.
echo 🔍 The application should now work as before optimization
echo 💡 Review the dependency-optimization-report.md for analysis details

pause