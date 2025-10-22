# GitHub Issue Creation Request Template

## File Naming Convention
**Saved as:** `[bug]--journal-focus-duplicate-keywords.md`

## Issue Information
**Title:** Duplicate keyword echoing in journal focus selection
**Type:** Bug Report
**Priority:** Medium
**Labels:** bug, frontend, ui

## Description
Selecting a focus keyword in the Journal tab renders the keyword twice (for example, “gratitude gratitude”). The duplicate display confuses users and diminishes the value of the focus feature.

## Context
**Related Files/Components:**
- [ ] Mobile App (`/mobile`)
- [ ] Backend Server (`/app/backend`)
- [x] Frontend (`/app/frontend`)
- [ ] AI/LLM Integration
- [ ] Database/Storage
- [ ] Documentation
- [ ] Testing
- [ ] Security
- [ ] Other: ___________

**Current Behavior:** (for bugs)
UI displays the chosen focus keyword twice after selection.

**Expected Behavior:** (for bugs/enhancements)
Each selected keyword should appear only once in the UI.

## Reproduction Steps (for bugs)
1. Navigate to the Journal tab with entries that include focus keywords.
2. Choose a keyword from the focus selector.
3. Observe the keyword rendered twice in the UI.

## Acceptance Criteria (for features/enhancements)
- [ ] Focus selection handler appends the keyword only once.
- [ ] UI deduplicates focus keywords before rendering.
- [ ] Automated or manual UI test verifies the keyword appears a single time.

## Technical Details
**Environment:**
- OS: Windows 10/11
- App Version: v0.2.0-alpha (current)
- Node.js Version: 18.x
- React Native Version: N/A

**Error Messages/Logs:**
```
No console errors; issue is visual.
```

**Code References:**
- Files: app/frontend/app.js, app/frontend/index.html, app/frontend/styles.css
- Functions/Components: Journal focus selector
- Line Numbers: Identify while fixing

## Implementation Notes
**Suggested Approach:**
Ensure the selection handler does not push duplicates, add deduplication before render, and write a regression test.

**Potential Challenges:**
Avoid removing legitimate repeated entries elsewhere in the journal UI.

**Dependencies:**
None.

## GitHub CLI Command
```bash
gh issue create \
  --title "Duplicate keyword echoing in journal focus selection" \
  --body-file "issues/bugs/[bug]--journal-focus-duplicate-keywords.md" \
  --label "bug" \
  --label "frontend" \
  --label "ui" \
  --assignee "ScottyVenable"
```

## Additional Information
**References:**
- Related Issues: TODO – add link post creation
- Documentation: docs/ui/UI_DESIGN_IDEAS.md
- External Resources: N/A

**Screenshots/Mockups:**
Capture screenshot showing duplicated keyword list.
