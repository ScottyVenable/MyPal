# GitHub Issue Creation Request Template

## File Naming Convention
**Saved as:** `[bug]--journal-focus-duplicate-keywords.md`

## Issue Information
**Title:** Duplicate keyword echoing in journal focus selection  
**Type:** Bug Report  
**Priority:** Medium  
**Labels:** bug, frontend, ui

## Description
Selecting a focus keyword in the Journal tab causes the same keyword to render twice (for example, “gratitude gratitude”). This duplication creates a confusing UX that undermines the focus feature.

## Context
**Related Files/Components:**
- [ ] Mobile App (`/mobile`)
- [ ] Backend Server (`/app/backend`)
- [x] Frontend (`/app/frontend`)
- [ ] AI/LLM Integration
- [ ] Database/Storage
- [ ] Documentation
- [ ] Other: ___________

**Current Behavior:**
After choosing a keyword from the focus selector, the UI repeats the keyword twice. The duplication appears both in the list and in the selected keyword display.

**Expected Behavior:**
Each selected keyword should appear exactly once in the UI.

## Reproduction Steps
1. Open the Journal tab with entries that include focus keywords.
2. Open the focus selector and choose a keyword (e.g., “gratitude”).
3. Observe that the keyword is displayed twice.
4. Repeat with another keyword to confirm repeatability.

## Acceptance Criteria
- [ ] Selecting a focus keyword renders it only once.
- [ ] Keyword list remains deduplicated after multiple selections.
- [ ] UI test verifies no duplicate keywords appear.

## Technical Details
**Environment:**
- OS: Windows 10/11
- App Version: v0.2.0-alpha (current)
- Node.js Version: N/A
- React Native Version: N/A

**Error Messages/Logs:**
```
No console errors observed; issue is visual.
```

**Code References:**
- Files: `app/frontend/app.js`, `app/frontend/index.html`, `app/frontend/styles.css`
- Functions/Components: Journal focus selector component, keyword rendering logic
- Line Numbers: To be determined during fix

## Implementation Notes
**Suggested Approach:**
Audit the focus selection handler to ensure the keyword is only appended once to state. Add deduplication before rendering or store selected keywords as a Set. Update UI tests to cover keyword selection.

**Potential Challenges:**
Ensuring deduplication does not remove intentionally repeated entries elsewhere.

**Dependencies:**
None known.

## GitHub CLI Command
```bash
gh issue create \
  --title "Duplicate keyword echoing in journal focus selection" \
  --body-file "issues/[bug]--journal-focus-duplicate-keywords.md" \
  --label "bug,frontend,ui" \
  --assignee "ScottyVenable"
```

## Additional Information
**References:**
- Related Issues: TODO – add link post creation
- Documentation: `docs/ui/UI_DESIGN_IDEAS.md`
- External Resources: N/A

**Screenshots/Mockups:**
Not yet captured; recommended to add screenshot of duplication.
