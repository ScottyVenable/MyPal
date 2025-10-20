# MyPal — Evolving AI Companion (MVP)

MyPal is a local-first AI chat pal that grows and develops as you interact with it. Early levels use constrained, developmentally-inspired responses; over time it gains vocabulary and capability based on your guidance.

This MVP runs a small Node/Express backend and a static HTML/CSS/JS frontend.

## Quick Start

- Backend
  - Requirements: Node 18+
  - `cd app/backend`
  - `npm install`
  - `npm run start`
  - Server listens on `http://localhost:3001`

- Frontend
  - Open `app/frontend/index.html` in a browser
  - Or serve via any static server

- Desktop (Electron launcher)
  - `cd dev/src/bin/launcher`
  - `npm install`
  - `npm run dev` (development) or `npm run dist` (Windows installer)
  - The launcher starts the backend and opens the SPA in a window. Data/logs/models are stored under the OS user data directory.

## Desktop Launcher (Windows)

Use the Electron launcher under `dev/src/bin/launcher/` to run everything from a single executable window. Install backend dependencies once (`cd app/backend && npm install`) before launching so the bundled server can start.

Development run (starts backend + opens the SPA window):

```powershell
cd "g:\My Drive\Technology\AI Projects\MyPal\dev\src\bin\launcher"
npm install
npm run dev
```

Package a distributable installer (`.exe`):

```powershell
cd "g:\My Drive\Technology\AI Projects\MyPal\dev\src\bin\launcher"
npm install
npm run dist
```

The builder writes artifacts to `dev/src/bin/launcher/dist/`. The launcher stores backend data, logs, and models under the OS user data directory (e.g., `%APPDATA%/MyPal`).

## Features (MVP)
- Conversation with constrained responses by level (babble → single words → short echo)
- Stats tab with personality radar chart and XP/Level/CP
- Reinforce button to boost XP
- Settings: XP multiplier; optional API provider + key (stored locally)
- Health check + popup if server is not running
- Simple logging to `logs/access.log`
- Dev tools panel (Ctrl+D) for quick status

## New in 1.0
- Desktop launcher with installer (Windows build via electron-builder).
- Brain graph visualization (vis-network) from recent chat co-occurrence.
- Optional authentication for sensitive actions (export/reset).
- Telemetry opt-in (local logging only).
- Plugin scaffolding (list + enable/disable state).

## Roadmap
- On-device LLM option using quantized models (see docs/DEV ONLY/Design/ON_DEVICE_LLM_PLAN.md)
- Optional cloud sync for users who opt in
- Brain visualization and plugin system

## Legal
- Draft Terms: docs/Legal/TERMS.md
- Draft Privacy: docs/Legal/PRIVACY.md

## License
- See LICENSE (TBD).
