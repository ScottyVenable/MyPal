# MyPal Desktop Launcher

This Electron-based launcher starts the MyPal backend and opens the existing SPA frontend in a dedicated desktop window.

## Prerequisites
- Node.js 18+
- npm 9+
- Windows 10/11 (packaged `.exe` target)

## Development run
```powershell
cd "g:\My Drive\Technology\AI Projects\MyPal"
cd app/backend
npm install

cd ../../dev/src/bin/launcher
npm install
npm run dev
```
This boots the backend (using the dependencies you installed in `app/backend`) and opens the window pointing at `app/frontend/index.html`.

## Building the Windows installer
```powershell
cd "g:\My Drive\Technology\AI Projects\MyPal"
cd app/backend
npm install

cd ../../dev/src/bin/launcher
npm install
npm run dist
```
The installer (`MyPal-Launcher-Setup-<version>.exe`) will appear under `dist/`.

During packaging the `app/` directory is copied into the Electron bundle. Backend data, logs, and models are stored in the user data directory (e.g., `%APPDATA%/MyPal`).

## Clean up backend when closing
The launcher automatically shuts down the backend process when the window closes or the app exits. If the backend crashes unexpectedly, the launcher displays an error dialog and quits.
