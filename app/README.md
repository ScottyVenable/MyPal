# MyPal (Pal) – Local MVP v0.1

This is a runnable first version aligned with the App Design Document. It includes:
- Backend (Node/Express) with JSON file storage and XP/level logic.
- Frontend SPA (vanilla JS) with Chat, Stats (Chart.js radar), and Brain placeholder.

## Prereqs
- Windows with Node.js 18+ installed.

## Setup
1) Install backend deps

```powershell
cd "g:\My Drive\Technology\AI Projects\MyPal\Documents\app\backend"; npm install
```

If you see EBADF/EPERM errors (common on synced folders like Google Drive), copy the backend folder to a local, unsynced path (e.g., `C:\dev\mypal\backend`) and run `npm install` there, then run `npm start`. Alternatively, pause Drive sync during install.

2) Start backend

```powershell
npm start
```

You should see: MyPal backend listening on http://localhost:3001

3) Open frontend
- Open `g:\My Drive\Technology\AI Projects\MyPal\Documents\app\frontend\index.html` in your browser.

## Using the app
- Type messages in Conversation tab; Pal responds with constrained output based on level.
- Click the star (Reinforce) next to Pal replies to grant extra XP.
- Adjust Learning Speed Multiplier and Save.
- Reset Pal wipes local memory (with confirmation) and returns to Level 0.
- Export Memory downloads a JSON snapshot of all collections + state.

## API
- POST /api/chat { message }
- GET /api/stats
- POST /api/settings { xpMultiplier }
- POST /api/reinforce
- POST /api/reset
- GET /api/export (downloads JSON)

## Notes
- Stage 0–1 behavior: Pal babbles (phonemic output). Levels 2–3 return one known word (placeholder until vocab teaching flow is added in v0.2).
- Personality radar updates via simple heuristics from user text.
- Data stored under `app/backend/data/*.json`.

## Next (per milestones)
- v0.2: Add vocabulary teaching flows and single-word constraint from known words.
- v0.3: Telegraphic speech and egocentrism.
- v0.4+: Memories, sentiment, cloud persistence.
