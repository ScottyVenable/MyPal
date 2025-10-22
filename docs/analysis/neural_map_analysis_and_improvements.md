## Current Architecture

```
User Message (Chat form submit)
  ↓
Frontend Controller (`wireChat` → `sendChat` in `app/frontend/app.js`)
  • Renders the outbound bubble immediately and disables the input while awaiting the backend
  • Issues `POST /api/chat` via `apiFetch`
  ↓
Express Backend (`/api/chat` in `app/backend/src/server.js`)
  • Analyzes the utterance, updates vocabulary, memories, and journal entries
  • Retrieves or initializes the neural network and activates task-specific firing patterns
  • Persists updated collections (state, chat log, memories, concepts, neural network) through `ProfileManager`
  ↓
HTTP Response → Frontend renders Pal reply & refreshes stats/journal
```

```
Neural Visualization Loop
  ↓
Backend `NeuralNetwork` emits `neuron-fire` / `connection-signal` events during chat handling
  ↓
`setupNeuralBroadcaster` pushes serialized events over `/neural-stream` WebSocket
  ↓
Frontend `connectNeuralSocket` applies DOM pulses for affected regions/neurons
```

Key persistence paths are profile-scoped JSON files (chat-log, memories, journal, concepts, neural.json) managed by `ProfileManager`, enabling per-profile state isolation without a database server.

### Data stores observed
- `neural.json`: stores regions, neurons, pathways, metrics, and the latest event buffer from the `NeuralNetwork` class. Each neuron records thresholds, firing history, and connection weights for propagation.【F:app/backend/src/server.js†L352-L458】【F:app/backend/src/server.js†L551-L656】
- `concepts.json`: maintains an array of concept nodes keyed by inferred assignments, tracking mention counts, keyword co-occurrences, sentiment aggregates, and importance scores derived from recent interactions.【F:app/backend/src/server.js†L3565-L3634】
- Profile metadata, chat logs, vocabularies, journals, and neural snapshots are reloaded and persisted through `getCollections` / `saveCollections`, which marshal JSON blobs for the active profile directory.【F:app/backend/src/server.js†L266-L304】【F:app/backend/src/profileManager.js†L61-L158】

### Frontend/Backend touchpoints
- Chat submission wiring renders optimistic UI, calls `sendChat`, and handles structured response payloads (reply, mode, emotion).【F:app/frontend/app.js†L1262-L1319】【F:app/frontend/app.js†L593-L614】
- Neural visualization opens a dedicated WebSocket, listens for snapshots & incremental events, and manipulates the SVG brain view accordingly.【F:app/frontend/app.js†L646-L719】
- WebSocket broadcasting is bootstrapped server-side; the broadcaster rehydrates the neural model for the current profile and emits updates to all connected clients, persisting snapshots every five seconds for durability.【F:app/backend/src/server.js†L5058-L5106】

## Identified Bugs
- **Profile deletion never reports failure:** `/api/profiles/:id` treats the return object from `ProfileManager.deleteProfile` as a boolean, so failures still respond 200 OK instead of surfacing the embedded `success: false` flag.【F:app/backend/src/server.js†L4041-L4050】【F:app/backend/src/profileManager.js†L230-L265】
- **Loading a missing profile still returns 200:** `/api/profiles/:id/load` only checks for a falsy return value; because `loadProfile` always returns an object, failures leak through with `success: false` but no HTTP error status.【F:app/backend/src/server.js†L4020-L4037】【F:app/backend/src/profileManager.js†L190-L228】
- **WebSocket URL is insecure on HTTPS:** `connectNeuralSocket` hardcodes `ws://` (no TLS). Browsers block mixed-content sockets when the UI is hosted on HTTPS, preventing the neural stream from connecting in production deployments.【F:app/frontend/app.js†L646-L680】

## Performance Bottlenecks
- **Synchronous JSON rewrites per message:** Every chat turn serializes multiple JSON artifacts (`chat-log`, `memories`, `journal`, `neural.json`, `concepts`, `vocabulary`) via `saveCollections`, incurring blocking disk I/O that will not scale under the requested 100+ message stress test.【F:app/backend/src/server.js†L283-L304】
- **Neural persistence churn:** The broadcaster re-saves the entire neural map snapshot every five seconds even when idle, amplifying file writes and GC pressure as the network grows.【F:app/backend/src/server.js†L5093-L5102】
- **High-frequency DOM churn on events:** Each `neuron-fire` pulses an entire SVG region by iterating all nodes, which will thrash layout/rendering when the backend starts emitting continuous firing streams (especially under the proposed “living brain” idle pulses).【F:app/frontend/app.js†L683-L717】

> Baseline load testing could not be executed in this environment because the Electron/SPA runtime and backend services are not provisioned during automated review. The bottlenecks above stem from static analysis of the hot paths instead.

## Current Limitations & Recommendations
- **Static, random neural geometry:** The current neural map seeds neurons with random positions and connections that never reference learned concepts or memory strength, so the visualization is largely decorative. Tie neuron creation/activation directly to `concepts.json` nodes and relationship weights when implementing the “Living Brain.”【F:app/backend/src/server.js†L564-L680】【F:app/backend/src/server.js†L3565-L3634】
- **No ambient cognition loop:** All neural firing occurs inside the chat handler; there is no scheduler to perform idle reflections, update journals, or evolve concept links autonomously. Introduce a background task in `ProfileManager` or a dedicated worker that periodically selects memories to rehearse and records “Thought” journal entries, then emit corresponding neural events for the idle hum.【F:app/backend/src/server.js†L4214-L4400】
- **Concept graph unused for response planning:** Reply generation does not consult the concept graph beyond incidental keyword boosts; Phase 2 should integrate concept density and link strength into the response planner before composing text to deliver the “continuous evolution” behavior.【F:app/backend/src/server.js†L4214-L4399】【F:app/backend/src/server.js†L3565-L3634】
- **Security & scaling gaps:** Strengthen profile management endpoints to validate return codes, and update the neural WebSocket URL builder to respect `wss://` on secure origins. For high-frequency neural streams, migrate persistence to an async job queue or in-memory cache with batched flushes to avoid blocking the request loop.【F:app/backend/src/server.js†L4020-L4054】【F:app/frontend/app.js†L646-L680】【F:app/backend/src/server.js†L5093-L5102】

> These findings establish the “as-is” reference for Phase 2 planning. Follow-up work should start by fixing the enumerated bugs, then iteratively layering the ambient cognition loop, proactive messaging, and CP-driven tuning on top of the profiled hotspots.
