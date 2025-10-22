# GitHub Issue Creation Request Template

## File Naming Convention
**Saved as:** `[bug]--neuron-view-close-button-unresponsive.md`

## Issue Information
**Title:** Pressing X on a neuron view does not close the view  
**Type:** Bug Report  
**Priority:** Medium  
**Labels:** bug, frontend, ui

## Description
In the neural network visualization, opening a neuron detail overlay and clicking the `X` close button leaves the overlay stuck on screen. Users must restart or navigate away to regain access to the main UI.

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
The neuron detail overlay remains visible after clicking the close button. It appears the click handler either does not fire or fails to toggle the overlay state.

**Expected Behavior:**
Clicking the `X` close button should dismiss the overlay and return the user to the neuron graph view.

## Reproduction Steps
1. Open the Neural view in the MyPal UI.
2. Click on any neuron to view its detail overlay.
3. Click the `X` close button in the overlay.
4. Observe that the overlay does not close.

## Acceptance Criteria
- [ ] Close button reliably dismisses the neuron detail overlay.
- [ ] Overlay state resets so subsequent neuron selections work.
- [ ] Automated UI test covers the close interaction.

## Technical Details
**Environment:**
- OS: Windows 10/11
- App Version: v0.2.0-alpha (current)
- Node.js Version: N/A
- React Native Version: N/A

**Error Messages/Logs:**
```
No errors seen in console; mitigation requires instrumentation.
```

**Code References:**
- Files: `app/frontend/app.js`, neural overlay components
- Functions/Components: Neuron detail overlay component, close handler
- Line Numbers: To be identified during investigation

## Implementation Notes
**Suggested Approach:**
Verify the close button is wired to the overlay dismissal logic. Ensure overlay state/props update correctly and that event propagation is not blocked by parent containers. Add regression tests to cover the interaction.

**Potential Challenges:**
Managing overlay state when multiple neuron overlays can open sequentially or when the view is refreshed.

**Dependencies:**
None known.

## GitHub CLI Command
```bash
gh issue create \
  --title "Pressing X on a neuron view does not close the view" \
  --body-file "issues/[bug]--neuron-view-close-button-unresponsive.md" \
  --label "bug,frontend,ui" \
  --assignee "ScottyVenable"
```

## Additional Information
**References:**
- Related Issues: TODO – add link after issue is created
- Documentation: `docs/ui/UI_DESIGN_IDEAS.md`
- External Resources: N/A

**Screenshots/Mockups:**
Recommended to capture overlay screenshot showing stuck state.
