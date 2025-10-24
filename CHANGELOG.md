# Changelog

All notable changes to this project are documented here. This log is maintained per MyPal app version.

## 0.3.0-alpha — 2025-10-24

- Desktop: Replaced the Avalonia and Electron implementations with a lightweight Tauri 2.0 shell located at `app/desktop/tauri-app`.
- Scripts: Updated `AUTORUN.ps1` to bootstrap the backend and Tauri shell, removing legacy launcher logic.
- Docs: Refreshed root documentation (`README.md`, `PROJECT_STRUCTURE.md`, desktop notes) to reflect the new desktop workflow.

## 0.1.1 — 2025-10-20

- Build: Fix Electron builder `extraResources.from` path so the `app/` directory is correctly packaged. Prevents runtime ERR_MODULE_NOT_FOUND for `express` in packaged builds.
- Frontend: Normalize UI glyphs to avoid garbled characters on Windows. Replaced unknown separators in timestamps and brain summary with `|`, ensured missing-text placeholder is `?`, and set a reliable star icon for reinforce button.
- Frontend: Minor UX polish for placeholders and labels (title, chat input, API key, footer).
- Backend: Verified graceful shutdown and logging; retained structured console/error log output to `%APPDATA%/MyPal/logs/` in addition to dev mirrors.
- Dev: Added troubleshooting notes to `launcher/README.md` for common setup issues (module not found, port conflicts, cloud‑sync install errors).
- Tests: Ran backend tests (`node --test`) and confirmed all pass (2/2).

## 0.1.0 — Initial MVP

- Initial local prototype with backend API, SPA frontend, and Electron launcher.

