# MyPal — AI Plan

## Purpose
This document captures the short- and medium-term AI plan for the MyPal project. It summarizes objectives, recommended on-device models, integration approach, hardware requirements, development milestones, verification checks (including the `detect_user_specs` tool), and next steps for the first releases.

## High-level objectives
- Build a lightweight, privacy-first personal assistant ("Pal") that runs primarily on-device for inference where feasible.
- Ship an initial MVP (v0.1) with constrained persona behavior, vocabulary learning, XP/reinforcement, and a simple web-based chat UI.
- Provide a clear path to integrate local LLMs (quantized Llama-style models) and, optionally, cloud backends for heavier tasks.

## Current status (brief)
- Project scaffold for v0.1 exists: Express backend, vanilla JS frontend, local JSON persistence, XP/level logic, stats UI, and developer milestones under `Documents/DEV_MILESTONES`.
- On-device hardware detection tool implemented: `docs/detect_user_specs/detect_user_specs.py` writes a signed `user_hardware.json` and attempts to set it read-only.
- Environment note: backend `npm install` previously failed when run inside Drive-synced directories; use a local unsynced path to install dependencies successfully.

## Key artifacts and locations
- Dev milestones and release plans: `Documents/DEV_MILESTONES/MILESTONES.md`, `RELEASE_PLAN.md`, `FIRST_RELEASE_GUIDE.md`.
- Backend scaffold: `Documents/app/backend/src/server.js`, `package.json`, `data/*.json`.
- Frontend scaffold: `Documents/app/frontend/index.html`, `styles.css`, `app.js`.
- Hardware detection: `docs/detect_user_specs/detect_user_specs.py`, `docs/detect_user_specs/README.md`, `docs/detect_user_specs/user_hardware.json`.

## Model recommendations (on-device first)
- Primary recommendation: Quantized Llama-family models running through `llama.cpp` or `text-generation-webui`:
  - Llama 2 7B (gguf quantized to q4_k_m or q4_0) — good tradeoff between quality and resource usage.
  - If host has <8GB VRAM but >=16GB system RAM, prefer CPU-loaded quantized models via `llama.cpp` (4-bit quantization) or smaller 3B models.
- Alternative lightweight options:
  - Mistral-instruct 7B quantized variants.
  - Falcon or Mistral 3B for extremely constrained devices.
- Packaged local inference options:
  - `text-generation-webui` for interactive dev and model management.
  - `LocalAI` or `Ollama` for a server-like interface exposing simple HTTP endpoints.

## Hardware/compatibility policy
- Use `docs/detect_user_specs/detect_user_specs.py` to produce a signed hardware snapshot at install or first run.
- Minimum recommended host for 7B quantized: 16 GB RAM (system), 6–8 GB VRAM (GPU) OR 32 GB system RAM for CPU-only q4_k_m runs.
- Fallbacks: if the host has low VRAM (<6 GB) and limited RAM (<16 GB), use 3B model variants or remote cloud inference.

## Integration approach
1. Verify host with `user_hardware.json` and map to capabilities:
   - If GPU >= 6GB VRAM and CUDA available: use GPU-backed llama.cpp / GGML CUDA builds or text-generation-webui with GPU.
   - Else if system RAM >= 32GB: prefer CPU-only quantized runs.
   - Else use smaller models (3B) or route heavy tasks to cloud.
2. Provide an adapter layer in the backend (`backend/src/model_adapter/*`) exposing a simple interface:
   - loadModel(config)
   - chat(prompt, context[], maxTokens, temperature)
   - streamChat(prompt, ...)
   - stop(), unload()
3. Start with a simple sync adapter that shells out to `text-generation-webui` or `llama.cpp` and parse completions.
4. Later, implement an in-process adapter for faster startup and tighter control (embedding-based caching, session memory control).

## Implementation milestones (AI-focused)
- v0.1 (done/core): Constrained persona, XP system, local JSON storage, basic UI.
- v0.2 (on-device LLM prototype):
  - Add `model_adapter` shim and tests.
  - Support launching local `text-generation-webui` or llama.cpp worker.
  - Integrate `detect_user_specs` check at startup to auto-select model and config.
  - Add simple token-budgeting and safety constraints (max tokens, stop tokens, persona wrapper).
- v0.3 (performance & features):
  - Streaming responses, partial generation UI updates.
  - Memory management: truncated context windows + retrieval-augmented-memory (local vector DB, e.g., sqlite + faiss or hnswlib).
  - Model hot-swap for fallback to cloud.
- v0.4+:
  - Quantization-aware loading, benchmark harness, and model selection heuristics.
  - Advanced persona enforcement, RL-like reinforce flows, and vocabulary learning.

## Security and anti-tamper
- The `user_hardware.json` is HMAC-signed. Store the HMAC secret in a local environment variable or OS key store; do not hardcode in production.
- On verification failure, re-run local detection and re-sign the file.
- Treat `user_hardware.json` as advisory; for strict enforcement, couple detection with a secure bootstrapped trust path (out of scope for v0.1).

## Risks and mitigations
- Drive-synced directories block package managers: recommend using unsynced local dev directories for installs and builds.
- On Windows, file attributes and Drive providers may not respect read-only flags — provide user instructions in `docs/detect_user_specs/README.md` and use fallbacks.
- Model licensing and weights distribution: respect model licenses (LLaMA/Llama 2 licensing) and provide clear instructions for users to download and place model files locally.

## Quick start for developers
1. Run the hardware detector once and inspect `docs/detect_user_specs/user_hardware.json`.
2. Copy backend to a local path if using Drive syncing: `C:\dev\MyPal\backend` and run `npm install` there.
3. Start model infra (text-generation-webui or llama.cpp) depending on `user_hardware.json` guidance.
4. Start backend and point `MODEL_ENDPOINT` or `MODEL_ADAPTER` to the running local model.

## Next actions (short)
- Create `backend/src/model_adapter` shim and a minimal integration test (v0.2 task).
- Add documentation on acquiring quantized GGUF models and a script to validate local model files.
- Automate hardware-detection + model-selection during backend startup.

## References
- DEV milestones and release plans: `Documents/DEV_MILESTONES/`
- Hardware detection tool: `docs/detect_user_specs/`
- Frontend/backend scaffolding: `Documents/app/`

---

_Last updated: 2025-10-19_
