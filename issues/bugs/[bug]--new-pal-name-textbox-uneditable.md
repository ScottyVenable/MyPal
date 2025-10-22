# GitHub Issue Creation Request Template

## File Naming Convention
**Saved as:** `[bug]--new-pal-name-textbox-uneditable.md`

## Issue Information
**Title:** New Pal name textbox becomes uneditable after returning to main menu  
**Type:** Bug Report  
**Priority:** High  
**Labels:** bug, frontend, ui

## Description
When users exit to the main menu and immediately reopen the New Pal dialog, the name textbox refuses focus and keyboard input. The lack of focus handling effectively blocks new Pal creation through this flow.

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
After returning to the main menu, opening the New Pal dialog shows the name textbox visually, but it never accepts focus, no caret appears, and typing has no effect.

**Expected Behavior:**
The name textbox should autofocus and allow typing every time the New Pal dialog opens, regardless of navigation path.

## Reproduction Steps
1. Launch MyPal.
2. Click `Exit` to return to the main menu.
3. Click `New Pal`.
4. Attempt to type in the name textbox and observe the missing focus.

## Acceptance Criteria
- [ ] New Pal dialog autofocuses the name input after returning from the main menu.
- [ ] Manual clicking on the name input always enables typing.
- [ ] Automated UI/E2E test verifies the regression path.

## Technical Details
**Environment:**
- OS: Windows 10/11
- App Version: v0.2.0-alpha (current)
- Node.js Version: N/A (frontend issue)
- React Native Version: N/A

**Error Messages/Logs:**
```
No console errors observed during reproduction.
```

**Code References:**
- Files: `app/frontend/app.js`, `app/frontend/index.html`
- Functions/Components: New Pal dialog open handler, focus management utilities
- Line Numbers: To be identified during fix

## Implementation Notes
**Suggested Approach:**
Ensure the dialog open lifecycle triggers `focus()` on the name input, even after navigation events. Verify that no overlays or disabled attributes persist between menu transitions. Consider adding a `setTimeout` focus fallback if necessary.

**Potential Challenges:**
Handling focus when dialogs animate or when other elements capture focus on open.

**Dependencies:**
None known.

## GitHub CLI Command
```bash
gh issue create \
  --title "New Pal name textbox becomes uneditable after returning to main menu" \
  --body-file "issues/[bug]--new-pal-name-textbox-uneditable.md" \
  --label "bug,frontend,ui" \
  --assignee "ScottyVenable"
```

## Additional Information
**References:**
- Related Issues: TODO – link after creation
- Documentation: `docs/ui/UI_DESIGN_IDEAS.md`
- External Resources: N/A

**Screenshots/Mockups:**
Not yet captured.
