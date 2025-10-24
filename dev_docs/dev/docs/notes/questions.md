# Questions
_This document contains questions and considerations for the MyPal project that need to be addressed during development._

1. If the program is an HTML app, do we need different builds for different OS?
   - Answer: For this MVP, no separate builds are required because the frontend is static HTML/JS and the backend is a Node server that runs cross‑platform. For packaged distributions, we will create per‑OS installers later (Windows/macOS/Linux) but the codebase remains the same. If we ship a desktop wrapper (e.g., Electron/Tauri) we’ll generate OS‑specific bundles from a single codebase.
2. Should `LICENSE` and `TERMS` be as html files instead for better formatting? Maybe links to the website? Both?
   - Answer: Keep canonical copies in Markdown within the repo (easier versioning), and link to them from the website. Optionally render them as HTML on the website. Inside the app, display a Markdown→HTML render or link out to the website versions. This ensures single‑source of truth with flexible presentation.
