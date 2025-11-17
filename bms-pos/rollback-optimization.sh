#!/bin/bash

# BMS POS - Dependency Optimization Rollback Script
# Generated: November 17, 2025
# Purpose: Restore original dependencies if optimization causes issues

echo "🔄 Starting BMS POS Dependency Rollback..."

# Check if backup exists
if [ ! -f "package.json.backup" ] || [ ! -f "package-lock.json.backup" ]; then
    echo "❌ Backup files not found!"
    echo "📝 Please ensure package.json.backup and package-lock.json.backup exist"
    exit 1
fi

echo "📦 Found backup files, proceeding with rollback..."

# Step 1: Remove current node_modules and lock file
echo "🗑️  Cleaning current dependencies..."
rm -rf node_modules
rm -f package-lock.json

# Step 2: Restore original files
echo "📥 Restoring original package.json and package-lock.json..."
cp package.json.backup package.json
cp package-lock.json.backup package-lock.json

# Step 3: Install original dependencies
echo "🔄 Installing original dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies restored successfully"
else
    echo "❌ Failed to restore dependencies"
    echo "💡 Manual intervention may be required"
    exit 1
fi

# Step 4: Verify installation
echo "🔍 Verifying installation..."
npm run types

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    echo "💡 Some dependencies may have version conflicts"
    exit 1
fi

# Step 5: Clean cache and reinstall
echo "🧹 Performing clean installation..."
npm run clean:node
npm install

echo ""
echo "✅ ROLLBACK COMPLETE!"
echo "📊 Restored dependencies:"
echo "   • sqlite3 (conflicting package)"
echo "   • electron-store"
echo "   • electron-serve"
echo "   • swr"
echo "   • @hookform/resolvers"
echo ""
echo "🔍 The application should now work as before optimization"
echo "💡 Review the dependency-optimization-report.md for analysis details"