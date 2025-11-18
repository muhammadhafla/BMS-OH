# BMS POS Electron Development Issue Analysis

## Problem Statement
The `npm run dev` command in bms-pos does not open the Electron development window.

## Root Cause Analysis

### Current Script Configuration
Looking at `bms-pos/package.json`, the current scripts are:

1. **`npm run dev`** (Line 12): 
   ```json
   "dev": "npx vite"
   ```
   - This only starts the Vite development server
   - Serves the frontend on `http://localhost:5173`
   - **Does NOT launch Electron window**

2. **`npm run electron:dev`** (Line 18):
   ```json
   "electron:dev": "concurrently -k -n \"VITE,ELECTRON\" -c \"blue,green\" \"npm run dev\" \"wait-on tcp:5173 && cross-env NODE_ENV=development electron .\""
   ```
   - This correctly starts BOTH Vite dev server AND Electron
   - Waits for Vite to be ready on port 5173
   - Then launches Electron window

## Why Electron Window Doesn't Open with `npm run dev`

The `main.js` file (lines 27-31) shows that Electron is configured to:
- In development: Load `http://localhost:5173`
- In production: Load the built `index.html` file

When you run `npm run dev`:
- Vite server starts on port 5173 ✅
- **BUT Electron process never starts** ❌
- No browser window is created
- You only get the web interface at `http://localhost:5173`

## Solution

### Option 1: Use the Correct Command (Recommended)
```bash
npm run electron:dev
```

This will:
1. Start Vite dev server
2. Wait for Vite to be ready
3. Launch Electron window
4. Load the app in the Electron window

### Option 2: Create an Alias
Update package.json to make `dev` do the electron development:

Change line 12 from:
```json
"dev": "npx vite"
```

To:
```json
"dev": "npm run electron:dev"
```

## Expected Behavior After Fix

When you run `npm run electron:dev`:
1. You'll see two processes starting in the terminal
2. Vite dev server (Blue output)
3. Electron app (Green output)  
4. An Electron window will open with the POS application
5. DevTools will automatically open in the Electron window (line 39-41 in main.js)

## Technical Details

The Electron main process (`main.js`) creates a window that:
- Loads `http://localhost:5173` in development mode
- Has dimensions 1400x900 pixels
- Opens DevTools automatically in development
- Initializes database and printer services

## Dependencies Required

Make sure these packages are installed:
- `electron` - The Electron runtime
- `concurrently` - Runs multiple commands simultaneously  
- `wait-on` - Waits for ports/resources to be available
- `cross-env` - Sets environment variables across platforms

## Verification Steps

1. Run `npm run electron:dev`
2. Check that both Vite and Electron processes start
3. Verify an Electron window opens
4. Confirm the POS interface loads correctly
5. Check browser DevTools open automatically

## Common Issues & Solutions

### Issue: "Cannot find module 'electron'"
**Solution**: Run `npm install` to ensure all dependencies are installed

### Issue: "Port 5173 already in use"
**Solution**: Stop other Vite processes or change the port in vite.config.ts

### Issue: "Electron window doesn't show"
**Solution**: Check that `main.js` exists and is properly configured

## Status
- ✅ Root cause identified
- ✅ Solution provided
- 📋 Ready for user confirmation and implementation