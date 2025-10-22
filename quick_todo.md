# Quick TODO
Add these to the main todo list when available.

## Bugs
- **Pop-out Chat Modal — initial drag jump / offset**
    - **Problem**: When grabbing the pop-out chat modal to move it, the modal initially jumps away from the cursor (or finger). After the jump, dragging functions normally.
    - **Reproduction steps**:
        1. Open the pop-out chat modal.
        2. Click/press and hold the modal header (or drag handle) and start moving immediately.
        3. Observe the modal jump to a different position before following the cursor.
    - **Impact**: Poor UX — imprecise placement, user frustration when attempting to drag the modal to a specific location.
    - **Expected behavior**: Modal should start moving immediately under the cursor/finger with no positional jump; the cursor should retain the same relative offset to the modal during the entire drag.
    - **Likely causes**:
        - Initial pointer offset not captured on pointerdown/mousedown (using move events without storing initial delta).
        - Using CSS transform/translate or transitions that reset position when drag starts.
        - Coordinate space mismatch (clientX/clientY vs element offsets, scaling, or parent transforms).
        - Delayed switching from non-drag to drag positioning (e.g., switching from static to absolute/fixed on drag start).
    - **Suggested fixes**:
        - On pointerdown/mousedown, store the pointer-to-element offset and use that offset when computing positions during pointermove.
        - Use pointer events and pointer capture (element.setPointerCapture) to ensure consistent coordinates.
        - Avoid applying CSS transitions while dragging; apply immediate transforms/left/top updates instead.
        - Prefer translating the element using the same coordinate space used to capture the pointer (avoid mixing layout and transform calculations).
        - If switching positioning (static → absolute/fixed), compute and set the element’s initial top/left to the current screen position before enabling dragging.
    - **Files / areas to inspect**:
        - Pop-out modal component (e.g., components/PopoutChatModal.tsx or screens/ChatPopout.*)
        - Any drag utility hooks (e.g., hooks/useDraggable.ts)
        - CSS / style definitions that apply transforms or transitions to the modal
        - Gesture handler configuration if using a library (react-native-gesture-handler / web fallback)
    - **Priority**: Medium — affects usability but has a clear reproduction and targeted fixes.



- 
## Completed
### ✅ COMPLETED - Console Output Issues (PATCH-v0.1.3)
- **Remove emojis from console.log messages** to prevent garbled characters on Windows terminals
    - **Problem**: Emoji characters in console output cause display issues on Windows Command Prompt and PowerShell
    - **Impact**: Makes debugging difficult and creates unprofessional output
    - **Solution**: ✅ **FIXED** - Replaced with bracketed prefixes like `[NEURAL]`, `[SUCCESS]`, `[CHAT]`, `[SAVE]`
    - **Files Modified**: `app/backend/src/server.js` - 10 console.log statements updated
    - **Priority**: ✅ **COMPLETED** - Clean professional console output now displays correctly on Windows


### ✅ COMPLETED - Auto Profile Loading (PATCH-v0.1.3) 
- **Auto-loading last used profile instead of showing profile menu**
    - **Problem**: Users expect to see the profile selection menu on startup, but the app loads the last used profile automatically
    - **Impact**: Confuses users who want to switch profiles or create a new one
    - **Solution**: ✅ **FIXED** - Modified `init()` function to always show profile selection menu first
    - **Files Modified**: `app/frontend/app.js` - Simplified startup logic to always show profile menu
    - **Priority**: ✅ **COMPLETED** - Profile menu now appears on every startup with convenient "Continue" option