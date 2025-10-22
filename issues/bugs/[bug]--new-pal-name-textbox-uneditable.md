# GitHub Issue Creation Request Template

## File Naming Convention
**Saved as:** `[bug]--new-pal-name-textbox-uneditable.md`

## Issue Information
**Title:** New Pal name textbox becomes uneditable after returning to main menu
**Type:** Bug Report
**Priority:** High
**Labels:** bug, frontend, ui

## Description
After exiting to the main menu and relaunching the New Pal dialog, the name textbox no longer accepts focus or keyboard input. The missing focus prevents users from creating new Pals via this flow.

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
Name input never gains focus; typing is ignored after returning to the main menu.

**Expected Behavior:** (for bugs/enhancements)
The name textbox should autofocus and allow typing every time the dialog opens.

## Reproduction Steps (for bugs)
1. Launch MyPal.
2. Click `Exit` to return to the main menu.
3. Click `New Pal`.
4. Attempt to type in the name textbox.

## Acceptance Criteria (for features/enhancements)
- [ ] New Pal dialog autofocuses the name field after returning from the main menu.
- [ ] Manual focus on the name input always enables typing.
- [ ] Automated UI/E2E test covers this regression path.

## Technical Details
**Environment:**
- OS: Windows 10/11
- App Version: v0.2.0-alpha (current)
- Node.js Version: 18.x
- React Native Version: N/A

**Error Messages/Logs:**
```
No console errors observed during reproduction.
```

**Code References:**
- Files: app/frontend/app.js, app/frontend/index.html
- Functions/Components: New Pal dialog open handlers, focus management utilities
- Line Numbers: Identify during fix

## Implementation Notes
**Suggested Approach:**
Ensure the dialog lifecycle focuses the name input, confirm no overlays capture focus, and add UI/E2E coverage for the flow.

**Potential Challenges:**
Handling focus timing when dialogs animate or when other elements retain focus.

**Dependencies:**
None.

## GitHub CLI Command
```bash
gh issue create \
  --title "New Pal name textbox becomes uneditable after returning to main menu" \
  --body-file "issues/bugs/[bug]--new-pal-name-textbox-uneditable.md" \
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
Capture dialog showing missing caret after reproduction.
