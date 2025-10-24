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
**Project Number**: `5` | **Owner**: `ScottyVenable`

After every substantial change, create or update project items using GitHub CLI. All tasks, bugs, features, and refactors must be tracked on the board with proper metadata. This section uses **Projects v2** terminology (project number, owner, project ID, item ID, field ID).

---

### Prerequisites & Authentication

**Required**: GitHub CLI installed and authenticated with `project` scope.

```powershell
# Check authentication and scopes
gh auth status

# If 'project' scope missing, refresh token
gh auth refresh -s project
```

**Verify Setup**:
- ✅ GitHub CLI version 2.0+ (`gh --version`)
- ✅ Authenticated with token that has `project` scope
- ✅ Access to project `ScottyVenable/5`

---

### Creating Draft Items

Use `gh project item-create <project-number> --owner <owner>` to create draft items. These become trackable tasks on the board.

**Basic Syntax**:
```powershell
gh project item-create 5 --owner ScottyVenable `
  --title "Brief task description" `
  --body "Optional detailed description"
```

**With Markdown Body** (PowerShell multi-line string):
```powershell
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

## Files to Modify
- ``path/to/file1.js`` - Changes needed
- ``path/to/file2.rs`` - Changes needed

## Testing Strategy
- Unit tests: What to test
- Integration tests: Integration points
- Manual QA: Verification steps

## Dependencies
- Blocks: Other items blocked by this
- Depends on: Items this depends on

## Notes
Additional context, gotchas, references.
"@

gh project item-create 5 --owner ScottyVenable `
  --title "[TYPE] Brief action-oriented description" `
  --body $body
```

**Important**: Use double backticks (` `` `) around code/paths in PowerShell strings to prevent interpretation.

**Output Formatting**:
```powershell
# JSON output with selected fields
gh project item-create 5 --owner ScottyVenable --title "New task" `
  --format json --jq '.id'

# Capture item ID for immediate field updates
$itemId = gh project item-create 5 --owner ScottyVenable --title "New task" `
  --format json --jq '.id' | ConvertFrom-Json
```

---

### Editing Project Items

**Critical**: For project items (non-draft issues), **update only ONE field per `gh project item-edit` call** and include `--project-id`.

#### Field Type Flags

Choose the correct value flag based on field type:

| Field Type | Flag | Example |
|------------|------|---------|
| **Text** | `--text "<value>"` | `--text "In review"` |
| **Number** | `--number <value>` | `--number 8` |
| **Date** | `--date <value>` | `--date "2025-10-24"` (YYYY-MM-DD) |
| **Single-select** | `--single-select-option-id <id>` | `--single-select-option-id "abc123"` |
| **Clear field** | `--clear` | `--clear` |

#### Basic Edit Pattern

```powershell
# Set text field
gh project item-edit --id <ITEM_ID> --field-id <FIELD_ID> --project-id 5 --text "New value"

# Set number field
gh project item-edit --id <ITEM_ID> --field-id <FIELD_ID> --project-id 5 --number 10

# Set date field (YYYY-MM-DD format)
gh project item-edit --id <ITEM_ID> --field-id <FIELD_ID> --project-id 5 --date "2025-10-24"

# Clear a field
gh project item-edit --id <ITEM_ID> --field-id <FIELD_ID> --project-id 5 --clear
```

#### Draft Issue Updates

For draft issues, update title/body **without** `--project-id`:

```powershell
# Update draft title
gh project item-edit --id <ITEM_ID> --title "New title"

# Update draft body
gh project item-edit --id <ITEM_ID> --body "Updated description"
```

#### MyPal Project Fields

Our project uses these custom fields (update one per call):

| Field Name | Type | Example Values | Flag |
|------------|------|----------------|------|
| **Status** | Single-select | `Todo`, `In Progress`, `Done`, `Backlog` | `--field-id <id> --single-select-option-id <option-id>` |
| **Priority** | Single-select | `P0`, `P1`, `P2`, `P3` | `--field-id <id> --single-select-option-id <option-id>` |
| **Size** | Single-select | `XS`, `S`, `M`, `L`, `XL` | `--field-id <id> --single-select-option-id <option-id>` |
| **Estimate** | Number | `1`, `2`, `5`, `8`, `13` | `--field-id <id> --number <value>` |
| **Iteration** | Text | `v1.1-sprint-1`, `v1.2-sprint-2` | `--field-id <id> --text "<value>"` |
| **Start date** | Date | `2025-10-24` | `--field-id <id> --date "YYYY-MM-DD"` |
| **End date** | Date | `2025-10-30` | `--field-id <id> --date "YYYY-MM-DD"` |

**Note**: Field and option IDs are UUIDs. Query with `gh project field-list` and `gh project item-list` to get exact IDs.

---

### Listing & Querying Items

**Basic List**:
```powershell
# List all items
gh project item-list 5 --owner ScottyVenable

# Limit results
gh project item-list 5 --owner ScottyVenable --limit 20
```

**JSON Output with Selected Fields**:
```powershell
# Select specific fields
gh project item-list 5 --owner ScottyVenable --json id,title,updatedAt

# Extract item IDs only
gh project item-list 5 --owner ScottyVenable --json id --jq '.[].id'

# Filter by title pattern (using jq)
gh project item-list 5 --owner ScottyVenable --json id,title `
  --jq '.[] | select(.title | contains("FEATURE"))'
```

**Go Template Formatting**:
```powershell
# Pretty table with timeago helper
gh project item-list 5 --owner ScottyVenable --json title,updatedAt `
  --template '{{range .}}{{tablerow .title (timeago .updatedAt)}}{{end}}{{tablerender}}'

# Custom format with hyperlinks
gh project item-list 5 --owner ScottyVenable --json title,url `
  --template '{{range .}}{{hyperlink .title .url}}{{"\n"}}{{end}}'
```

**Available Template Helpers**: `tablerow`, `tablerender`, `timeago`, `hyperlink`, `color`, `autocolor`, `pluck`, `join`. See `gh help formatting` for full reference.

---

### End-to-End Workflow Example

Complete workflow: create item → capture ID → set fields → verify.

```powershell
# Step 1: Create draft item with structured body
$body = @"
## Objective
Implement local AI model loading for offline conversations.

## Acceptance Criteria
- [ ] Backend loads GGML models from ``models/`` directory
- [ ] UI shows available models in Settings
- [ ] Chat works offline with selected model

## Technical Approach
1. **Backend**: Integrate ``@llama-node/llama-cpp``
2. **Frontend**: Add model selector dropdown
3. **Memory**: Monitor RAM usage, implement pooling

## Files to Modify
- ``app/backend/src/ai/modelManager.js`` - New service
- ``app/frontend/app.js`` - UI updates

## Testing Strategy
- Unit tests: Model loading/unloading
- Integration tests: End-to-end offline chat
- Manual QA: Load 3 models, verify switching
"@

# Create and capture item ID
$itemId = (gh project item-create 5 --owner ScottyVenable `
  --title "[FEATURE] Offline local AI model support" `
  --body $body `
  --format json | ConvertFrom-Json).id

Write-Host "Created item: $itemId"

# Step 2: Set fields (one per call, requires field IDs)
# Note: Get field IDs with `gh project field-list 5 --owner ScottyVenable --format json`

# Set Status to "Todo" (example field ID and option ID - query actual IDs)
gh project item-edit --id $itemId --field-id "PVTF_field123" --project-id 5 `
  --single-select-option-id "option_todo_id"

# Set Priority to "P1" (example IDs)
gh project item-edit --id $itemId --field-id "PVTF_field456" --project-id 5 `
  --single-select-option-id "option_p1_id"

# Set Estimate to 10 points
gh project item-edit --id $itemId --field-id "PVTF_field789" --project-id 5 `
  --number 10

# Set Start date
gh project item-edit --id $itemId --field-id "PVTF_fieldStart" --project-id 5 `
  --date "2025-10-24"

# Step 3: Verify updates
gh project item-list 5 --owner ScottyVenable --json id,title,Status,Priority `
  --jq ".[] | select(.id == \"$itemId\")"
```

---

### Title Format Standards

Structure: `[TYPE] Brief action-oriented description` (<80 chars)

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

---

### Body Markdown Templates

#### Feature Template
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
- **Blocks**: Items blocked by this work
- **Depends on**: Items this depends on
- **Related**: Loosely related work

## Notes
- Edge cases to consider
- Performance implications
- Security considerations
- Links to external resources
```

#### Bug Template
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
- [List affected files with line numbers if known]

## Testing Strategy
- **Reproduction**: Steps to trigger original bug
- **Verification**: Steps to confirm fix
- **Regression**: Automated test to prevent recurrence
```

#### Refactor Template
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

---

### Status Update Patterns

**Starting Work**:
```powershell
gh project item-edit --id <ITEM_ID> --field-id <STATUS_FIELD_ID> --project-id 5 `
  --single-select-option-id <IN_PROGRESS_OPTION_ID>

gh project item-edit --id <ITEM_ID> --field-id <START_DATE_FIELD_ID> --project-id 5 `
  --date "2025-10-24"
```

**Marking Complete**:
```powershell
gh project item-edit --id <ITEM_ID> --field-id <STATUS_FIELD_ID> --project-id 5 `
  --single-select-option-id <DONE_OPTION_ID>

gh project item-edit --id <ITEM_ID> --field-id <END_DATE_FIELD_ID> --project-id 5 `
  --date "2025-10-30"
```

**Blocking/Dependency Links**: Use item body markdown to reference related items (e.g., `Depends on: #234`). GitHub will auto-link when item is converted to issue.

---

### Best Practices

1. **Create items immediately** when work is identified (don't batch)
2. **Use templates** for consistency (feature, bug, refactor)
3. **Update ONE field per edit call** (Projects v2 requirement)
4. **Query field/option IDs** before setting single-select fields
5. **Update status frequently** (daily for active items)
6. **Keep titles concise** (<80 chars) but descriptive
7. **Use checkboxes** in acceptance criteria for trackability
8. **Include file paths** with backticks in bodies
9. **Set realistic estimates** based on historical velocity
10. **Document blockers** in Dependencies section
11. **Use `--format json` and `--jq`** for automation/scripting
12. **Verify changes** with `item-list` after bulk updates

---

### Troubleshooting

**Permission denied**: 
```powershell
gh auth status          # Check current scopes
gh auth refresh -s project   # Add project scope
```

**Cannot set field**: 
- Get field ID: `gh project field-list 5 --owner ScottyVenable --format json`
- Get option ID (for single-select): Check field's options in JSON output
- Ensure field name/type matches (text vs number vs date vs single-select)

**Body not rendering**: 
- Use double backticks (` `` `) for inline code in PowerShell strings
- Escape special characters in heredoc strings
- Verify markdown syntax with online parsers

**Item not appearing**: 
- Verify project number (5) and owner (ScottyVenable)
- Check if item was created as draft vs issue
- Query with `--format json` to see all item metadata

**Multiple field updates fail**:
- Update **only one field per `gh project item-edit` call**
- Use separate commands for each field (Status, Priority, Size, etc.)

**Date format errors**:
- Use strict `YYYY-MM-DD` format (e.g., `2025-10-24`)
- No timestamps or alternate formats allowed

---

### Quick Reference Commands

```powershell
# Authentication & setup
gh auth status
gh auth refresh -s project

# Create item
gh project item-create 5 --owner ScottyVenable --title "[TYPE] Description" --body "Details"

# List items (JSON)
gh project item-list 5 --owner ScottyVenable --json id,title,updatedAt

# Get item IDs matching pattern
gh project item-list 5 --owner ScottyVenable --json id,title --jq '.[] | select(.title | contains("FEATURE")) | .id'

# Edit field (one per call)
gh project item-edit --id <ID> --field-id <FIELD_ID> --project-id 5 --text "value"
gh project item-edit --id <ID> --field-id <FIELD_ID> --project-id 5 --number 10
gh project item-edit --id <ID> --field-id <FIELD_ID> --project-id 5 --date "2025-10-24"
gh project item-edit --id <ID> --field-id <FIELD_ID> --project-id 5 --single-select-option-id <OPTION_ID>

# List fields (get IDs)
gh project field-list 5 --owner ScottyVenable --format json

# Format output with templates
gh project item-list 5 --owner ScottyVenable --json title,updatedAt `
  --template '{{range .}}{{tablerow .title (timeago .updatedAt)}}{{end}}{{tablerender}}'

# Help documentation
gh help formatting
gh project item-create --help
gh project item-edit --help
```

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

This is a living document and must be maintained regularly to ensure accuracy and relevance.
