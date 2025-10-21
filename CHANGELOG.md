# Changelog

All notable changes to this project are documented here. This log is maintained per MyPal app version.

## 0.1.1 — 2025-10-20

- Build: Fix Electron builder `extraResources.from` path so the `app/` directory is correctly packaged. Prevents runtime ERR_MODULE_NOT_FOUND for `express` in packaged builds.
- Frontend: Normalize UI glyphs to avoid garbled characters on Windows. Replaced unknown separators in timestamps and brain summary with `|`, ensured missing-text placeholder is `?`, and set a reliable star icon for reinforce button.
- Frontend: Minor UX polish for placeholders and labels (title, chat input, API key, footer).
- Backend: Verified graceful shutdown and logging; retained structured console/error log output to `%APPDATA%/MyPal/logs/` in addition to dev mirrors.
- Dev: Added troubleshooting notes to `launcher/README.md` for common setup issues (module not found, port conflicts, cloud‑sync install errors).
- Tests: Ran backend tests (`node --test`) and confirmed all pass (2/2).

## 0.1.0 — Initial MVP

- Initial local prototype with backend API, SPA frontend, and Electron launcher.

