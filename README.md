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

## Features (MVP)
- Conversation with constrained responses by level (babble → single words → short echo)
- Stats tab with personality radar chart and XP/Level/CP
- Reinforce button to boost XP
- Settings: XP multiplier; optional API provider + key (stored locally)
- Health check + popup if server is not running
- Simple logging to `logs/access.log`
- Dev tools panel (Ctrl+D) for quick status

## Roadmap
- On-device LLM option using quantized models (see docs/DEV ONLY/Design/ON_DEVICE_LLM_PLAN.md)
- Optional cloud sync for users who opt in
- Brain visualization and plugin system

## Legal
- Draft Terms: docs/Legal/TERMS.md
- Draft Privacy: docs/Legal/PRIVACY.md

## License
- See LICENSE (TBD).
