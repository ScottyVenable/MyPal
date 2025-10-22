# GitHub Issues to Create - MyPal Project

This document catalogs all bugs, issues, and feature requests identified from the project documentation that should be turned into GitHub issues.

## Critical Priority Issues (P0 - Production Breaking)

### 🐛 BUG-001: Pal returns question instead of answering at Level 2
**Labels:** `bug`, `P0-critical`, `cognitive-system`

**Description:**
At Level 2 cognitive setting, when users ask direct factual questions (e.g., "What is the capital of France?"), the Pal responds with a question instead of providing an answer (e.g., "Why do you want to know?").

**Environment:** MyPal app (Level 2 cognitive setting)

**Steps to Reproduce:**
1. Launch MyPal and select/configure a Pal at Level 2
2. In chat, ask a direct factual question (e.g., "What is the capital of France?")
3. Observe the Pal's response

**Expected Behavior:** 
At Level 2 the Pal should return a concise, direct answer (or a low-complexity response), not deflect with another question.

**Actual Behavior:** 
Pal replies with a question (e.g., "Why do you want to know?") instead of giving an answer.

**Impact:** 
Users do not receive expected information; degrades conversational utility.

**Suspected Causes:**
- Curiosity/clarification trigger thresholds too aggressive for Level 2
- Intent classification mislabeling information requests
- Level-gating logic routing to question-generation path

**Suggested Fixes:**
- Add unit/UI test asserting direct-answer behavior for factual queries at Level 2
- Adjust curiosity/why-question thresholds for Level ≤2
- Verify intent classification and response-routing for "information request" intents

**References:** 
- TODO line 4-18
- TODO v0.2.md line 5-16

---

### 🐛 BUG-002: New Pal name textbox uneditable after returning to main menu
**Labels:** `bug`, `P0-critical`, `ui`, `input-focus`

**Description:**
The Name textbox in the New Pal dialog becomes uneditable when accessed after returning to the Main Menu from the app window. No caret appears and keyboard input is completely ignored.

**Environment:** MyPal UI (New Pal dialog), reproduces on main menu return flow

**Severity:** High — prevents creating new Pal

**Frequency:** Always (when following reproduction steps)

**Steps to Reproduce:**
1. Launch MyPal
2. From the app window, press "Exit" to return to Main Menu
3. Click "New Pal" to open the New Pal dialog
4. Attempt to type in the Name textbox

**Expected Behavior:** 
Name textbox autofocuses when the New Pal dialog opens and accepts typing.

**Actual Behavior:** 
No caret appears; keyboard input is ignored and textbox does not accept focus.

**Suspected Causes:**
- Missing autofocus logic when dialog is opened from Main Menu return path
- Input rendered with disabled/readonly attribute
- Focus trap or overlay element blocking input events
- Incorrect z-index stacking preventing click/focus
- Event handler preventing key events or stealing focus

**Suggested Fixes:**
- Ensure New Pal dialog sets focus to Name input on open (add autofocus or programmatic focus in dialog open handler)
- Verify input does not have disabled/readonly attributes in this code path
- Inspect DOM stacking and remove blocking overlays or fix z-index
- Audit keyboard/focus-related event handlers for unintended preventDefault()/stopPropagation()
- Add automated UI/E2E test: open Main Menu → New Pal → assert Name input has focus and accepts text entry
- Add unit test for dialog open lifecycle to prevent regressions

**References:** 
- TODO line 19-46
- TODO v0.2.md line 18-30

---

## High Priority Issues (P1)

### 🐛 BUG-003: Race condition when multiple chats arrive before data save completes
**Labels:** `bug`, `P1-high`, `concurrency`, `backend`

**Description:**
Multiple chat messages arriving before the data save operation completes can result in data inconsistency or loss.

**Impact:** 
Data corruption or loss of chat messages

**Suggested Fixes:**
- Implement proper concurrency handling for JSON file operations
- Add queue-based processing for chat messages
- Implement file locking mechanism

**References:** 
- TODO line 55
- TODO v0.2.md line 33

---

### 🐛 BUG-004: Duplicate keyword echoing in journal focus selection
**Labels:** `bug`, `P1-high`, `ui`, `journal`

**Description:**
Keywords appear duplicated when selecting journal focus entries.

**References:** 
- TODO line 101
- TODO v0.2.md line 34

---

### 🐛 BUG-005: Intermittent telemetry write failures on Windows sandboxed installs
**Labels:** `bug`, `P1-high`, `windows`, `telemetry`, `filesystem`

**Description:**
Telemetry data fails to write intermittently on Windows installations, particularly in sandboxed environments.

**Impact:** 
Loss of telemetry data and potential debugging information

**Suggested Investigation:**
- Check file permissions in Windows sandboxed environments
- Verify paths are correctly resolved in all Windows configurations
- Add retry logic with exponential backoff

**References:** 
- TODO line 102
- TODO v0.2.md line 35

---

### 🐛 BUG-006: Pressing 'X' on a neuron view not closing the view
**Labels:** `bug`, `P1-high`, `ui`, `brain-visualization`

**Description:**
Clicking the 'X' button on the neuron detail view does not close the view as expected.

**References:** 
- TODO v0.2.md line 36

---

### 🐛 BUG-007: Pop-out Chat Modal initial drag jump/offset
**Labels:** `bug`, `P1-high`, `ui`, `drag-and-drop`, `mobile`

**Description:**
When grabbing the pop-out chat modal to move it, the modal initially jumps away from the cursor (or finger). After the jump, dragging functions normally.

**Environment:** Mobile app, pop-out chat modal

**Steps to Reproduce:**
1. Open the pop-out chat modal
2. Click/press and hold the modal header (or drag handle) and start moving immediately
3. Observe the modal jump to a different position before following the cursor

**Expected Behavior:** 
Modal should start moving immediately under the cursor/finger with no positional jump; the cursor should retain the same relative offset to the modal during the entire drag.

**Actual Behavior:** 
Modal jumps to a different position on initial drag before following cursor normally.

**Impact:** 
Poor UX — imprecise placement, user frustration when attempting to drag the modal to a specific location.

**Suspected Causes:**
- Initial pointer offset not captured on pointerdown/mousedown (using move events without storing initial delta)
- Using CSS transform/translate or transitions that reset position when drag starts
- Coordinate space mismatch (clientX/clientY vs element offsets, scaling, or parent transforms)
- Delayed switching from non-drag to drag positioning (e.g., switching from static to absolute/fixed on drag start)

**Suggested Fixes:**
- On pointerdown/mousedown, store the pointer-to-element offset and use that offset when computing positions during pointermove
- Use pointer events and pointer capture (element.setPointerCapture) to ensure consistent coordinates
- Avoid applying CSS transitions while dragging; apply immediate transforms/left/top updates instead
- Prefer translating the element using the same coordinate space used to capture the pointer
- If switching positioning (static → absolute/fixed), compute and set the element's initial top/left to the current screen position before enabling dragging

**Files to Inspect:**
- Pop-out modal component (e.g., components/PopoutChatModal.tsx or screens/ChatPopout.*)
- Drag utility hooks (e.g., hooks/useDraggable.ts)
- CSS / style definitions that apply transforms or transitions to the modal
- Gesture handler configuration if using a library (react-native-gesture-handler / web fallback)

**References:** 
- quick_todo.md line 5-29

---

## Medium Priority Issues (P2)

### 🐛 BUG-008: Correct new profile bootstrap files structure
**Labels:** `bug`, `P2-medium`, `backend`, `data-structure`

**Description:**
Bootstrap files (chat-log.json, memories.json, vocabulary.json, journal.json) need to use array structures expected by runtime loops.

**Impact:** 
Runtime errors when accessing newly created profiles

**References:** 
- TODO line 57
- TODO v0.2.md line 51-58

---

### 🔧 TECH-001: Implement proper concurrency handling for JSON file operations
**Labels:** `enhancement`, `P1-high`, `backend`, `filesystem`

**Description:**
Implement thread-safe file operations to prevent race conditions and data corruption during concurrent access to JSON files.

**Acceptance Criteria:**
- Queue-based processing for file operations
- File locking mechanism
- Proper error handling for concurrent access

**Estimate:** Medium

**References:** 
- TODO line 56
- TODO v0.2.md line 50-54

---

## Feature Requests & Enhancements

### 🚀 FEAT-001: Test new learning systems comprehensively
**Labels:** `enhancement`, `testing`, `learning-system`

**Description:**
Comprehensive testing of recently implemented learning systems is required before considering them production-ready.

**Note:** **RESTART MYPAL APP to activate new features**

**Acceptance Criteria:**
- [ ] Test affirmation system: "Yes, happy is good" should reinforce happy (+8), good (+6), and relationship (+10)
- [ ] Test affirmation system: "You are right! Eating is important" should trigger curiosity → "Why is eating important?"
- [ ] Test temporal memory system: "No, today is Tuesday" should learn as temporal-fact with 50%/day decay and end-of-day expiry
- [ ] Check memory decay runs at 2 AM daily
- [ ] Test curiosity system: Affirm concept with low knowledge → Pal should ask "Why?"
- [ ] Test curiosity system: Question sophistication should match level (L0-3: "Why?", L11+: full sentences)
- [ ] Test priority learning chains: Answer Pal's "Why?" question → words should get 3.5-4.0x learning multiplier
- [ ] Check learningChains metadata in vocabulary entries
- [ ] Test definitional learning: "Question means we want to learn" should store definition for "question" concept
- [ ] Test definitional learning: "Question means we are wondering" should add second definition
- [ ] Check definitions[] array in vocabulary entry
- [ ] Verify relationship created: question:means → "we want to learn"
- [ ] Test quotation learning: "You should say 'hello' to greet people"
- [ ] Test correction system: "Don't say 'You is', say 'You are'"

**Estimate:** Large

**References:** 
- TODO line 61-89
- TODO v0.2.md line 61-74

---

### 🚀 FEAT-002: Developer debug mode
**Labels:** `enhancement`, `developer-tools`, `ui`

**Description:**
Create a "debug" or "developer" mode toggle in Settings to enable verbose logging and testing features as a developer tool in the frontend UI.

**Acceptance Criteria:**
- [ ] Enable verbose logging toggle
- [ ] Add testing features in frontend UI
- [ ] Developer tool access
- [ ] Console output controls

**Estimate:** Medium

**References:** 
- TODO line 62
- TODO v0.2.md line 75-79

---

### 🚀 FEAT-003: Enhanced help system across all tabs
**Labels:** `enhancement`, `documentation`, `ui`, `help`

**Description:**
Expand help tooltips to all tabs for better user guidance.

**Status:** Memories and Journal tooltips already completed ✅

**Acceptance Criteria:**
- [ ] Stats tab: Add explanations for XP/CP/Level/Advancement
- [ ] Brain tab: Add node/edge visualization guide
- [ ] Settings tab: Explain each configuration option

**Estimate:** Medium

**References:** 
- TODO line 89-91
- TODO v0.2.md line 81-88

---

### 🚀 FEAT-004: Rename "Concepts" to "Knowledge Base" throughout UI and docs
**Labels:** `enhancement`, `ui`, `documentation`, `naming`

**Description:**
Change "Concepts" menu to "Knowledge Base" throughout UI and documentation for improved clarity.

**Acceptance Criteria:**
- [ ] Update menu/tab labels in UI
- [ ] Update documentation references
- [ ] Ensure consistency across app

**Estimate:** Small

**References:** 
- TODO v0.2.md line 90-96

---

### 🚀 FEAT-005: UI refactor for style consistency
**Labels:** `enhancement`, `ui`, `design`, `style`

**Description:**
Update UI components to match STYLE_DESIGN_IDEA.md guidelines for consistent visual design.

**Acceptance Criteria:**
- [ ] Update fonts to 'Rounded Elegance' for headings
- [ ] Ensure color palette matches design doc
- [ ] Standardize button and input field styles

**Estimate:** Medium

**References:** 
- TODO v0.2.md line 98-104

---

### 🚀 FEAT-006: Local database implementation
**Labels:** `enhancement`, `backend`, `database`, `architecture`

**Description:**
Replace JSON file persistence with proper local database (lowdb or nedb) for better performance and reliability.

**Impact:** 
Improved data consistency, better concurrent access handling, enhanced query capabilities

**Estimate:** Large

**References:** 
- TODO line 94
- TODO v0.2.md line 107-109

---

### 🚀 FEAT-007: Brain visualization enhancements
**Labels:** `enhancement`, `ui`, `visualization`, `brain`

**Description:**
Interactive brain graph improvements for better user experience and data exploration.

**Acceptance Criteria:**
- [ ] Double-click node to zoom and isolate
- [ ] Dynamic strength/opacity edges
- [ ] Lobe coloring implementation

**Estimate:** Large

**References:** 
- TODO line 107-113
- TODO v0.2.md line 111-117

---

### 🚀 FEAT-008: Conversation system improvements
**Labels:** `enhancement`, `chat`, `ui`

**Description:**
Enhanced chat functionality for better user experience.

**Acceptance Criteria:**
- [ ] History pagination
- [ ] Streaming responses with cancellation
- [ ] Keyboard shortcuts and accessibility improvements

**Estimate:** Medium

**References:** 
- TODO line 108-111
- TODO v0.2.md line 119-125

---

### 🚀 FEAT-009: Vocabulary teaching flow implementation
**Labels:** `enhancement`, `learning-system`, `ui`

**Description:**
Complete user-defined meanings system with UI components and validation.

**Status:** Single-word constraint completed ✅

**Remaining Work:**
- [ ] UI components for vocabulary teaching
- [ ] Validation logic
- [ ] User feedback mechanisms

**Estimate:** Medium

**References:** 
- TODO line 92
- TODO v0.2.md line 129-133

---

### 🚀 FEAT-010: S-V-O schema validation for speech construction
**Labels:** `enhancement`, `learning-system`, `linguistics`

**Description:**
Implement proper sentence structure validation using Subject-Verb-Object schema.

**Dependencies:** Telegraphic speech system (completed ✅)

**Estimate:** Medium

**References:** 
- TODO line 96
- TODO v0.2.md line 135-138

---

### 🚀 FEAT-011: Concept tagging system
**Labels:** `enhancement`, `learning-system`, `cognitive`

**Description:**
Implement concept tagging system from CONCEPTUAL_INTELLIGENCE.md design document.

**Acceptance Criteria:**
- [ ] Add abstractionLevel field to concept storage structure
- [ ] Create level-gating for complex concepts in response generation
- [ ] Implement developmental milestone notifications (e.g., "Pal can now understand abstract logic!")
- [ ] Add concept evolution tracking (same concept understood differently at each level)

**References:** 
- TODO line 84-88

---

### 🚀 FEAT-012: Automatic reconnection for WebSocket connections
**Labels:** `enhancement`, `backend`, `websocket`, `reliability`

**Description:**
Add automatic reconnection/backoff for neural activity WebSocket to keep brain visualization live after disconnects.

**Acceptance Criteria:**
- [ ] Implement exponential backoff
- [ ] Show connection status in UI
- [ ] Handle reconnection gracefully without data loss

**References:** 
- TODO line 113

---

## Development & Infrastructure Issues

### 🔧 INFRA-001: Fix development setup documentation
**Labels:** `documentation`, `setup`, `developer-experience`

**Description:**
Fix path issues in development setup documentation to help new developers get started more easily.

**Priority:** Medium

**Estimate:** Small

**References:** 
- TODO line 97
- TODO v0.2.md line 141-145

---

### 🔧 INFRA-002: Electron builder configuration fix
**Labels:** `build`, `deployment`, `electron`

**Description:**
Fix Electron builder configuration for all platforms (Windows, macOS, Linux).

**Priority:** High

**Estimate:** Medium

**References:** 
- TODO line 170
- TODO v0.2.md line 181-184

---

### 🔧 INFRA-003: Create installer packages for all platforms
**Labels:** `build`, `deployment`, `installer`

**Description:**
Create installers for Windows (.exe), macOS, and Linux distributions.

**Dependencies:** INFRA-002 (Electron builder configuration)

**Acceptance Criteria:**
- [ ] Windows installer (.exe) with digital signing
- [ ] macOS installer package
- [ ] Linux installer packages (deb, rpm)

**Estimate:** Large

**References:** 
- TODO line 173-174
- TODO v0.2.md line 186-189

---

### 🔧 INFRA-004: Implement update mechanism
**Labels:** `enhancement`, `deployment`, `auto-update`

**Description:**
Implement automatic update system for future releases.

**Estimate:** Large

**References:** 
- TODO line 176
- TODO v0.2.md line 191-193

---

### 🔧 INFRA-005: Add automated testing framework
**Labels:** `testing`, `infrastructure`, `quality`

**Description:**
Add automated testing framework with unit tests for XP/level logic and other core functionality.

**Acceptance Criteria:**
- [ ] Unit test framework setup
- [ ] Integration test framework
- [ ] CI/CD integration for automated testing
- [ ] Code coverage reporting

**Estimate:** Large

**References:** 
- TODO line 131
- TODO v0.2.md line 167-169

---

### 🔧 INFRA-006: UI/E2E tests for critical flows
**Labels:** `testing`, `ui`, `e2e`

**Description:**
Create end-to-end tests for critical user flows to prevent regressions.

**Priority:** High (prevents BUG-002 regression)

**Test Cases:**
- [ ] Main Menu → New Pal → Name input functionality
- [ ] Chat message flow
- [ ] Settings save/reset operations
- [ ] Profile switching

**Estimate:** Medium

**References:** 
- TODO v0.2.md line 172-174

---

## Performance & Optimization Issues

### ⚡ PERF-001: Brain graph lazy loading
**Labels:** `performance`, `optimization`, `visualization`

**Description:**
Optimize visualization performance by implementing lazy loading for brain graph.

**Estimate:** Medium

**References:** 
- TODO line 139
- TODO v0.2.md line 152-154

---

### ⚡ PERF-002: JSON I/O optimization
**Labels:** `performance`, `optimization`, `backend`

**Description:**
Improve file operation performance for JSON read/write operations.

**Estimate:** Small

**References:** 
- TODO line 140
- TODO v0.2.md line 156-159

---

### ⚡ PERF-003: Implement caching for frequently accessed data
**Labels:** `performance`, `optimization`, `caching`

**Description:**
Add caching layer for frequently accessed data to reduce disk I/O.

**Estimate:** Medium

**References:** 
- TODO line 141

---

### ⚡ PERF-004: Memory usage monitoring and cleanup
**Labels:** `performance`, `memory`, `monitoring`

**Description:**
Add memory usage monitoring and implement proper cleanup routines to prevent memory leaks.

**Estimate:** Medium

**References:** 
- TODO line 142

---

## Security & Privacy Issues

### 🔒 SEC-001: API key masking in settings UI
**Labels:** `security`, `ui`, `privacy`

**Description:**
Implement proper API key masking in settings UI to prevent shoulder surfing and accidental exposure.

**References:** 
- TODO line 160
- TODO v0.2.md line 161

---

### 🔒 SEC-002: Content filtering for user inputs
**Labels:** `security`, `input-validation`

**Description:**
Add content filtering to protect against malicious or inappropriate user inputs.

**References:** 
- TODO line 161
- TODO v0.2.md line 162

---

### 🔒 SEC-003: Proper secrets management for local storage
**Labels:** `security`, `storage`, `encryption`

**Description:**
Implement proper secrets management for sensitive data in local storage.

**References:** 
- TODO line 162
- TODO v0.2.md line 163

---

### 🔒 SEC-004: Data export/import validation and sanitization
**Labels:** `security`, `data-integrity`

**Description:**
Add validation and sanitization for data export/import operations to prevent injection attacks and data corruption.

**References:** 
- TODO line 163

---

### 🔒 SEC-005: Session management for multi-user scenarios
**Labels:** `security`, `authentication`, `multi-user`

**Description:**
Implement proper session management to support multi-user scenarios securely.

**References:** 
- TODO line 164

---

### 🔒 SEC-006: Per-user encryption keys for saved conversations
**Labels:** `security`, `encryption`, `privacy`

**Description:**
Implement per-user encryption keys for saved conversations to enhance privacy.

**References:** 
- TODO line 166

---

### 🔒 SEC-007: Privacy mode to disable telemetry
**Labels:** `security`, `privacy`, `telemetry`

**Description:**
Create privacy mode that disables telemetry and sensitive logging entirely.

**References:** 
- TODO line 167

---

## Documentation Issues

### 📖 DOC-001: Update API documentation for new endpoints
**Labels:** `documentation`, `api`

**Description:**
Update API documentation to reflect new endpoints and changes.

**References:** 
- TODO line 182

---

### 📖 DOC-002: Create user tutorial/onboarding guide
**Labels:** `documentation`, `onboarding`, `user-experience`

**Description:**
Create brief user tutorial/onboarding guide to help new users get started.

**References:** 
- TODO line 183

---

### 📖 DOC-003: Create troubleshooting guide
**Labels:** `documentation`, `support`

**Description:**
Create troubleshooting guide for common setup issues.

**References:** 
- TODO line 184

---

### 📖 DOC-004: Document personality system mechanics
**Labels:** `documentation`, `learning-system`

**Description:**
Document personality system mechanics for users to understand how their Pal develops.

**References:** 
- TODO line 186

---

## Summary Statistics

**Total Issues Identified:** 53

**By Priority:**
- P0 (Critical): 2 bugs
- P1 (High): 5 bugs + 1 infrastructure issue
- P2 (Medium): 1 bug + remaining features

**By Category:**
- Bugs: 8
- Features/Enhancements: 12
- Infrastructure: 6
- Performance: 4
- Security: 7
- Documentation: 4
- Technical Debt: 12

## Notes for Issue Creation

When creating these issues in GitHub:

1. **Use appropriate labels**: bug, enhancement, documentation, security, performance, etc.
2. **Set milestones** based on the TODO priority
3. **Link related issues** where dependencies exist
4. **Add estimates** as project fields or labels
5. **Assign to appropriate team members** based on expertise
6. **Consider creating epics** for large feature sets that encompass multiple issues
7. **Cross-reference** TODO line numbers and source files for traceability

## Priority Recommendations

**Immediate Action Required:**
1. BUG-001 (Pal not answering at Level 2)
2. BUG-002 (Name textbox uneditable)
3. BUG-003 (Race condition in chat data)

**High Priority for Next Sprint:**
1. FEAT-001 (Test learning systems)
2. INFRA-002 (Fix Electron builder)
3. INFRA-006 (E2E tests for critical flows)
4. BUG-007 (Mobile drag-and-drop issue)

**Security Focus:**
- SEC-001 through SEC-007 should be prioritized based on the project's security posture requirements
