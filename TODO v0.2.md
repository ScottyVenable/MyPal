# MyPal v0.2 TODO List

## 🐛 BUGS & CRITICAL ISSUES
### P0 - Production Breaking
- 🔴 **[BUG-001] Pal returns question instead of answering at Level 2**
    - **Environment:** MyPal app (Level 2 cognitive setting)
    - **Severity:** Critical
    - **Steps to reproduce:**
        1. Launch MyPal and select/configure a Pal at Level 2
        2. Ask a direct factual question (e.g., "What is the capital of France?")
        3. Observe Pal replies with question instead of answer
    - **Expected:** Level 2 should return concise, direct answers
    - **Actual:** Pal deflects with questions (e.g., "Why do you want to know?")
    - **Impact:** Users don't receive expected information; degrades conversational utility
    - **Suspected causes:** Curiosity thresholds too aggressive for Level 2, intent classification issues
    - **Due:** ASAP

- 🔴 **[BUG-002] New Pal name textbox uneditable after returning to main menu**
    - **Environment:** MyPal UI (New Pal dialog)
    - **Severity:** High - prevents creating new Pal
    - **Steps to reproduce:**
        1. Launch MyPal
        2. Press "Exit" to return to Main Menu
        3. Click "New Pal" to open dialog
        4. Attempt to type in Name textbox
    - **Expected:** Name textbox autofocuses and accepts typing
    - **Actual:** No caret appears; keyboard input ignored
    - **Impact:** Cannot create new Pals
    - **Suspected causes:** Missing autofocus logic, disabled/readonly attributes, focus trap issues
    - **Due:** Current Sprint

### P1 - High Priority Bugs
- 🔴 **[BUG-003] Race condition when multiple chats arrive before data save completes**
- 🔴 **[BUG-004] Duplicate keyword echoing in journal focus selection**
- 🔴 **[BUG-005] Intermittent telemetry write failures on Windows sandboxed installs**

## 🚀 FEATURES & ENHANCEMENTS
### Current Sprint - Critical Priority
- 🟡 **[FEAT-001] AI meaningful response system**
    - **Description:** Create plan for AI to respond meaningfully to user messages
    - **Status:** IN PROGRESS
    - **Progress:** 
        - ✅ Implemented training on USER messages only (breaks gibberish feedback loop)
        - ✅ Added quality checks to Markov chain output
        - ✅ Added template-based fallback responses
        - 🔄 Need to test and iterate based on results
    - **Estimate:** L

- 🔴 **[FEAT-002] Proper concurrency handling for JSON file operations**
    - **Description:** Implement thread-safe file operations
    - **Priority:** Critical
    - **Estimate:** M

- 🔴 **[FEAT-003] Bootstrap profile files structure correction**
    - **Description:** Fix chat-log.json, memories.json, vocabulary.json, journal.json array structures
    - **Priority:** Critical
    - **Estimate:** S

### High Priority - Essential Features
- 🔴 **[FEAT-004] Test new learning systems**
    - **Description:** Comprehensive testing of recently implemented systems
    - **Acceptance Criteria:**
        - 🔴 Test affirmation system ("Yes, happy is good" reinforces concepts)
        - 🔴 Test temporal memory system with decay
        - 🔴 Test curiosity system (low knowledge → "Why?" questions)
        - 🔴 Test priority learning chains (3.5-4.0x multiplier)
        - 🔴 Test definitional learning ("X means Y" patterns)
        - 🔴 Test quotation learning and correction system
    - **Estimate:** L
    - **Note:** **RESTART MYPAL APP to activate new features**

- 🔴 **[FEAT-005] Developer debug mode**
    - **Description:** Create debug/developer mode toggle in Settings
    - **Acceptance Criteria:**
        - 🔴 Enable verbose logging
        - 🔴 Add testing features in frontend UI
        - 🔴 Developer tool access
    - **Estimate:** M

- 🔴 **[FEAT-006] Enhanced help system**
    - **Description:** Expand help tooltips across all tabs
    - **Acceptance Criteria:**
        - 🔴 Stats tab (XP/CP/Level/Advancement explanations)
        - 🔴 Brain tab (node/edge visualization guide)  
        - 🔴 Settings tab (explain each configuration option)
    - **Status:** Memories and Journal tooltips completed
    - **Estimate:** M

- 🔴 **[FEAT-007] Change "Concepts" menu to "Knowledge Base" throughout UI and docs for clarity**
    - **Description:** Rename all instances of "Concepts" to "Knowledge Base"
    - **Acceptance Criteria:**
        - 🔴 Update menu/tab labels in UI
        - 🔴 Update documentation references
        - 🔴 Ensure consistency across app
    - **Estimate:** S

- 🔴 **[FEAT-008] UI refactor for style consistency**
    - **Description:** Update UI components to match STYLE_DESIGN_IDEA.md guidelines
    - **Acceptance Criteria:**
        - 🔴 Update fonts to 'Rounded Elegance' for headings
        - 🔴 Ensure color palette matches design doc
        - 🔴 Standardize button and input field styles
    - **Estimate:** M

### Backlog - Medium Priority
- 🔴 **[FEAT-007] Local database implementation**
    - **Description:** Replace JSON file persistence with proper local database (lowdb or nedb)
    - **Estimate:** L

- 🔴 **[FEAT-008] Brain visualization enhancements**
    - **Description:** Interactive brain graph improvements
    - **Acceptance Criteria:**
        - 🔴 Double-click node to zoom and isolate
        - 🔴 Dynamic strength/opacity edges
        - 🔴 Lobe coloring
    - **Estimate:** L

- [ ] [FEAT-009] Conversation system improvements
    - **Description:** Enhanced chat functionality
    - **Acceptance Criteria:**
        - [ ] History pagination
        - [ ] Streaming responses with cancellation
        - [ ] Keyboard shortcuts and accessibility
    - **Estimate:** M

## 🔧 TECHNICAL DEBT
### Refactoring
- [ ] [TECH-001] Vocabulary teaching flow implementation
    - **Description:** Complete user-defined meanings system
    - **Status:** Single-word constraint completed
    - **Remaining:** UI components and validation
    - **Estimate:** M

- [ ] [TECH-002] S-V-O schema validation for speech construction
    - **Description:** Implement proper sentence structure validation
    - **Dependencies:** Telegraphic speech system (completed)
    - **Estimate:** M

### Dependencies
- [ ] [DEPS-001] Development setup documentation
    - **Description:** Fix path issues in setup documentation
    - **Priority:** Medium
    - **Breaking Changes:** No
    - **Estimate:** S

## 📋 MAINTENANCE
### Performance
- [ ] [PERF-001] Conversation history pruning ✅
    - **Status:** COMPLETED
    - **Description:** Prevent memory bloat

- [ ] [PERF-002] Brain graph lazy loading
    - **Description:** Optimize visualization performance
    - **Estimate:** M

- [ ] [PERF-003] JSON I/O optimization
    - **Description:** Improve file operation performance
    - **Estimate:** S

### Security
- [ ] [SEC-001] API key masking in settings UI
- [ ] [SEC-002] Content filtering for user inputs
- [ ] [SEC-003] Proper secrets management for local storage

## 🧪 TESTING
- [ ] [TEST-001] Automated testing framework
    - **Description:** Unit tests for XP/level logic
    - **Estimate:** L

- [ ] [TEST-002] UI/E2E tests for critical flows
    - **Description:** Main Menu → New Pal → Name input functionality
    - **Priority:** High (prevents BUG-002 regression)
    - **Estimate:** M

- [ ] [TEST-003] Learning system integration tests
    - **Description:** Test affirmation, curiosity, and learning chain systems
    - **Estimate:** L

## 🚢 DEPLOYMENT & INFRASTRUCTURE
- [ ] [DEPLOY-001] Electron builder configuration fix
    - **Description:** Fix builds for all platforms
    - **Priority:** High
    - **Estimate:** M

- [ ] [DEPLOY-002] Installer packages
    - **Description:** Create installers for Windows (.exe), macOS, and Linux
    - **Dependencies:** DEPLOY-001
    - **Estimate:** L

- [ ] [INFRA-001] Update mechanism
    - **Description:** Implement automatic update system
    - **Estimate:** L

## 📈 FUTURE ROADMAP
### Q1 Goals - Advanced Features
- [ ] Multiple pal personality archetypes (curious scholar, playful companion, wise mentor)
- [ ] CP (Cognition Points) spending store/menu
- [ ] Plugin system architecture and hooks
- [ ] Avatar evolution visual system

### Q2 Goals - Long-term Vision
- [ ] Cloud sync data structures and APIs
- [ ] Shared memory across multiple devices
- [ ] Sandboxed third-party tool integrations
- [ ] Ethical guardrails and transparency UX

### Persona & Customization Roadmap
- [ ] Pal-specific visual avatars and evolution stages
- [ ] Customizable catchphrases and intro greetings
- [ ] Wardrobe/inventory system for avatar accessories
- [ ] Personality boost purchases and cosmetic unlocks

### Rewards & Progression Systems
- [ ] Weekly quests encouraging teaching new topics
- [ ] Gratitude journal bonus rewards for daily check-ins
- [ ] Mini-games and challenges for CP earning
- [ ] Milestone rewards and achievement system

## ✅ RECENTLY COMPLETED
### Core Functionality ✅
- [x] Fixed dependency installation error - Express module not found
- [x] Fixed launcher path resolution for backend entry point
- [x] Implemented proper error handling for backend crashes
- [x] Fixed menu tab switching and chat response rendering
- [x] Learning speed slider no longer resets when sending message
- [x] Fixed reset Pal button to clear all data files
- [x] Improved reset confirmation dialogue

### Learning Systems ✅
- [x] Implemented concept valence/strength for reinforcement
- [x] Added quotation detection for direct speech learning
- [x] Implemented correction detection ("Don't say X, say Y")
- [x] Added negative reinforcement system to avoid corrected phrases
- [x] Created comprehensive CONCEPTUAL_INTELLIGENCE.md design document
- [x] Implemented affirmation detection and reinforcement learning
- [x] Added temporal memory classification with decay system
- [x] Implemented curiosity-driven questioning system
- [x] Created priority learning chains with multipliers
- [x] Added definitional learning system ("X means Y" patterns)

### UI/UX Improvements ✅
- [x] Added subjective narrative to memories with special styling
- [x] Created dedicated Settings tab for configuration
- [x] Added help icon tooltips to Memories and Journal sections
- [x] Implemented proper loading states and error feedback
- [x] Added disabled button states with loading animations
- [x] Implemented theme selector (light/dark/colorblind friendly)

---

## Legend
- 🐛 **P0:** Drop everything and fix immediately
- 🔥 **P1:** Fix within current sprint  
- ⭐ **P2:** Fix within current release
- 📅 **P3:** Fix when time permits

## Status Labels
- `TODO` - Not started
- `IN PROGRESS` - Currently being worked on  
- `BLOCKED` - Waiting on external dependency
- `REVIEW` - Ready for code review
- `DONE` - Completed and deployed

## Estimates
- **XS:** < 2 hours
- **S:** 2-8 hours  
- **M:** 1-3 days
- **L:** 3-7 days
- **XL:** 1-2 weeks