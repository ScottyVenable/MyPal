# MyPal Debug Configuration Guide

## Overview

The MyPal debug configuration has been optimized to ensure proper startup sequencing between the backend server and Tauri desktop application. This guide explains the available launch configurations and tasks.

## Quick Start

### Recommended: Use the Task-Based Launch

Press `F5` or select **"Launch MyPal (Backend + Tauri)"** from the debug dropdown. This will:

1. ✅ Start the backend server on `localhost:3001`
2. ✅ Wait for the backend to be ready
3. ✅ Launch the Tauri desktop application
4. ✅ Open both in separate terminal panels

### Alternative: Full Stack Debug Compound

Select **"Full Stack Debug"** from the debug dropdown to launch both configurations separately:
- Backend in one debug session
- Tauri in another debug session

This gives you more control but requires manual coordination.

## Available Launch Configurations

### 1. Launch MyPal (Backend + Tauri) ⭐ **RECOMMENDED**

**What it does:**
- Uses the `Start Tauri Dev` task with proper dependency chain
- Backend starts first as a background task
- Waits for backend to print "MyPal backend listening on"
- Then launches Tauri dev server
- Both run in dedicated terminal panels

**When to use:**
- Daily development workflow
- When you need both backend and frontend running
- When you want automatic startup sequencing

**How to use:**
```
1. Press F5 (or select from debug dropdown)
2. Wait for backend to start (watch "Backend" terminal panel)
3. Tauri window will open automatically
4. Both processes run until you stop debugging
```

### 2. Launch MyPal Backend Only

**What it does:**
- Starts only the Node.js backend server
- Runs on `http://localhost:3001`
- Sets up dev environment variables
- Useful for API testing and backend development

**When to use:**
- Testing backend endpoints with Thunder Client/Postman
- Backend-only development
- When you want to run frontend separately in browser

**Environment variables:**
- `PORT=3001`
- `MYPAL_DATA_DIR=dev-data/`
- `MYPAL_LOGS_DIR=dev-logs/`
- `NODE_ENV=development`

### 3. Launch MyPal Tauri (Dev)

**What it does:**
- Starts only the Tauri desktop application
- Assumes backend is already running
- Opens the Tauri dev window

**When to use:**
- Backend is already running (manually or via another terminal)
- Frontend-only development
- Rust debugging of Tauri native code

**Prerequisites:**
- Backend must be running on `localhost:3001`

### 4. Attach to MyPal Backend

**What it does:**
- Attaches Node.js debugger to running backend process
- Requires backend started with `--inspect` flag

**When to use:**
- Backend is already running externally
- You need to debug a live process
- Advanced debugging scenarios

**How to use:**
```bash
# Start backend with debugging enabled
cd app/backend
node --inspect src/server.js

# Then use "Attach to MyPal Backend" launch config
```

### 5. Full Stack Debug (Compound)

**What it does:**
- Launches "Launch MyPal Backend Only" and "Launch MyPal Tauri (Dev)" simultaneously
- Both run as separate debug sessions
- `stopAll: true` means stopping one stops both

**When to use:**
- When you need separate debugging for backend and frontend
- Advanced debugging scenarios
- When task-based launch doesn't work for your workflow

**Note:** This does NOT guarantee backend starts before Tauri. Use "Launch MyPal (Backend + Tauri)" for proper sequencing.

## Available Tasks

Tasks are accessible via `Ctrl+Shift+P` → "Tasks: Run Task"

### Start MyPal Backend

**Background task** that:
- Starts backend on `localhost:3001`
- Runs in dedicated terminal panel (group: "backend")
- Problem matcher detects when server is ready
- Sets dev environment variables

**End pattern:** Waits for "MyPal backend listening on" before considering task complete

### Start Tauri Dev

**Background task** that:
- **Depends on:** "Start MyPal Backend" (runs automatically)
- Starts Tauri dev server
- Runs in dedicated terminal panel (group: "tauri")
- Opens Tauri window when ready

**End pattern:** Waits for "Finished" or "compiled successfully"

### Legacy .NET Tasks

These tasks are for the **retired Avalonia desktop app** and are kept for reference only:
- `build` - Builds Avalonia .csproj (obsolete)
- `publish` - Publishes Avalonia app (obsolete)
- `watch` - Watches Avalonia project (obsolete)
- `clean` - Cleans Avalonia build (obsolete)

**Do not use these for Tauri development.**

## Configuration Files

### `.vscode/launch.json`

Defines debug configurations and compounds. Key settings:

```jsonc
{
  "configurations": [
    {
      "name": "Launch MyPal (Backend + Tauri)",
      "preLaunchTask": "Start Tauri Dev",  // Triggers task chain
      // ...
    }
  ]
}
```

### `.vscode/tasks.json`

Defines tasks with proper dependency chaining:

```jsonc
{
  "tasks": [
    {
      "label": "Start MyPal Backend",
      "isBackground": true,
      "problemMatcher": {
        "background": {
          "endsPattern": "MyPal backend listening on"  // Signals ready
        }
      }
    },
    {
      "label": "Start Tauri Dev",
      "dependsOn": ["Start MyPal Backend"],  // Ensures backend starts first
      // ...
    }
  ]
}
```

## Troubleshooting

### Backend doesn't start

**Symptoms:**
- Tauri window shows connection errors
- API requests fail with `ERR_CONNECTION_REFUSED`

**Solutions:**
1. Check the "Backend" terminal panel for errors
2. Ensure port 3001 is not already in use
3. Verify Node.js dependencies: `cd app/backend && npm install`
4. Check backend logs in `dev-logs/`

### Tauri starts before backend is ready

**Symptoms:**
- Initial page load fails
- Errors in console about failed fetches

**Solutions:**
1. Use "Launch MyPal (Backend + Tauri)" instead of "Full Stack Debug"
2. Check problem matcher pattern in tasks.json
3. Increase delay if needed (modify task background pattern)
4. Manually start backend first, then launch Tauri

### Port conflicts

**Error:** `EADDRINUSE: address already in use :::3001`

**Solutions:**
```powershell
# Find process using port 3001
Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess
Get-Process -Id <PID>

# Stop the process
Stop-Process -Id <PID> -Force
```

### Task doesn't detect backend ready

**Symptoms:**
- Task runs indefinitely
- Tauri doesn't start even though backend is running

**Solutions:**
1. Check backend output format matches problem matcher pattern
2. Verify backend prints: "MyPal backend listening on http://localhost:3001"
3. Update `endsPattern` in tasks.json if output format changed
4. Use manual workflow: start backend, then launch Tauri separately

### Environment variables not loading

**Symptoms:**
- App can't find data directories
- Logs go to wrong location
- Port mismatch

**Solutions:**
1. Check `env` settings in launch.json
2. Verify paths are correct for your system
3. Ensure no conflicting environment variables in shell
4. Restart VS Code to reload configuration

## Best Practices

### Daily Development

1. **Start with F5** - Use "Launch MyPal (Backend + Tauri)" for full stack
2. **Watch both terminals** - Backend and Tauri panels show different outputs
3. **Stop debugging cleanly** - Use Stop button or Shift+F5 to stop both processes

### Backend-Only Development

1. Launch "Launch MyPal Backend Only"
2. Test APIs with Thunder Client or Postman
3. Check `dev-logs/` for detailed logging
4. Use `npm test` for unit tests

### Frontend-Only Development

1. Start backend manually: `cd app/backend && npm run dev`
2. Launch "Launch MyPal Tauri (Dev)"
3. Frontend code in `app/frontend/` (vanilla JS)
4. Changes auto-reload via Tauri dev server

### Debugging Backend Issues

1. Add breakpoints in `app/backend/src/`
2. Use "Launch MyPal Backend Only" or "Full Stack Debug"
3. Check terminal output for stack traces
4. Review logs in `dev-logs/YYYY-MM-DD/HH-MM-SS_AM-PM/`

### Debugging Tauri/Rust Issues

1. Set `RUST_BACKTRACE=1` (already in launch configs)
2. Check Tauri terminal panel for Rust errors
3. Review `src-tauri/src/main.rs` for native code
4. Use Tauri devtools (right-click → Inspect)

## Port Configuration

| Service | Default Port | Environment Variable |
|---------|--------------|---------------------|
| Backend | 3001 | `PORT=3001` |
| Tauri Dev | Dynamic | Managed by Tauri |

**Changing backend port:**

1. Update `PORT` in launch.json configurations
2. Update backend code if hardcoded
3. Update frontend API calls if hardcoded
4. Restart both backend and Tauri

## File Locations

| Purpose | Path |
|---------|------|
| Backend source | `app/backend/src/` |
| Frontend source | `app/frontend/` |
| Tauri config | `app/desktop/tauri-app/src-tauri/` |
| Dev data | `dev-data/` |
| Dev logs | `dev-logs/YYYY-MM-DD/HH-MM-SS_AM-PM/` |
| Launch config | `.vscode/launch.json` |
| Tasks config | `.vscode/tasks.json` |

## Additional Resources

- [Tauri Development Guide](./TAURI_SETUP.md)
- [Backend API Documentation](../api/)
- [Frontend Architecture](../design/FRONTEND_ARCHITECTURE.md)
- [Testing Guide](../../TESTING.md)

## Changelog

### 2025-10-28
- **Fixed:** Backend port mismatch (was 31337, now 3001)
- **Added:** Task-based launch configuration with proper sequencing
- **Added:** "Launch MyPal (Backend + Tauri)" as recommended workflow
- **Improved:** Background task problem matchers for better timing
- **Documented:** All launch configurations and tasks comprehensively

---

**Need help?** Check the [troubleshooting section](#troubleshooting) or review backend terminal output for specific error messages.
