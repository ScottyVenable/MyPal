# GitHub Issue Creation Request Template

## File Naming Convention
**Saved as:** `[bug]--telemetry-write-failures-windows-sandbox.md`

## Issue Information
**Title:** Intermittent telemetry write failures on Windows sandboxed installs  
**Type:** Bug Report  
**Priority:** Medium  
**Labels:** bug, backend, logging

## Description
Telemetry logging intermittently fails on Windows environments where the filesystem is sandboxed or write-restricted. The logger attempts to append to telemetry files but loses events when access is denied.

## Context
**Related Files/Components:**
- [ ] Mobile App (`/mobile`)
- [x] Backend Server (`/app/backend`)
- [ ] Frontend (`/app/frontend`)
- [ ] AI/LLM Integration
- [x] Database/Storage
- [ ] Documentation
- [ ] Other: ___________

**Current Behavior:**
When the backend runs inside a sandboxed installation (e.g., corporate restrictions, MSIX sandbox), attempts to write `telemetry.log` fail, resulting in missing telemetry records.

**Expected Behavior:**
Telemetry logging should gracefully handle restricted paths, falling back to a writable directory or buffering until writes succeed.

## Reproduction Steps
1. Install MyPal in a sandboxed Windows environment with restricted write permissions.
2. Launch the application and trigger telemetry events (chat interactions, navigation events).
3. Monitor `telemetry.log` and application console output.
4. Observe intermittent write failures or missing telemetry entries.

## Acceptance Criteria
- [ ] Backend detects when telemetry writes fail due to permission issues.
- [ ] Application falls back to a user-writable path or retry mechanism.
- [ ] Logging confirms telemetry events persist successfully in sandboxed installs.

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
- Files: `app/backend/src/server.js`, logging utilities in `app/backend/src`
- Functions/Components: Telemetry logger, `logTelemetry`
- Line Numbers: To be investigated during fix

## Implementation Notes
**Suggested Approach:**
Wrap telemetry writes with permission checks and fallback path logic (e.g., user AppData). Implement exponential backoff or buffered queue when immediate writes fail. Provide diagnostic logging when falling back.

**Potential Challenges:**
Handling asynchronous writes without blocking request processing, ensuring fallback paths remain user-accessible.

**Dependencies:**
None identified.

## GitHub CLI Command
```bash
gh issue create \
  --title "Intermittent telemetry write failures on Windows sandboxed installs" \
  --body-file "issues/[bug]--telemetry-write-failures-windows-sandbox.md" \
  --label "bug,backend,logging" \
  --assignee "ScottyVenable"
```

## Additional Information
**References:**
- Related Issues: TODO – link after issue creation
- Documentation: `LOGGING_GUIDE.md`
- External Resources: Windows documentation on MSIX sandbox file access

**Screenshots/Mockups:**
Not applicable.
