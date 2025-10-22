# GitHub Issue Creation Request Template

## File Naming Convention
**Saved as:** `[bug]--telemetry-write-failures-windows-sandbox.md`

## Issue Information
**Title:** Intermittent telemetry write failures on Windows sandboxed installs
**Type:** Bug Report
**Priority:** Medium
**Labels:** bug, backend, logging

## Description
Telemetry logging intermittently fails on Windows environments with sandboxed or restricted write permissions. When telemetry attempts to append to `telemetry.log`, events are dropped because the backend lacks access to the target path.

## Context
**Related Files/Components:**
- [ ] Mobile App (`/mobile`)
- [x] Backend Server (`/app/backend`)
- [ ] Frontend (`/app/frontend`)
- [ ] AI/LLM Integration
- [x] Database/Storage
- [ ] Documentation
- [ ] Testing
- [ ] Security
- [ ] Other: ___________

**Current Behavior:** (for bugs)
Telemetry writes fail with EPERM/permission errors, causing loss of telemetry data.

**Expected Behavior:** (for bugs/enhancements)
Telemetry should safely write to a user-accessible location or fall back gracefully if the primary path is restricted.

## Reproduction Steps (for bugs)
1. Install MyPal in a sandboxed Windows environment (corporate lockdown, MSIX sandbox, etc.).
2. Launch the app and trigger telemetry events (chat, navigation).
3. Observe telemetry logs; entries intermittently fail.

## Acceptance Criteria (for features/enhancements)
- [ ] Backend detects permission failures and chooses a writable fallback path.
- [ ] Retry or buffer strategy prevents silent data loss.
- [ ] Diagnostics surface telemetry health state to developers.

## Technical Details
**Environment:**
- OS: Windows 10/11 (sandboxed install)
- App Version: v0.2.0-alpha (current)
- Node.js Version: 18.x
- React Native Version: N/A

**Error Messages/Logs:**
```
Error: EPERM: operation not permitted, open 'C:\Program Files\MyPal\logs\telemetry.log'
```

**Code References:**
- Files: app/backend/src/server.js
- Functions/Components: logTelemetry, telemetry logger
- Line Numbers: Confirm during patch

## Implementation Notes
**Suggested Approach:**
Wrap telemetry writes with permission checks, select user-writable fallback paths, and add logging for degraded states.

**Potential Challenges:**
Balancing telemetry reliability with security constraints in restricted environments.

**Dependencies:**
None identified.

## GitHub CLI Command
```bash
gh issue create \
  --title "Intermittent telemetry write failures on Windows sandboxed installs" \
  --body-file "issues/bugs/[bug]--telemetry-write-failures-windows-sandbox.md" \
  --label "bug" \
  --label "backend" \
  --label "logging" \
  --assignee "ScottyVenable"
```

## Additional Information
**References:**
- Related Issues: TODO – link after creation
- Documentation: LOGGING_GUIDE.md
- External Resources: Windows documentation on restricted file access

**Screenshots/Mockups:**
Attach relevant log excerpts when available.
