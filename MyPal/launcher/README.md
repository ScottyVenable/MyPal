# MyPal Desktop Launcher

This Electron-based launcher starts the MyPal backend and opens the existing SPA frontend in a dedicated desktop window.

## Prerequisites
- Node.js 18+
- npm 9+
- Windows 10/11 (packaged `.exe` target)

## Development run
> **Note:** `<pal-root>` refers to the `MyPal` folder inside the repository (for example `C:\path\to\repo\MyPal\MyPal`).

### Quick start (AutoRun script)
From the repository root you can launch everything in one step:

```powershell
cd <pal-root>
.\autorun.ps1
```

The script installs missing dependencies (unless `-SkipInstall` is passed) and then runs the launcher in development mode. For local debugging it also mirrors backend data and logs into:

- Data: `<pal-root>\dev-data`
- Logs: `<pal-root>\dev-logs` (contains `console.log`, `error.log`, `access.log`, `telemetry.log`)
- Telemetry log is forced in dev via `MYPAL_FORCE_TELEMETRY=1` so frontend errors reported through `/telemetry` also land in `dev-logs\telemetry.log`.

Disable the mirroring by unsetting `MYPAL_DATA_DIR`, `MYPAL_LOGS_DIR`, `MYPAL_MODELS_DIR`, and `MYPAL_FORCE_TELEMETRY` before launching if you prefer the default Electron user data directory.

### Manual run

```powershell
# First, install backend dependencies
cd <pal-root>\app\backend
npm install

# Then run the launcher
cd <pal-root>\launcher
npm install
npm run dev
```
This boots the backend (using the dependencies you installed in `app/backend`) and opens the window pointing at `app/frontend/index.html`.

## Building the Windows installer
```powershell
# Ensure backend dependencies are installed
cd <pal-root>\app\backend
npm install

# Build the installer
cd <pal-root>\launcher
npm install
npm run dist
```
The installer (`MyPal-Launcher-Setup-<version>.exe`) will appear under `launcher/dist/`.

During packaging the `app/` directory is copied into the Electron bundle. Backend data, logs, and models are stored in the user data directory (e.g., `%APPDATA%/MyPal`).

## Clean up backend when closing
The launcher automatically shuts down the backend process when the window closes or the app exits. If the backend crashes unexpectedly, the launcher displays an error dialog and quits.
