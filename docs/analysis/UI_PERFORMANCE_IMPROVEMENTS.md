# UI Performance Improvements — Deep-Dive Strategy and Implementation Guide

This document is a comprehensive, engineering-grade plan to improve perceived and actual performance across the entire MyPal UI: startup, chat, stats, brain visualization, journal/history, and profile management. It aligns with project principles (local-first, privacy-first, offline-first) and with the Piaget/Vygotsky stage constraints described in `docs/design/APP_DESIGN.md`.

The plan is structured as: budgets → measurement → prioritized workstreams → concrete code patterns → rollout and QA → checklists. Each recommendation is framed for our current stack (vanilla JS SPA, Chart.js, vis-network, Node/Express backend, Electron launcher) and our known data sizes (e.g., 265+ neurons across 7 brain regions).

---

## 1) Performance Budgets (by surface)

These serve as guardrails. Exceeding them requires justification and mitigation.

- Global
  - Time-to-interactive (TTI): ≤ 1.5s on mid-range Windows laptop (Cold start, backend already running)
  - Total Blocking Time (TBT): ≤ 150ms on startup; ≤ 50ms steady state
  - Long Tasks (>50ms): ≤ 2 during startup; near 0 during steady state
  - Memory footprint: UI ≤ 150MB steady state (Electron/Chromium includes overhead)

- Profile menu
  - First Paint: ≤ 300ms
  - Menu interactive: ≤ 600ms

- Chat tab
  - Input-to-rendered user message: ≤ 50ms
  - Model reply added to DOM: ≤ 150ms after payload arrival
  - Typing indicator updates: ≤ 16ms per frame
  - Scroll performance: sustained 60fps

- Stats tab (Chart.js)
  - Initial chart mount: ≤ 250ms
  - Data update: ≤ 60ms (animations off for large data)

- Brain tab (vis-network)
  - First meaningful render of 265+ neurons: ≤ 300ms
  - Stabilize then freeze physics; interactions ≤ 16ms per frame
  - Incremental updates (diff apply): ≤ 60ms per batch

- Journal/History
  - Pagination fetch: ≤ 150ms network (LAN localhost) + ≤ 50ms render per page
  - Infinite scroll: never more than O(visible) DOM nodes
  
---

## 2) Measurement & Instrumentation Protocol

Implement a minimal, gated perf framework before changes to establish and track deltas.

### 2.1 Perf toggle and API
- Add `localStorage.setItem('mypal_debug_perf', 'true')` to enable.
- Provide a `perf` helper with:
  - `perf.mark(name)`
  - `perf.measure(label, startMark, endMark)`
  - `perf.observeLongTasks(threshold=50)` using `PerformanceObserver`
  - `perf.report()` prints structured results with `[PERF]` prefix.

Suggested file: `app/frontend/services/perf.js` (loaded early). All logging must be no-op when the flag is off.

### 2.2 Marks to add in `app/frontend/app.js`
- `init_start`, `init_profile_menu_ready`
- `chat_msg_submit`, `chat_msg_dom_ready`
- `stats_tab_enter`, `stats_chart_ready`
- `brain_tab_enter`, `brain_first_render`, `brain_stabilized`
- `journal_fetch_start(page)`, `journal_render_done(page)`
- WebSocket cycles: `ws_batch_received`, `ws_batch_applied`

### 2.3 Tools and repeatable steps
- Use Chrome Performance panel & Lighthouse in Electron/Chrome
- Record three runs cold/warm; report median
- Track memory timeline (look for leaks on tab switches)

---

## 3) Prioritized Workstreams

### 3.1 Quick Wins (Low Risk / High Impact)

DOM & Rendering
- Batch DOM writes using `DocumentFragment` and `replaceChildren()`
- Prefer `transform/opacity` over layout-affecting properties (top/left/width)
- Add `contain: content;` and `will-change: transform` on frequently updated regions (message list container, brain canvas wrapper)
- Passive listeners for scroll/touch: `{ passive: true }`
- Debounce search inputs; throttle scroll/resize

Charts (Chart.js)
- Keep singleton instances; update data in-place; `chart.update('none')`
- Disable animations for frequent updates; use decimation for long series
- Fix container sizes; prefer `responsive: false` if layout is stable

Brain (vis-network)
- Initialize with physics stabilization, then disable physics: `network.once('stabilized', ()=> network.setOptions({ physics: { enabled: false } }))`
- Reduce hover/multiselect processing: `interaction: { hover: false, multiselect: false }`
- Avoid `setData` for minor changes—use `nodes.update([...])`, `edges.update([...])`

Lists (Chat/Journal)
- Virtualize long lists (only visible + small buffer)
- Lazy render older messages with `IntersectionObserver`
- `content-visibility: auto` for long sections to skip off-screen rendering

Network
- Parallelize initial independent calls with `Promise.all`
- Cache last-known settings/stats in `localStorage` with version stamp
- Reuse a single WebSocket for neural events; back off reconnect exponentially

Perceived Performance
- Skeleton loaders for chat/stats/brain
- Preload critical fonts (subsets) and CSS to avoid layout shifts

### 3.2 Medium Effort

Data Loading & Transformations
- Paginate journal/history (`?page=&limit=`) and implement scrolling window
- Stream large responses (ReadableStream) and append progressively
- Precompute stats server-side; send compact payloads, include `ETag`

Workerization
- Offload heavy transforms (graph layout prep, series decimation, summaries) to Web Workers
- Consider `OffscreenCanvas` for brain animations if we keep Canvas path

UI Architecture
- Split `app.js` into modules (chat, stats, brain, profiles, utils, perf)
- Lazy-load non-chat features (dynamic `import()` on tab enter)
- Batch view updates via a tiny pub/sub and flush once per rAF

Brain-specific
- Persist node positions per profile to skip relayout on revisit
- Cluster by region/strength; expand on click
- Hide low-weight edges until zoom-in threshold

Assets
- Subset fonts; `font-display: swap`
- Compress images; prefer WebP/AVIF

### 3.3 Advanced

Rendering Path
- If SVG/DOM becomes the bottleneck, move heavy visuals to Canvas/WebGL (e.g., PixiJS)
- Minimize visual effects (shadows, gradients) in vis-network; prefer textures

Data Model
- Normalize large collections (journal) into index + pages; windowed loading
- In-memory LRU cache around viewport

Build Tooling
- Introduce a minimal build (esbuild or Vite) for tree-shaking, minification, and code-splitting
- Produce two bundles: core (chat + shell) and on-demand (stats/brain)

Service Worker (optional, still useful in Electron)
- Cache shell assets + last small profile snapshot for instant warm start
- Background prefetch charts data on idle

---

## 4) Concrete Code Patterns (Project-tailored)

Batch DOM updates (messages)
```js
const frag = document.createDocumentFragment();
messages.forEach(m => frag.appendChild(renderMessage(m)));
messageList.replaceChildren(frag);
```

rAF & Idle scheduling
```js
export function scheduleVisual(fn){ requestAnimationFrame(fn); }
export function scheduleIdle(fn){
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 500 });
  else setTimeout(fn, 0);
}
```

Throttle & Debounce
```js
export const throttle = (fn, ms)=>{ let t=0; return (...a)=>{ const n=Date.now(); if(n-t>ms){ t=n; fn(...a);} }; };
export const debounce = (fn, ms)=>{ let h; return (...a)=>{ clearTimeout(h); h=setTimeout(()=>fn(...a), ms); }; };
```

Chart.js reuse
```js
if (!window._statsChart) {
  window._statsChart = new Chart(ctx, { /* ... */ });
} else {
  window._statsChart.data.datasets[0].data = nextData;
  window._statsChart.update('none');
}
```

vis-network fast init
```js
const options = {
  physics: { stabilization: { iterations: 200 }, enabled: true },
  interaction: { hover: false, multiselect: false },
  edges: { smooth: { type: 'continuous' } }
};
network.once('stabilized', ()=> network.setOptions({ physics: { enabled: false } }));
```

WebSocket batching (neural events)
```js
let batch = [];
let scheduled = false;

socket.onmessage = (e)=>{
  batch.push(JSON.parse(e.data));
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(()=>{
      applyNeuralEvents(batch);
      batch = [];
      scheduled = false;
    });
  }
};
```

---

## 5) Initialization Flow (Staged)

1. First paint: profile menu + minimal shell (no heavy imports)
2. Idle: verify backend health, prefetch small settings snapshot, last-known stats
3. On tab enter: dynamically load tab-specific modules (stats/brain)
4. After Chat visible: open WebSocket; batch early events
5. Defer non-critical tasks (journal prefetch, secondary charts) to idle

---

## 6) Backend Support (to unblock UI)

- Enable gzip/deflate (Express `compression` middleware)
- Add `ETag` and `If-None-Match` to `/api/stats`, `/api/neural`, `/api/journal`
- Provide paginated journal endpoints: `/api/journal?page=&limit=&beforeId=`
- Precompute + cache personality trait aggregates; return only deltas
- Optional: “positions” API for brain nodes—persist and return last known positions per profile

---

## 7) Rollout, QA, and Safeguards

Feature Flags
- Each optimization gated via `window.__perfFlags = { chartsFastUpdate: true, brainDiffs: true, ... }`
- Toggle via Settings → Developer (future) or `localStorage` keys

QA Protocol (per PR)
- Run 3× cold/warm; record medians for budgets above
- Verify no visual regressions (focus on Brain edges, chart labels, chat scroll)
- Validate no new console errors; check memory doesn’t climb after 5 tab switches
- Confirm offline behavior unchanged; privacy constraints intact

Rollback Strategy
- Keep flags off by default; ship dark
- Enable in dev builds; collect perf logs locally
- Gradually enable per-surface (Stats first, then Brain, then Journal)

---

## 8) Risks and Mitigations

- CSS containment or transforms break layout → roll back with flag, add targeted `contain` only
- Event batching feels laggy → cap batches at 100ms or per-rAF; adaptive window based on load
- Code splitting complicates paths → start with two-bundle split; retain no-build path for fallback

---

## 9) Acceptance Criteria (Go/No-Go)

- Startup to profile menu ≤ 1.5s (median of 3 runs)
- Chat input→DOM ≤ 50ms; reply render ≤ 150ms
- Brain first meaningful render ≤ 300ms; steady interactions ≤ 16ms/frame
- Stats updates ≤ 60ms without animation
- Infinite scroll sustained 60fps; O(visible) DOM nodes
- Long tasks drastically reduced (startup ≤ 2; steady state ≈ 0)

---

## 10) Immediate Next Steps (Actionable)

- Add `services/perf.js` and wire perf marks around init/chat/stats/brain
- Convert hot paths to DOM batching in `app.js` (message list, journal renderers)
- Ensure Chart.js singleton reuse + disable animations for bulk updates
- Apply vis-network stabilization → freeze physics; replace `setData` with diffs
- Implement journal pagination on backend + UI slice rendering
- Introduce WebSocket rAF batching for neural events
- Assess simple code split for stats/brain modules using esbuild/Vite (dev only first)

---

This plan balances quick wins with a clear path to deeper improvements, stays compatible with our local-first/privacy-first requirements, and provides measurable criteria to validate success.
