# VS Code Debug Configuration

## Quick Start Guide

### 🚀 Recommended: Press F5

This will launch **"Launch MyPal (Backend + Tauri)"** which:
1. Starts backend server on `localhost:3001`
2. Waits for backend to be ready
3. Launches Tauri desktop app automatically

### Available Configurations

| Configuration | Purpose | Use When |
|--------------|---------|----------|
| **Launch MyPal (Backend + Tauri)** ⭐ | Full stack development | Daily workflow, both services needed |
| Launch MyPal Backend Only | Backend API development | Testing endpoints, backend-only work |
| Launch MyPal Tauri (Dev) | Frontend development | Backend already running separately |
| Attach to MyPal Backend | Attach debugger to running process | Advanced debugging scenarios |
| Full Stack Debug (Compound) | Launch both separately | Need separate debug sessions |

## Terminal Panels

When using the recommended configuration, watch these terminals:

- **Backend** panel: Node.js server logs, API requests
- **Tauri** panel: Rust compilation, window lifecycle

## Troubleshooting

### Connection Errors (ERR_CONNECTION_REFUSED)

**Cause:** Backend not running or not ready

**Fix:**
1. Check "Backend" terminal panel for startup errors
2. Verify backend prints: "MyPal backend listening on http://localhost:3001"
3. Wait 5-10 seconds for backend to initialize
4. Try manual start: `cd app/backend && npm run dev`

### Port Already In Use

**Error:** `EADDRINUSE: address already in use :::3001`

**Fix:**
```powershell
# Find and kill process on port 3001
Get-NetTCPConnection -LocalPort 3001 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Tauri Won't Start

**Common causes:**
- Rust toolchain not installed
- Missing Tauri dependencies
- Backend not responding

**Fix:**
1. Run: `.\AUTORUN.ps1 -CheckRequirementsOnly` to verify prerequisites
2. Check Tauri prerequisites: `docs/development/TAURI_SETUP.md`
3. Ensure backend is healthy: `curl http://localhost:3001/api/health`

## Files Reference

- `launch.json` - Debug configurations
- `tasks.json` - Background tasks with dependency chaining
- `../docs/development/DEBUG_CONFIGURATION.md` - Comprehensive guide

## Need More Help?

See [DEBUG_CONFIGURATION.md](../docs/development/DEBUG_CONFIGURATION.md) for detailed documentation.
