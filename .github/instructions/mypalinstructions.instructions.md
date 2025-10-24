---
applyTo: '**'
---
# MyPal AI Companion  Copilot Instructions (Tauri/Desktop Focus)

MyPal is a local-first AI companion featuring a vanilla JavaScript SPA, a Node.js/Express backend, and a lightweight Tauri 2.0 desktop shell. The Avalonia and Electron stacks are retired; do not reference or rebuild them. Development must center on the SPA + backend + Tauri workflow.

## Architecture Overview
- `app/backend`  Node.js (ESM) server. Provides REST/WebSocket APIs, manages JSON data, orchestrates AI pipelines.
- `app/frontend`  Vanilla JS single-page app consumed by both desktop and browser modes.
- `app/desktop/tauri-app`  Tauri shell with Rust entry (`src-tauri/src/main.rs`) and config (`tauri.conf.json`). Wraps the SPA and coordinates with the backend.
- `mobile`  React Native prototype (future). Keep TypeScript strict settings enabled.
- `docs`  Authoritative specs. Update when workflows or architecture change.
- `Developer Files/`  Local runtime logs/output (gitignored).

## Environment & Tooling
- Node.js 18+ (backend/frontend + Tauri npm scripts).
- Rust toolchain with Tauri prerequisites (MSVC on Windows, etc.).
- PowerShell 5+ for automation scripts (bash usable but less maintained).
- Optional: Playwright or Vitest for frontend automation; ensure dependencies documented.

## Daily Workflow (Desktop Focus)
1. Install deps:
   - `cd app/backend && npm install`
   - `cd ../desktop/tauri-app && npm install`
2. Launch via `./AUTORUN.ps1` (starts backend then `npm run dev` for Tauri) **or** start backend (`npm run dev`) and Tauri shell (`npm run dev`) in separate terminals.
3. Backend listens on `http://localhost:31337` (default); Tauri proxy serves SPA.
4. Logs stream to `Developer Files/logs/`; inspect during development.

## Testing Expectations
- **Backend**: `npm test` (Node test runner). Cover AI interactions, profile persistence, error paths.
- **Frontend**: Add/maintain regression tests (Vitest/Playwright) when modifying SPA logic.
- **Desktop**: After significant changes, run `npm run build` in `app/desktop/tauri-app` to ensure native packaging still works.
- Document manual QA steps in `docs/development/` when automation is insufficient.

## Code Standards
### Backend
- Use ESM (`import`/`export`). No CommonJS.
- Prefer async/await with structured logging (avoid bare `console.log`).
- Keep configuration in dedicated modules or env vars; never commit secrets.
- Update prompt templates/tests whenever AI flow changes.

### Frontend
- Maintain modular JS under `app/frontend/js/`; avoid global pollution.
- Keep styling in `app/frontend/styles.css` with CSS variables for theme tokens.
- Ensure compatibility with WebView (no Node-specific APIs).

### Tauri (Rust + Config)
- `main.rs` should remain minimal: window lifecycle, system tray, backend health checks.
- When adding plugins, update `Cargo.toml`, `tauri.conf.json`, and document prerequisites.
- Keep native dependencies lightweight to preserve bundle size.

## Documentation Duties
- Update `README.md`, `PROJECT_STRUCTURE.md`, and related docs whenever architecture or scripts change.
- Archive/remove Avalonia-specific documents; replace with Tauri-focused guidance.
- Record technical plans in `docs/development/` (e.g., refactor strategies, migration notes).
- Maintain `CHANGELOG.md` entries for every release/refactor.
- After every substantial change, sync the project board at `https://github.com/users/ScottyVenable/projects/5/views/1` using GitHub CLI.

## GitHub Project Board Management
**Project URL**: `https://github.com/users/ScottyVenable/projects/5/views/1`

After every substantial change, create or update project items using GitHub CLI. All tasks, bugs, features, and refactors must be tracked on the board with proper metadata.

### Creating Project Items

Use `gh project item-create` with the following structure:

```powershell
# PowerShell multi-line string syntax for body
$body = @"
## Objective
[1-2 sentence summary of the task]

## Background
[Context and reasoning]

## Acceptance Criteria
- [ ] Specific outcome 1
- [ ] Specific outcome 2
- [ ] Specific outcome 3

## Technical Approach
1. **Step 1**: Implementation detail
2. **Step 2**: Implementation detail
3. **Step 3**: Implementation detail

## Files to Modify
- ``path/to/file1.js`` - Changes needed
- ``path/to/file2.rs`` - Changes needed

## Testing Strategy
- Unit tests: What to test
- Integration tests: Integration points
- Manual QA: Verification steps

## Dependencies
- Blocks: #123
- Depends on: #456

## Notes
Additional context, gotchas, references.
"@

gh project item-create 5 --owner ScottyVenable `
  --title "[TYPE] Brief description" `
  --body $body
```

**Important**: Use double backticks (` `` `) around code/paths in the body to prevent PowerShell interpretation.

### Required Fields

Set these fields immediately after item creation using `gh project item-edit`:

| Field | Values | Description |
|-------|--------|-------------|
| **Status** | `Todo`, `In Progress`, `Done`, `Backlog` | Current work state |
| **Priority** | `P0` (Critical), `P1` (High), `P2` (Medium), `P3` (Low) | Urgency level |
| **Size** | `XS` (1-2h), `S` (half-day), `M` (1-2d), `L` (3-5d), `XL` (1-2wk) | Effort estimate |
| **Estimate** | Numeric (hours or points) | Story points or time estimate |
| **Iteration** | `v1.1-sprint-1`, `v1.2-sprint-2` | Sprint/milestone ID |
| **Start date** | `YYYY-MM-DD` | When work begins |
| **End date** | `YYYY-MM-DD` | Target completion |
| **Assignees** | GitHub username | Who owns this (optional) |

**Note**: Field names with spaces must be quoted: `--field "Start date"="2025-10-24"`

### Title Format

Structure: `[TYPE] Brief action-oriented description`

**Type Prefixes**:
- `[FEATURE]` - New functionality
- `[BUG]` - Defect fix
- `[REFACTOR]` - Code improvement without behavior change
- `[DOCS]` - Documentation update
- `[TEST]` - Test addition/improvement
- `[TAURI]` - Desktop shell work
- `[GITHUB]` - Repository/CI/CD work

**Examples**:
- `[FEATURE] Implement offline AI model support`
- `[BUG] Fix duplicate message race condition`
- `[REFACTOR] Migrate backend to TypeScript`
- `[DOCS] Update API reference for v1.1`

### Body Markdown Format

The `--body` must use proper Markdown for readability in the GitHub UI:

#### Required Sections

```markdown
## Objective
Clear, concise statement of what needs to be done (1-2 sentences).

## Background
Why is this needed? What problem does it solve? How does it fit the roadmap?

## Acceptance Criteria
- [ ] Testable outcome 1
- [ ] Testable outcome 2
- [ ] Testable outcome 3

## Technical Approach
1. **Component/Area 1**: Specific implementation details
2. **Component/Area 2**: Specific implementation details
3. **Component/Area 3**: Specific implementation details

## Files to Modify
- ``app/frontend/app.js`` - Add feature X, refactor Y
- ``app/backend/src/server.js`` - Implement endpoint Z
- ``docs/API.md`` - Document new routes

## Testing Strategy
- **Unit tests**: What behavior to verify
- **Integration tests**: What system interactions to validate
- **Manual QA**: Step-by-step verification procedure

## Dependencies
- **Blocks**: #123 (list items blocked by this)
- **Depends on**: #456 (list items this depends on)
- **Related**: #789 (loosely related work)

## Notes
- Edge cases to consider
- Performance implications
- Security considerations
- Links to external resources
```

#### Optional Sections (add as needed)

```markdown
## Risk Assessment
- **High**: Risk description and mitigation
- **Medium**: Risk description and mitigation

## Timeline Breakdown
- Week 1: Phase 1 tasks
- Week 2: Phase 2 tasks

## Resources
- [Design doc](link)
- [API spec](link)
- [Research notes](link)
```

### Complete Example

```powershell
$body = @"
## Objective
Add support for loading local LLM models (GGML format) to enable fully offline AI conversations without external API dependencies.

## Background
Users want privacy-first AI interactions without cloud services. Local models eliminate API costs, reduce latency, and enable offline usage. This is a core differentiator for MyPal v1.1.

## Acceptance Criteria
- [ ] Backend can load GGML model files from ``models/`` directory
- [ ] UI displays available models and allows selection
- [ ] Chat works offline with selected local model
- [ ] Model switching doesn't lose conversation context
- [ ] Settings panel shows model memory usage

## Technical Approach
1. **Backend Integration**: Use ``@llama-node/llama-cpp`` for GGML support
2. **Model Management**: Create ``ModelManager`` service for loading/unloading
3. **UI Updates**: Add model selector dropdown in Settings tab
4. **Context Handling**: Serialize conversation history for model switches
5. **Memory Management**: Monitor RAM usage, implement model pooling

## Files to Modify
- ``app/backend/src/ai/modelManager.js`` - Create new service
- ``app/backend/src/ai/modelAdapter.js`` - Add GGML adapter
- ``app/frontend/app.js`` - Add model selector UI
- ``app/frontend/index.html`` - Settings tab updates
- ``docs/AI_SETUP_GUIDE.md`` - Document model installation

## Testing Strategy
- **Unit tests**: ModelManager load/unload, memory tracking
- **Integration tests**: End-to-end chat with local model
- **Manual QA**: Load 3 different models, verify switching, check memory

## Dependencies
- **Depends on**: #234 (Backend refactor for plugin architecture)
- **Related**: #567 (Performance optimization for large contexts)

## Notes
- Initial support for LLaMA 2 7B and Mistral 7B models
- Recommend 16GB RAM minimum for smooth performance
- Consider implementing model quantization (4-bit) for lower memory
- Add warning if system RAM < 8GB
"@

gh project item-create 5 --owner ScottyVenable `
  --title "[FEATURE] Implement offline local LLM support" `
  --body $body
```

Then set fields:
```powershell
# Get the item ID from previous command output, or query:
# gh project item-list 5 --owner ScottyVenable --format json | jq

gh project item-edit --id <ITEM_ID> --project-id 5 --owner ScottyVenable `
  --field Status="Todo" `
  --field Priority="P1" `
  --field Size="XL" `
  --field Estimate="10" `
  --field Iteration="v1.1-sprint-1" `
  --field "Start date"="2025-10-24" `
  --field "End date"="2025-11-07"
```

### Updating Items

As work progresses, update status and dates:

```powershell
# Start work
gh project item-edit --id <ITEM_ID> --project-id 5 --owner ScottyVenable `
  --field Status="In Progress" `
  --field "Start date"="2025-10-25"

# Mark complete
gh project item-edit --id <ITEM_ID> --project-id 5 --owner ScottyVenable `
  --field Status="Done" `
  --field "End date"="2025-10-30"
```

### Common Patterns

**Bug Template**:
```markdown
## Objective
Fix [brief description of bug].

## Background
Bug report: [symptoms]. Affects [users/features].

## Acceptance Criteria
- [ ] Bug no longer reproduces
- [ ] Root cause identified and fixed
- [ ] Regression test added
- [ ] Related edge cases verified

## Technical Approach
1. **Root Cause**: [Analysis]
2. **Fix**: [Implementation]
3. **Prevention**: [How to avoid similar bugs]

## Files to Modify
- [List affected files]

## Testing Strategy
- **Reproduction**: Steps to trigger original bug
- **Verification**: Steps to confirm fix
- **Regression**: Automated test to prevent recurrence
```

**Refactor Template**:
```markdown
## Objective
Improve [component] by [refactoring goal].

## Background
Current code has [issues]. Refactoring will [benefits].

## Acceptance Criteria
- [ ] Behavior unchanged (all tests pass)
- [ ] Code quality improved ([metrics])
- [ ] Documentation updated
- [ ] Performance maintained or improved

## Technical Approach
1. **Analysis**: Current state assessment
2. **Plan**: Step-by-step transformation
3. **Validation**: How to ensure correctness

## Files to Modify
- [List files to refactor]

## Testing Strategy
- **Baseline**: Run full test suite before changes
- **Incremental**: Test after each refactor step
- **Final**: Verify no behavior changes
```

### Best Practices

1. **Create items immediately** when work is identified (don't batch)
2. **Use templates** for consistency (bug, feature, refactor)
3. **Link related items** using `#issue-number` syntax
4. **Update status frequently** (daily for active items)
5. **Keep titles concise** (<80 chars) but descriptive
6. **Use checkboxes** in acceptance criteria for trackability
7. **Include file paths** with backticks for code references
8. **Set realistic estimates** based on historical velocity
9. **Document blockers** in Dependencies section
10. **Add notes** for context that doesn't fit other sections

### Troubleshooting

**Cannot set field**: Ensure field name exactly matches project configuration (case-sensitive, spaces quoted)

**Body not rendering**: Use double backticks (` `` `) for inline code in PowerShell strings

**Item not appearing**: Verify project ID (5) and owner (ScottyVenable) are correct

**Permission denied**: Ensure GitHub CLI is authenticated (`gh auth status`)

## Git Workflow
- Branch naming: `feature/...`, `bugfix/...`, `refactor/...`, `patch/...`.
- Commit format: `[TYPE] Brief description`, `TYPE  {BUGFIX, FEATURE, PATCH, REFACTOR, DOCS, TEST, TAURI, GITHUB}`.
- Keep commits atomic; run tests/linters before committing.
- Issues live in `/issues/*.md`; sync with GitHub using template instructions.

## Logging & Diagnostics
- Backend logs should use structured helpers (include profile/context IDs).
- Document any log level or rotation changes.
- Tauri logs accessible via devtools; ensure instructions exist when adding new logging surfaces.

## Security & Privacy
- Offline-first by default; no telemetry unless explicitly toggled.
- Store dev data in `dev-data/`; production shell uses OS app data (`%APPDATA%/MyPal`).
- Sanitize all user inputs, especially when persisted or fed into prompts.
- Never commit user-generated data or secrets.

## Review Checklist
-  Backend tests (`npm test`) pass.
-  Frontend/desktop build commands (`npm run build`, lint/tests) succeed.
-  Docs updated for workflow changes.
-  Logging changes are intentional and documented.
-  No references to Avalonia/Electron remain outside historical notes.

Keep this file updated as the Tauri stack evolves. Any new platform additions must include tooling prerequisites, documentation updates, and test coverage plans.
