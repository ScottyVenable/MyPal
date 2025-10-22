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
- [x] New Pal dialog autofocuses the name input after returning from the main menu.
- [x] Manual clicking on the name input always enables typing.
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
- Functions/Components: `wireProfileManagement()` function
- Line Numbers: ~413-500
- Commit: 1422256

## Resolution
**Status:** ✅ RESOLVED  
**Fixed in Commit:** 1422256  
**Date Fixed:** October 22, 2025

**Solution Implemented:**
Modified the `wireProfileManagement()` function in `app/frontend/app.js` to:

1. **Re-query DOM element** on each modal open to avoid stale references
2. **Comprehensive attribute cleanup**: Remove readonly, disabled, aria-disabled, and tabindex attributes
3. **Increased focus delay**: Changed from 50ms to 100ms for better DOM settling
4. **Added fallback handlers**: Click and focus event listeners directly on the input element
5. **Double-check attributes**: Removed blocking attributes both before delay and in requestAnimationFrame

**Testing:**
- ✅ Input auto-focuses when modal opens
- ✅ Typing works after profile deletion
- ✅ Clicking input always enables typing (fallback protection)
- ✅ Works consistently across multiple modal opens

**Test Document:** `TESTING_NEW_PAL_INPUT_FIX.md`

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
