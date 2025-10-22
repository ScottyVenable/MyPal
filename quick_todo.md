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


## Feature Request: README & Project Branding

- **Title**: README updates — license selection, branding (logo), and README best practices

- **Description**: Improve project onboarding and discoverability by standardizing the repository README, adding a project logo, and choosing a clear open-source license.

- **Problem**:
    - README is missing key sections (installation, usage, contribution guidelines, licence).
    - No project logo/branding files in repository to use in README and app assets.
    - Lack of an explicit licence causes legal ambiguity for contributors and users.

- **Proposed solution**:
    1. Create a comprehensive README.md that follows open-source best practices:
         - Project title, short description, and logo.
         - Quick start / installation steps for mobile and backend (dev mode and production build).
         - Usage examples (running app locally, running embedded backend).
         - Contribution guidelines (branching, commits, PR template link).
         - Testing instructions (unit, integration, E2E).
         - Code of conduct and security reporting instructions.
         - Links to architecture docs, design decisions, and where to find models.
    2. Add a high-resolution logo file (svg and png) in a /assets or /docs/media directory and reference it in README and app stores/scripts where appropriate.
    3. Evaluate and add a licence file (LICENSE) — recommend MIT for permissive open-source or Apache 2.0 if patent protection is desired. Document the chosen licence in README and add a licence badge.
    4. Add a contributors/maintainers section and a short roadmap summary.

- **Subtasks**:
    - [ ] Draft README.md skeleton with recommended sections.
    - [ ] Populate installation and usage commands for mobile (/mobile) and backend (/app/backend or embedded Node).
    - [ ] Produce or add logo files: docs/media/logo.svg and docs/media/logo.png (appropriate sizes).
    - [ ] Choose licence and add LICENSE file; add licence badge to README.
    - [ ] Add CONTRIBUTING.md and CODE_OF_CONDUCT.md (links from README).
    - [ ] Add small checklist for reviewers: update README when adding breaking changes or new tooling.

- **Files / areas to modify**:
    - README.md (root)
    - docs/ or docs/media/ (add logo files)
    - CONTRIBUTING.md, CODE_OF_CONDUCT.md (root)
    - package.json scripts (optional: add README generation or badges)
    - CI configs (optional: add badge links)

- **Acceptance criteria**:
    - README contains all required sections and runs developer through a successful local build for both mobile and backend.
    - LICENSE present and clearly named; licence badge displayed in README.
    - Logo files present in repository and render correctly in README on GitHub.
    - CONTRIBUTING.md and CODE_OF_CONDUCT.md linked from README.
    - New contributors can follow README to set up dev environment without additional guidance.

- **Priority**: Low-Medium — improves developer experience and legal clarity; not blocking core functionality.

- **Estimated effort**: 2–4 hours (draft README + add assets + licence selection).

- **Notes**:
    - If choosing a licence is unclear, propose MIT by default and call out the option to switch to Apache 2.0 if patent language is required.
    - Keep README excerpted for mobile-specific commands and link to more detailed docs in /docs when needed.


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