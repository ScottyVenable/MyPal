# MyPal Desktop Shell

The Avalonia and Electron shells have been retired in favor of a unified Tauri 2.0 desktop application.

## Folders

- `tauri-app/` — Active Tauri project that wraps the existing backend (`app/backend`) and SPA (`app/frontend`).
- `DEPRECATED_NOTICE.md` — Historical record for the Avalonia migration effort.

## Development

```powershell
cd ..\..\..\app\backend
npm install
npm run dev

# In another terminal
cd ..\..\..\app\desktop\tauri-app
npm install
npm run dev
```

Or simply run `./AUTORUN.ps1` from the repository root to manage both processes automatically.

## Building Installers

```powershell
cd app\desktop\tauri-app
npm run build
```

Tauri places platform-specific bundles under `app/desktop/tauri-app/src-tauri/target/`.
