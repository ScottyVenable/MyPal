# Plugin System (Feature Spec — Draft)

Goals
- Allow extensions to add capabilities (UI components, model adapters, storage hooks) without modifying core.

Model
- Manifest-based plugins (`plugin.json`) with:
  - name, version, author, entry (server), assets (frontend), permissions (e.g., read_state, write_state, http).
- Server plugin API: lifecycle hooks (init, onMessage, onStats, onTick), router mount for plugin endpoints.
- Frontend plugin API: discovery endpoint lists plugins with UI assets to load dynamically.

Security & Isolation
- Default deny permissions; explicit allow list in manifest.
- Namespaced data under `app/backend/data/plugins/<pluginName>/`.

Distribution
- Plugins packaged as folders or zips; install by dropping into `app/backend/plugins/` (hot reload phase 2).

MVP Scope
- Server-only hooks for logging/analytics and simple response filters.
- UI: simple list of installed plugins with enable/disable toggles.
