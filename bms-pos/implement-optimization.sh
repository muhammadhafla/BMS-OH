#!/bin/bash

# BMS POS - Dependency Optimization Implementation Script
# Generated: November 17, 2025
# Purpose: Remove conflicting and unused dependencies to reduce ~23MB bundle size

echo "🚀 Starting BMS POS Dependency Optimization..."

# Step 1: Backup current package.json
echo "📦 Creating backup of current package.json..."
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup
echo "✅ Backup created: package.json.backup & package-lock.json.backup"

# Step 2: Remove conflicting and unused dependencies
echo "🗑️  Removing conflicting and unused dependencies..."
npm uninstall sqlite3 electron-store electron-serve swr @hookform/resolvers

if [ $? -eq 0 ]; then
    echo "✅ Dependencies removed successfully"
else
    echo "❌ Failed to remove dependencies. Restoring backup..."
    cp package.json.backup package.json
    cp package-lock.json.backup package-lock.json
    npm install
    exit 1
fi

# Step 3: Install with clean lock file
echo "🔄 Installing updated dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Installation failed. Restoring backup..."
    cp package.json.backup package.json
    cp package-lock.json.backup package-lock.json
    npm install
    exit 1
fi

# Step 4: Verify build process
echo "🔍 Testing build process..."
npm run types

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed. Check for removed dependencies usage."
    echo "💡 Restore with: ./rollback-optimization.sh"
    exit 1
fi

# Step 5: Optional - Clean development cache
echo "🧹 Cleaning development cache..."
npm run clean:node
npm install

echo ""
echo "🎉 OPTIMIZATION COMPLETE!"
echo "📊 Expected results:"
echo "   • ~23MB bundle size reduction"
echo "   • Removed conflicting sqlite3/better-sqlite3"
echo "   • Removed unused dependencies"
echo "   • Improved security posture"
echo ""
echo "⚠️  IMPORTANT: Test the application thoroughly before deploying to production"
echo "🔄 To rollback if needed: ./rollback-optimization.sh"