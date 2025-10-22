# GitHub Issue Creation Request Template

## File Naming Convention
**Saved as:** `[bug]--neuron-view-close-button-unresponsive.md`

## Issue Information
**Title:** Pressing X on a neuron view does not close the view
**Type:** Bug Report
**Priority:** Medium
**Labels:** bug, frontend, ui

## Description
In the neural network visualization, clicking the `X` close button on a neuron detail overlay has no effect. Users must restart or navigate away because the overlay never dismisses.

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
Close button does not dismiss the neuron detail overlay.

**Expected Behavior:** (for bugs/enhancements)
Clicking the close button should hide the overlay and return focus to the brain graph.

## Reproduction Steps (for bugs)
1. Open the Neural view.
2. Click a neuron to open its detail overlay.
3. Click the `X` close button.
4. Observe the overlay remains visible.

## Acceptance Criteria (for features/enhancements)
- [ ] Close handler dismisses the overlay reliably.
- [ ] Overlay state resets so subsequent neuron selections operate normally.
- [ ] UI regression test covers the close interaction.

## Technical Details
**Environment:**
- OS: Windows 10/11
- App Version: v0.2.0-alpha (current)
- Node.js Version: 18.x
- React Native Version: N/A

**Error Messages/Logs:**
```
No console errors observed; issue reproduces consistently.
```

**Code References:**
- Files: app/frontend/app.js
- Functions/Components: Neuron detail overlay component, close handler
- Line Numbers: Identify while fixing

## Implementation Notes
**Suggested Approach:**
Verify the click handler wiring, ensure overlay state toggles correctly, and add regression coverage.

**Potential Challenges:**
Managing overlay state when multiple neuron detail views open sequentially.

**Dependencies:**
None.

## GitHub CLI Command
```bash
gh issue create \
  --title "Pressing X on a neuron view does not close the view" \
  --body-file "issues/bugs/[bug]--neuron-view-close-button-unresponsive.md" \
  --label "bug" \
  --label "frontend" \
  --label "ui" \
  --assignee "ScottyVenable"
```

## Additional Information
**References:**
- Related Issues: TODO – link post creation
- Documentation: docs/ui/UI_DESIGN_IDEAS.md
- External Resources: N/A

**Screenshots/Mockups:**
Capture overlay stuck after pressing `X`.
