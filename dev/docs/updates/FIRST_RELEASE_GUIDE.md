# Pal v0.1 “Infancy” – First Release Guide

This guide helps you install, configure, run, and validate the first working version of Pal, aligned to the App Design Document (Sections 2–6).

## 1) What’s in this release
- Local-only MVP (no internet memory; JSON files on disk)
- Stages implemented: Level 0–1 babbling, Level 2–3 single-word (placeholder)
- Core systems: XP/Levels/CP, Learning Speed Multiplier, Reinforce, Reset, Export
- Stats: Personality radar (Chart.js)
- Brain: placeholder panel for future graph

## 2) Quick start (TL;DR)
1. Open PowerShell.
2. Install backend deps:
   ```powershell
   cd "g:\My Drive\Technology\AI Projects\MyPal\Documents\app\backend"
   npm install
   ```
   If npm fails on Drive-synced paths, pause sync or copy to `C:\dev\mypal\backend` and install there.
3. Start the backend:
   ```powershell
   npm start
   ```
4. Open UI: `g:\My Drive\Technology\AI Projects\MyPal\Documents\app\frontend\index.html`

## 3) Requirements and preflight
- Windows 10/11, Node.js 18+ (run `node -v` to verify)
- Browser: Edge/Chrome
- Port 3001 available (change via `.env` if needed)

Optional local hosting for frontend (avoids file:// quirks):
- VS Code “Live Server” extension; or
- Temporary server from the frontend folder:
  ```powershell
  npx http-server . -p 5173
  ```

## 4) Install and run (Windows PowerShell)
1) Install backend dependencies
```powershell
cd "g:\My Drive\Technology\AI Projects\MyPal\Documents\app\backend"
npm install
```
If you see EBADF/EPERM errors (common on Google Drive sync):
- Pause Drive sync temporarily, then rerun `npm install`; or
- Copy to an unsynced path, e.g. `C:\dev\mypal\backend`, then:
  ```powershell
  cd C:\dev\mypal\backend
  npm install; npm start
  ```

2) Start the backend
```powershell
npm start
```
Expected: “MyPal backend listening on http://localhost:3001”. Leave it running.

3) Open the frontend UI
- Open `g:\My Drive\Technology\AI Projects\MyPal\Documents\app\frontend\index.html` in your browser; or use a local host as above.

## 5) Configuration
- `.env` (optional) in `Documents/app/backend/`:
  - `PORT=3001` (change if 3001 is in use)
- Data location: `Documents/app/backend/data/*.json`
- Learning Speed Multiplier: set 1–250 in the UI (Conversation tab → Save Settings)

## 6) Guided first session (10 minutes)
Follow this to verify core mechanics per the design document.

1. Send a greeting like “hi pal”.
   - Expected: Pal replies with a short babble (Level 0–1).
   - Stats: XP increases by ~10 × multiplier; Level likely remains 0 initially.
2. Click the star next to Pal’s reply.
   - Expected: XP +25; CP updates accordingly.
3. Ask a question: “why do you say ba?”
   - Expected: Babble reply; Curious/Logical radar axes tick up.
4. Try social language: “hello”, “thanks”, “bye”.
   - Expected: Social increases on radar.
5. Give positive reinforcement words in your text (“good job”, “nice”).
   - Expected: Agreeable increases.
6. Add a corrective/negative phrase (“that was wrong”).
   - Expected: Cautious increases slightly.
7. Adjust Learning Speed Multiplier to 50 and Save.
   - Send another message; XP gain should scale.
8. Watch for a level-up to Level 1 as XP passes 100.
   - Expected: Behavior remains babble through Level 1.
9. Export Memory.
   - Expected: A `pal_memory.json` download with state + collections.
10. Reset Pal (double confirm).
    - Expected: Level/XPs reset to 0; chat cleared; data files wiped.

## 7) Feature walkthrough
- Conversation
  - Pal replies constrained by current stage: babble (0–1), single-word placeholder (2–3).
  - Reinforce star grants bonus XP and updates stats.
- Settings (Conversation tab)
  - Learning Speed Multiplier (1–250) → Save to apply.
  - Reset Pal → wipes local memory and returns to Level 0 (two-step confirm).
  - Export Memory → downloads combined JSON of all collections/state.
- Stats tab
  - Shows Level, XP, CP, Vocabulary size (vocab teaching arrives in v0.2).
  - Personality Radar (Curious/Logical/Social/Agreeable/Cautious) updates from message patterns.
- Brain tab
  - Placeholder; network graph visualization planned for v0.3.

## 8) Validation checklist (acceptance)
- Backend runs on the configured port; browser can reach `/api/stats`.
- Message → Pal reply; XP increments; CP = floor(XP/100).
- Reinforce increases XP; stats reflect change.
- Multiplier scales XP gains after Save.
- Export downloads JSON with `state`, `vocabulary`, `concepts`, `facts`, `memories`, `chatLog`.
- Reset clears files under `backend/data` and sets Level to 0.

## 9) Troubleshooting
- npm install EBADF/EPERM (Drive-synced folders)
  - Pause Drive sync; or copy to `C:\dev\mypal\backend` and install/run there.
- Port 3001 in use
  - Change `PORT` in `.env`, or free the port:
    ```powershell
    netstat -ano | findstr :3001
    taskkill /PID <pid> /F
    ```
- Browser can’t reach the API/CORS errors
  - Ensure backend is running first; consider serving the frontend via a local server instead of file://.
- No XP changes
  - Verify multiplier is set and Saved; check that messages are non-empty; reload Stats tab.

## 10) Alignment to App Design Document
- Section 2.1/2.3: SPA frontend; local JSON document storage emulates NoSQL patterns.
- Section 2.2: Constrained generation protocols represented locally for Stage 0–1 (babble) and 2–3 (single-word placeholder). Gemini API integration lands in later versions.
- Section 3: XP and Level thresholds implemented; Reinforce grants XP; stages influence output.
- Section 4: Conversation, Stats (radar), and Brain tabs present; avatar evolution/visuals arrive later.
- Section 6: Learning Speed Multiplier, Reset, Export included.

## 11) Known limitations in v0.1
- No Gemini API yet; outputs are locally simulated.
- Vocabulary teaching and strict single-word-from-known-list land in v0.2.
- Brain visualization is a placeholder.
- No accounts/auth; data is local to the machine.

## 12) Release operations
- Tag: `v0.1.0` (Infancy)
- Deliverables: this guide, roadmap docs, `app/` backend+frontend, `.env.sample`
- Rollback: Use Reset Pal; or restore from a saved `pal_memory.json` export.

## 13) What’s next
- v0.2 Toddler: Teach words with user definitions; constrain to known vocab; improve reinforcement semantics.
- v0.3 Preschool: Telegraphic S-V-O, egocentric persona, initial Brain graph.
- v0.4+: Memories, sentiment, and cloud persistence (Mongo/Firestore).

## 14) Support
- Roadmap: `Documents/DEV_MILESTONES/MILESTONES.md` and `RELEASE_PLAN.md`
- Dev runbook: `Documents/app/README.md`
