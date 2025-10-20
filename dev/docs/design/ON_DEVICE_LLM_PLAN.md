# On-Device LLM Plan (Backlog)

Goal
- Provide a fast, on-device model option for wider hardware. Default remains local-constrained logic; external APIs are optional.

Constraints
- Must run acceptably on common consumer hardware (4–8 CPU cores, 8–16GB RAM, optional iGPU/dGPU).
- Model size target: 3B–7B params quantized (e.g., Q4_0/Q5_0).

Candidates
- Llama 3.x 8B (quantized) via llama.cpp/ggml/gguf.
- Mistral 7B (quantized) via llama.cpp or similar runtime.

Runtime
- Prefer llama.cpp bindings for Node via server-side child process with a local HTTP bridge.
- Ensure streaming responses and cancellation; cap context length for latency.

Startup Capability Check
- Use docs/detect_user_specs to populate `docs/detect_user_specs/user_hardware.json`.
- On first run, detect: RAM, CPU flags (AVX2), GPU VRAM if available.
- Choose a default quantization based on a rule table; fall back to smallest model.

Storage/Layout
- Place models in `app/backend/models/` (configurable via env `MODELS_DIR`).
- Keep a `models.json` manifest with name, size, quant, SHA256, and last-used timestamp.

API Shape (Server)
- `GET /api/models` → list installed models (from manifest + dir scan).
- `POST /api/models/load { name }` → load model into runtime (if supported).
- `POST /api/chat` → if `settings.apiProvider === 'local'` and a model is loaded, route to local runtime; else use current constrained logic.

Latency/UX Targets
- First-token < 1.5s on mid-range CPU.
- Token rate ≥ 15 tok/s on mid-range CPU for 3–4B quant.

Safety & Memory
- Keep current persona-stage constraints for early levels; gradually allow freer generation.
- Persist conversations and embeddings (future) for better retrieval and personalization.

Testing Plan
- Benchmark different quantizations on sample hardware profiles.
- Validate memory use and failure modes; provide clear fallbacks.

Rollout
- Phase 1: Manifest and directory; mock runtime stub; UI to list models.
- Phase 2: Integrate llama.cpp bridge + streaming; simple prompt templates.
- Phase 3: Guardrails, RAG hooks, tuning knobs.
