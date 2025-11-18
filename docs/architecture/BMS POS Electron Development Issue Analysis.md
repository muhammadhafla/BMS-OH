# BMS POS Electron Development Issue Analysis

## Problem Statement
The `npm run dev` command in bms-pos does not open the Electron development window.

## Root Cause Analysis

### Primary Issue: Wrong Command
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

### Secondary Issue: Missing System Dependencies
When testing the correct command, we discovered Electron fails to start with this error:
```
/home/user1/BMS/bms-pos/node_modules/electron/dist/electron: error while loading shared libraries: libglib-2.0.so.0: cannot open shared object file: No such file or directory
```

## Why Electron Window Doesn't Open with `npm run dev`

The `main.js` file (lines 27-31) shows that Electron is configured to:
- In development: Load `http://localhost:5173`
- In production: Load the built `index.html` file

When you run `npm run dev`:
- Vite server starts on port 5173 ✅
- **BUT Electron process never starts** ❌
- No browser window is created
- You only get the web interface at `http://localhost:5173`

## Complete Solution

### Step 1: Install System Dependencies
Install the required libraries for Electron to run:

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y \
  libglib2.0-0 \
  libnss3 \
  libx11-xcb1 \
  libxcb-dri3-0 \
  libdrm2 \
  libgtk-3-0 \
  libgbm1 \
  libasound2 \
  libatspi2.0-0 \
  libxshmfence1
```

**CentOS/RHEL:**
```bash
sudo yum install -y \
  glibc \
  nss \
  libX11 \
  libXcomposite \
  libXcursor \
  libXdamage \
  libXext \
  libXi \
  libXrandr \
  libXScrnSaver \
  libXrender \
  libXtst \
  cups-libs \
  libXScrnSaver-devel \
  libXcomposite-devel \
  libXcursor-devel \
  libXdamage-devel \
  libXext-devel \
  libXi-devel \
  libXrandr-devel \
  libXrender-devel \
  libXtst-devel \
  libX11 \
  libXcomposite \
  libXcursor \
  libXdamage \
  libXext \
  libXi \
  libXrandr \
  libXScrnSaver \
  libXrender \
  libXtst \
  libX11-xcb \
  libxcb-dri3-0 \
  libdrm2 \
  libgbm1
```

**Fedora:**
```bash
sudo dnf install -y \
  glibc \
  nss \
  libX11 \
  libXcomposite \
  libXcursor \
  libXdamage \
  libXext \
  libXi \
  libXrandr \
  libXScrnSaver \
  libXrender \
  libXtst \
  cups-libs \
  libX11-xcb \
  libxcb-dri3-0 \
  libdrm2 \
  libgbm1 \
  gtk3 \
  alsa-lib
```

### Step 2: Use the Correct Command
After installing dependencies, run:
```bash
npm run electron:dev
```

This will:
1. Start Vite dev server
2. Wait for Vite to be ready
3. Launch Electron window
4. Load the app in the Electron window

## Alternative Solutions

### Option A: Development in Web Browser (Quick Fix)
If you can't install system dependencies, you can develop in a regular web browser:
```bash
npm run dev
```
Then open `http://localhost:5173` in your browser.

### Option B: Create an Alias
Update package.json to make `dev` do the electron development:

Change line 12 from:
```json
"dev": "npx vite"
```

To:
```json
"dev": "npm run electron:dev"
```

### Option C: Use npm Scripts Directly
```bash
# Start Vite dev server only
npx vite

# In another terminal, start Electron
npx electron .
```

### Option D: Install Missing Libraries Individually
If you can't install the full package, install just the minimum required:
```bash
# Ubuntu/Debian
sudo apt install -y libglib2.0-0 libnss3 libx11-xcb1 libxcb-dri3-0 libdrm2 libgbm1
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

1. Install system dependencies
2. Run `npm run electron:dev`
3. Check that both Vite and Electron processes start
4. Verify an Electron window opens
5. Confirm the POS interface loads correctly
6. Check browser DevTools open automatically

## Quick Status Check

To check if Electron can start:
```bash
npx electron --version
```

If you see a version number, Electron is working. If you see library errors, install dependencies.

## Status
- ✅ Primary issue identified: Wrong command used
- ✅ Secondary issue discovered: Missing system libraries
- ✅ Solutions provided for both issues
- 📋 Ready for user confirmation and implementation