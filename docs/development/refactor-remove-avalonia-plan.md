# Refactor Plan: Remove Avalonia Footprint

## Context
- Active branch: `refactor/remove-avalonia`
- Goal: Retire all Avalonia-specific code, assets, and documentation in favor of the HTML/Tauri stack.
- Drivers: Simplify maintenance, focus on a single desktop delivery path, reduce binary size, and eliminate unused build systems.

## Objectives
- Remove Avalonia project files (`app/desktop/MyPal.Desktop`, XAML assets, C# services, converters, DTOs, build scripts).
- Update automation scripts, CI entries, and documentation to drop Avalonia instructions.
- Expand automated tests around the backend and frontend to protect core workflows post-cleanup.
- Improve logging coverage to aid future diagnostics once the simplified stack is in place.
- Reorganize repository folders to reflect the new architecture (Tauri shell + SPA + backend).
- Purge stale or redundant assets, docs, and scripts that no longer apply.

## Work Breakdown

### Phase 1: Discovery & Inventory
- Catalogue all Avalonia-related files, dependencies, and build tasks.
- Identify scripts (PowerShell, npm, CI) referencing Avalonia or `.NET` tooling.
- Capture documentation pages that describe Avalonia workflows.
- Produce before-state git diff snapshots for verification.

### Phase 2: Removal & Cleanup
- Delete Avalonia project directories, build artifacts, and solution entries.
- Strip Avalonia references from solution files, `MyPal.sln`, and root README.
- Update automation (`AUTORUN.ps1`, `scripts/`, CI) to ensure no Avalonia tasks remain.
- Remove NuGet package caches and dotnet-specific gitignore rules that no longer apply.

### Phase 3: Test Expansion
- Backend: Add coverage for chat flow, profile management, memory persistence, and error handling.
- Frontend: Introduce regression tests (e.g., Playwright or Vitest + jsdom) for key views.
- Desktop shell: Verify Tauri startup scripts via integration smoke test.
- Establish minimum coverage thresholds and integrate with CI reporting.

### Phase 4: Logging Enhancements
- Audit backend logging to ensure consistent structured messages (levels, context IDs).
- Introduce opt-in verbose logging for development diagnostics.
- Document logging guidelines and retention expectations.

### Phase 5: Repository Reorganization
- Promote `app/desktop/tauri-app` as the sole desktop entry in docs and structure diagrams.
- Relocate any shared desktop assets (icons, preload scripts) into a neutral location.
- Update project structure documentation and diagrams to mirror the simplified stack.

### Phase 6: Documentation Refresh
- Rewrite `.github/instructions/mypalinstructions.instructions.md` to align with Tauri stack.
- Update all references to Avalonia in README, quick starts, migration guides, and AGENT docs.
- Archive or delete Avalonia design documents, replacing them with Tauri/SPA guidance.

### Phase 7: Validation & Release Prep
- Run full test suite (backend, frontend, linting, integration) on clean checkout.
- Smoke test AUTORUN workflow and manual Tauri launch on Windows.
- Prepare changelog entry summarizing the refactor impact.
- Coordinate branch merge strategy (squash vs. rebase) once validation is complete.

## Risks & Mitigations
- **Risk:** Hidden Avalonia references in scripts/CI cause build failures.
  - *Mitigation:* Grep for `Avalonia`, `.csproj`, `dotnet` across repo; run CI dry runs.
- **Risk:** Test expansion increases runtime significantly.
  - *Mitigation:* Parallelize test suites; tag slow tests; adjust CI caching.
- **Risk:** Logging changes flood local storage.
  - *Mitigation:* Set sane defaults, document retention, add log rotation.

## Deliverables
- Clean repository without Avalonia artifacts.
- Enhanced automated test coverage (documented metrics).
- Updated logging configuration and documentation.
- Revised project documentation reflecting the streamlined architecture.
- Changelog entry summarizing the refactor.
