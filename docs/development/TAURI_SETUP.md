# Tauri Desktop Application Setup Guide

This guide covers setting up the development environment for MyPal's Tauri desktop application on Windows.

## Overview

MyPal uses Tauri 2.0 for the desktop shell, which provides:
- Native window with system integration
- Lightweight WebView (uses Edge WebView2 on Windows)
- Small bundle size (~3-5MB vs ~100MB for Electron)
- Rust-powered backend with JavaScript frontend

## Prerequisites

### 1. Node.js and npm
**Required Version**: Node.js 18+ LTS

Already installed if you've run the backend. Verify:
```powershell
node --version  # Should show v18.x.x or higher
npm --version   # Should show 9.x.x or higher
```

If not installed: Download from [nodejs.org](https://nodejs.org/)

### 2. Rust Toolchain
**Required**: Rust 1.70+ with MSVC toolchain

#### Installation Steps:

1. **Install Rust via rustup**:
   - Download and run: https://rustup.rs/
   - Or directly: https://win.rustup.rs/x86_64
   - Accept defaults during installation
   - Restart your terminal/PowerShell after installation

2. **Verify installation**:
   ```powershell
   rustc --version  # Should show rustc 1.7x.x or higher
   cargo --version  # Should show cargo 1.7x.x or higher
   ```

3. **Ensure MSVC toolchain** (usually installed automatically):
   ```powershell
   rustup default stable-msvc
   ```

### 3. Visual Studio Build Tools
**Required**: Microsoft C++ Build Tools

Tauri requires MSVC (Microsoft Visual C++) compiler for Windows builds.

#### Option A: Visual Studio 2022 Community (Recommended)
1. Download: https://visualstudio.microsoft.com/downloads/
2. During installation, select:
   - **Desktop development with C++**
   - Under "Individual components", ensure these are checked:
     - MSVC v143 - VS 2022 C++ x64/x86 build tools
     - Windows 10 SDK (10.0.19041.0 or later)
     - C++ CMake tools for Windows

#### Option B: Standalone Build Tools
1. Download: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
2. Run installer and select:
   - **C++ build tools**
   - **Windows 10 SDK**

**Important**: Restart your terminal after installation to update PATH.

### 4. WebView2 Runtime
**Required**: Microsoft Edge WebView2 Runtime

Usually pre-installed on Windows 10/11. Verify by checking:
- Edge browser is installed (it includes WebView2)
- Or manually download: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

### 5. Tauri CLI
**Installed per-project** via npm (already in package.json)

The project includes `@tauri-apps/cli` in devDependencies, so it's installed automatically when you run `npm install` in the Tauri app directory.

## Project Structure

```
app/
├── backend/              # Node.js/Express backend (port 3001)
├── frontend/             # Vanilla JS SPA (served by Tauri)
└── desktop/
    └── tauri-app/        # Tauri desktop shell
        ├── src-tauri/    # Rust source and config
        │   ├── src/
        │   │   └── main.rs         # Rust entry point
        │   ├── Cargo.toml          # Rust dependencies
        │   ├── tauri.conf.json     # Tauri configuration
        │   └── build.rs            # Build script
        ├── package.json            # npm scripts
        └── node_modules/
```

## Development Workflow

### Initial Setup

1. **Install Rust** (see Prerequisites above)

2. **Install npm dependencies**:
   ```powershell
   cd app\desktop\tauri-app
   npm install
   ```

3. **Verify Tauri CLI**:
   ```powershell
   npm run tauri -- --version
   ```
   Should output: `tauri-cli 2.x.x`

### Running the Application

#### Automated (Recommended):
Use the root `AUTORUN.ps1` script which handles everything:
```powershell
.\AUTORUN.ps1
```

This script:
- Installs dependencies (backend and Tauri)
- Starts backend on port 3001
- Launches Tauri dev mode
- Opens live log console
- Cleans empty log directories

#### Manual (for debugging):

1. **Start backend** (Terminal 1):
   ```powershell
   cd app\backend
   npm run dev
   ```
   Wait for: "MyPal backend listening on http://localhost:3001"

2. **Start Tauri** (Terminal 2):
   ```powershell
   cd app\desktop\tauri-app
   npm run dev
   ```

Tauri will:
- Compile Rust code (first run takes 5-10 minutes)
- Launch WebView window serving `app/frontend/`
- Enable hot-reload for frontend changes
- Connect to backend on localhost:3001

### Building for Production

Create optimized executable:
```powershell
cd app\desktop\tauri-app
npm run build
```

Output locations:
- **Windows**: `src-tauri\target\release\MyPal.exe`
- **Installer**: `src-tauri\target\release\bundle\msi\MyPal_0.3.0_x64_en-US.msi`

## Configuration

### Tauri Configuration (`tauri.conf.json`)

Key settings:

```json
{
  "identifier": "com.mypal.app",           // Unique app ID
  "build": {
    "devUrl": "tauri://localhost",         // Custom protocol for dev
    "frontendDist": "../../../frontend"    // Path to SPA
  },
  "app": {
    "windows": [
      {
        "title": "MyPal",
        "width": 1280,
        "height": 800
      }
    ]
  }
}
```

### Environment Variables

Set in `AUTORUN.ps1` or manually:

```powershell
$env:MYPAL_DATA_DIR = "dev-data"           # Profile data
$env:MYPAL_LOGS_DIR = "dev-logs"           # Application logs  
$env:PORT = "3001"                         # Backend port
```

### Frontend CSP (Content Security Policy)

Located in `app/frontend/index.html`:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self' tauri:; 
               connect-src 'self' http://localhost:3001 ws://localhost:3001 tauri:; 
               ...">
```

**Important**: 
- `tauri:` protocol allows Tauri asset loading
- `http://localhost:3001` allows backend API calls
- `ws://localhost:3001` allows WebSocket connections

## Troubleshooting

### "cargo: command not found"

**Problem**: Rust not installed or not in PATH

**Solutions**:
1. Install Rust: https://rustup.rs/
2. Restart terminal
3. Verify: `cargo --version`
4. If still failing, add to PATH manually:
   ```powershell
   $env:PATH += ";$env:USERPROFILE\.cargo\bin"
   ```

### "linking with `link.exe` failed"

**Problem**: MSVC Build Tools not installed

**Solutions**:
1. Install Visual Studio 2022 Build Tools (see Prerequisites)
2. Ensure "Desktop development with C++" workload is selected
3. Restart terminal
4. Verify: `cargo build` in any Rust project

### "WebView2 not found"

**Problem**: Edge WebView2 runtime missing

**Solutions**:
1. Update Microsoft Edge browser
2. Or install WebView2 Runtime: https://developer.microsoft.com/microsoft-edge/webview2/

### "Backend not reachable" modal in app

**Problem**: Backend not running or wrong port

**Solutions**:
1. Ensure backend is running: `cd app\backend && npm run dev`
2. Check backend logs for errors
3. Verify port 3001 is not in use: `netstat -ano | findstr :3001`
4. Check CORS configuration in `app/backend/src/server.js`

### First Tauri build is slow (10+ minutes)

**This is normal**. First compilation:
- Downloads and compiles all Rust dependencies
- Includes Tauri framework, WebView bindings, system APIs
- Subsequent builds are much faster (10-30 seconds)

**Tips**:
- Use `npm run dev` for development (faster)
- Only run `npm run build` for production builds
- Enable incremental compilation (already enabled in release mode)

### Hot reload not working

**Solutions**:
1. Ensure you're using `npm run dev`, not `npm run build`
2. Check Tauri DevTools console for errors (Right-click → Inspect)
3. Restart Tauri dev server
4. Clear browser cache: DevTools → Application → Clear storage

## Development Tips

### 1. Use DevTools
Right-click in app → Inspect → Opens Chrome/Edge DevTools
- Console for JavaScript logs
- Network tab for API requests
- Application tab for storage

### 2. Rust Compilation
- **Debug builds**: Fast to compile, slower to run (use for dev)
- **Release builds**: Slow to compile, optimized runtime (use for production)

### 3. Backend API Testing
Use curl or Postman independently:
```powershell
curl http://localhost:3001/api/health
curl http://localhost:3001/api/profiles
```

### 4. Log Monitoring
AUTORUN.ps1 opens live log window showing:
- Backend server logs
- API requests/responses
- Error stack traces
- Neural network activity

### 5. File Watching
Tauri watches these for changes:
- `app/frontend/**/*` (HTML, CSS, JS)
- `src-tauri/tauri.conf.json` (config)
- `src-tauri/src/**/*.rs` (Rust source)

Changes trigger:
- Frontend: Instant reload
- Rust: Recompile + restart (5-30 seconds)

## Next Steps

1. **Verify Setup**:
   ```powershell
   # Check all prerequisites
   node --version
   npm --version
   cargo --version
   rustc --version
   ```

2. **Run Application**:
   ```powershell
   .\AUTORUN.ps1
   ```

3. **Test Features**:
   - Create/load profiles
   - Send chat messages
   - View Stats and Brain tabs
   - Check WebSocket neural stream

4. **Read Documentation**:
   - `docs/development/` - Architecture and patterns
   - `app/frontend/README.md` - Frontend structure
   - `app/backend/README.md` - Backend API reference

## Additional Resources

- **Tauri Documentation**: https://tauri.app/v2/
- **Rust Book**: https://doc.rust-lang.org/book/
- **Cargo Guide**: https://doc.rust-lang.org/cargo/
- **WebView2 Docs**: https://docs.microsoft.com/microsoft-edge/webview2/

## Support

For issues:
1. Check this troubleshooting section first
2. Review GitHub issues: https://github.com/ScottyVenable/MyPal/issues
3. Check Tauri Discord: https://discord.gg/tauri
