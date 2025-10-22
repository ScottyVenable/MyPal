# GitHub Issue Creation Request Template

## File Naming Convention
**Saved as:** `[bug]--chat-race-condition-on-save.md`

## Issue Information
**Title:** Race condition when multiple chats arrive before data save completes  
**Type:** Bug Report  
**Priority:** High  
**Labels:** bug, backend, data-integrity

## Description
Rapid or concurrent chat submissions can overlap while profile data persists to disk. Because JSON writes are not serialized, state snapshots interleave, leading to inconsistent files or lost updates.

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
When multiple chats are processed before the previous `saveCollections` call finishes, file writes collide. The resulting profile data can be partially written, out of order, or missing updates.

**Expected Behavior:**
All chat messages should persist deterministically; concurrent requests must be serialized or otherwise prevented from corrupting profile files.

## Reproduction Steps
1. Start the MyPal backend server.
2. Connect via the UI or API and send multiple chat messages in rapid succession (or from parallel clients).
3. Inspect the resulting profile JSON files and server logs after the burst of messages.
4. Observe inconsistent or stale data caused by overlapping saves.

## Acceptance Criteria
- [ ] Backend serializes or queues writes to profile JSON files.
- [ ] Stress test covering concurrent chat submissions passes without data corruption.
- [ ] Logging confirms when write collisions are prevented.

## Technical Details
**Environment:**
- OS: Windows 10/11
- App Version: v0.2.0-alpha (current)
- Node.js Version: 18.x
- React Native Version: N/A

**Error Messages/Logs:**
```
Occasional JSON parse errors or truncated files when race condition occurs.
```

**Code References:**
- Files: `app/backend/src/server.js`, `app/backend/src/profileManager.js`
- Functions/Components: `saveCollections`, chat handling endpoints
- Line Numbers: To be determined during fix

## Implementation Notes
**Suggested Approach:**
Introduce a per-profile write queue or mutex around `saveCollections`. Alternatively, adopt atomic write patterns (write to temp file then rename) or migrate to a transactional storage layer. Add integration tests simulating concurrent requests.

**Potential Challenges:**
Ensuring performance remains acceptable with serialized writes, especially on large profiles.

**Dependencies:**
None identified.

## GitHub CLI Command
```bash
gh issue create \
  --title "Race condition when multiple chats arrive before data save completes" \
  --body-file "issues/[bug]--chat-race-condition-on-save.md" \
  --label "bug,backend,data-integrity" \
  --assignee "ScottyVenable"
```

## Additional Information
**References:**
- Related Issues: TODO – add link post creation
- Documentation: `LOGGING_GUIDE.md`
- External Resources: N/A

**Screenshots/Mockups:**
Not applicable.
