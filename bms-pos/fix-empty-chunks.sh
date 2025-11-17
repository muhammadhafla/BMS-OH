#!/bin/bash

# BMS POS Empty Chunks Fix Script
# This script applies the optimized Vite configuration to fix empty vendor chunks

echo "🔧 BMS POS Empty Chunks Fix Script"
echo "================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || ! grep -q "bms-pos" package.json; then
    echo "❌ Error: Please run this script from the bms-pos directory"
    exit 1
fi

echo "📋 Current directory: $(pwd)"
echo "📦 Project: $(grep '\"name\"' package.json | cut -d'\"' -f4)"

# Create backups
echo ""
echo "💾 Creating backups of existing configurations..."
if [ -f "vite.config.ts" ]; then
    cp vite.config.ts vite.config.backup.$(date +%Y%m%d_%H%M%S).ts
    echo "✅ Backed up vite.config.ts"
fi

if [ -f "vite.electron.config.ts" ]; then
    cp vite.electron.config.ts vite.electron.config.backup.$(date +%Y%m%d_%H%M%S).ts
    echo "✅ Backed up vite.electron.config.ts"
fi

# Apply optimized configurations
echo ""
echo "🚀 Applying optimized configurations..."
if [ -f "vite.config.optimized.ts" ]; then
    cp vite.config.optimized.ts vite.config.ts
    echo "✅ Applied optimized vite.config.ts"
else
    echo "⚠️  Warning: vite.config.optimized.ts not found"
fi

if [ -f "vite.electron.config.optimized.ts" ]; then
    cp vite.electron.config.optimized.ts vite.electron.config.ts
    echo "✅ Applied optimized vite.electron.config.ts"
else
    echo "⚠️  Warning: vite.electron.config.optimized.ts not found"
fi

# Clean build cache
echo ""
echo "🧹 Cleaning build cache..."
if [ -d "dist" ]; then
    rm -rf dist
    echo "✅ Removed dist directory"
fi

if [ -d "build" ]; then
    rm -rf build
    echo "✅ Removed build directory"
fi

if [ -d "node_modules/.vite" ]; then
    rm -rf node_modules/.vite
    echo "✅ Removed Vite cache"
fi

# Test the build
echo ""
echo "🔍 Testing build with optimized configuration..."
if npm run build:light; then
    echo ""
    echo "✅ SUCCESS! Build completed without empty chunks"
    echo ""
    echo "📊 Checking build output..."
    if [ -d "dist/js" ]; then
        echo "📁 Electron build output:"
        ls -lah dist/js/ 2>/dev/null || echo "   No JS files found in dist/js/"
    fi
    
    if [ -d "build/js" ]; then
        echo "📁 Web build output:"
        ls -lah build/js/ 2>/dev/null || echo "   No JS files found in build/js/"
    fi
else
    echo ""
    echo "❌ Build failed. Please check the errors above."
    echo "💡 You can restore your backups if needed:"
    echo "   cp vite.config.backup.*.ts vite.config.ts"
    echo "   cp vite.electron.config.backup.*.ts vite.electron.config.ts"
    exit 1
fi

echo ""
echo "🎉 Empty chunks fix applied successfully!"
echo ""
echo "📖 For more details, see:"
echo "   - empty-chunks-analysis.md (root cause analysis)"
echo "   - empty-chunks-solution.md (detailed solution guide)"
echo ""
echo "🔍 To verify the fix:"
echo "   1. Check that no 'Generated an empty chunk' messages appear"
echo "   2. Verify bundle sizes in dist/js/ or build/js/"
echo "   3. Test that all functionality still works correctly"
echo ""
echo "💡 For long-term maintenance, consider removing unused dependencies:"
echo "   npm uninstall zustand swr react-hook-form @hookform/resolvers better-sqlite3 sqlite3"