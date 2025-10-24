---
applyTo: '**'
---
# MyPal AI Companion  Copilot Instructions (Tauri/Desktop Focus)

MyPal is a local-first AI companion featuring a vanilla JavaScript SPA, a Node.js/Express backend, and a lightweight Tauri 2.0 desktop shell. The Avalonia and Electron stacks are retired; do not reference or rebuild them. Development must center on the SPA + backend + Tauri workflow.

## Architecture Overview
- `app/backend`  Node.js (ESM) server. Provides REST/WebSocket APIs, manages JSON data, orchestrates AI pipelines.
- `app/frontend`  Vanilla JS single-page app consumed by both desktop and browser modes.
- `app/desktop/tauri-app`  Tauri shell with Rust entry (`src-tauri/src/main.rs`) and config (`tauri.conf.json`). Wraps the SPA and coordinates with the backend.
- `mobile`  React Native prototype (future). Keep TypeScript strict settings enabled.
- `docs`  Authoritative specs. Update when workflows or architecture change.
- `Developer Files/`  Local runtime logs/output (gitignored).

## Environment & Tooling
- Node.js 18+ (backend/frontend + Tauri npm scripts).
- Rust toolchain with Tauri prerequisites (MSVC on Windows, etc.).
- PowerShell 5+ for automation scripts (bash usable but less maintained).
- Optional: Playwright or Vitest for frontend automation; ensure dependencies documented.

## Daily Workflow (Desktop Focus)
1. Install deps:
   - `cd app/backend && npm install`
   - `cd ../desktop/tauri-app && npm install`
2. Launch via `./AUTORUN.ps1` (starts backend then `npm run dev` for Tauri) **or** start backend (`npm run dev`) and Tauri shell (`npm run dev`) in separate terminals.
3. Backend listens on `http://localhost:31337` (default); Tauri proxy serves SPA.
4. Logs stream to `Developer Files/logs/`; inspect during development.

## Testing Expectations
- **Backend**: `npm test` (Node test runner). Cover AI interactions, profile persistence, error paths.
- **Frontend**: Add/maintain regression tests (Vitest/Playwright) when modifying SPA logic.
- **Desktop**: After significant changes, run `npm run build` in `app/desktop/tauri-app` to ensure native packaging still works.
- Document manual QA steps in `docs/development/` when automation is insufficient.

## Code Standards
### Backend
- Use ESM (`import`/`export`). No CommonJS.
- Prefer async/await with structured logging (avoid bare `console.log`).
- Keep configuration in dedicated modules or env vars; never commit secrets.
- Update prompt templates/tests whenever AI flow changes.

### Frontend
- Maintain modular JS under `app/frontend/js/`; avoid global pollution.
- Keep styling in `app/frontend/styles.css` with CSS variables for theme tokens.
- Ensure compatibility with WebView (no Node-specific APIs).

### Tauri (Rust + Config)
- `main.rs` should remain minimal: window lifecycle, system tray, backend health checks.
- When adding plugins, update `Cargo.toml`, `tauri.conf.json`, and document prerequisites.
- Keep native dependencies lightweight to preserve bundle size.

## Documentation Duties
- Update `README.md`, `PROJECT_STRUCTURE.md`, and related docs whenever architecture or scripts change.
- Archive/remove Avalonia-specific documents; replace with Tauri-focused guidance.
- Record technical plans in `docs/development/` (e.g., refactor strategies, migration notes).
- Maintain `CHANGELOG.md` entries for every release/refactor.
- After every substantial change, sync the `https://github.com/users/ScottyVenable/projects/5/views/1` project board (bugs, features, roadmap, backlog, status) using the GitHub CLI if installed.

## Git Workflow
- Branch naming: `feature/...`, `bugfix/...`, `refactor/...`, `patch/...`.
- Commit format: `[TYPE] Brief description`, `TYPE  {BUGFIX, FEATURE, PATCH, REFACTOR, DOCS, TEST, TAURI, GITHUB}`.
- Keep commits atomic; run tests/linters before committing.
- Issues live in `/issues/*.md`; sync with GitHub using template instructions.

## Logging & Diagnostics
- Backend logs should use structured helpers (include profile/context IDs).
- Document any log level or rotation changes.
- Tauri logs accessible via devtools; ensure instructions exist when adding new logging surfaces.

## Security & Privacy
- Offline-first by default; no telemetry unless explicitly toggled.
- Store dev data in `dev-data/`; production shell uses OS app data (`%APPDATA%/MyPal`).
- Sanitize all user inputs, especially when persisted or fed into prompts.
- Never commit user-generated data or secrets.

## Review Checklist
-  Backend tests (`npm test`) pass.
-  Frontend/desktop build commands (`npm run build`, lint/tests) succeed.
-  Docs updated for workflow changes.
-  Logging changes are intentional and documented.
-  No references to Avalonia/Electron remain outside historical notes.

Keep this file updated as the Tauri stack evolves. Any new platform additions must include tooling prerequisites, documentation updates, and test coverage plans.
