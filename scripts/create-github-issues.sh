#!/bin/bash

# Script to create GitHub issues from identified bugs and features
# This script uses GitHub CLI (gh) to create issues from the documented list

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}MyPal GitHub Issue Creator${NC}"
echo -e "${YELLOW}This script will create GitHub issues for documented bugs and features${NC}"
echo ""

# Check if gh CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✓ GitHub CLI is installed and authenticated${NC}"
echo ""

# Confirm before proceeding
read -p "This will create multiple issues in the repository. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Creating issues...${NC}"
echo ""

# Counter for created issues
created=0

# ============================================================================
# CRITICAL PRIORITY ISSUES (P0)
# ============================================================================

echo -e "${GREEN}Creating P0 (Critical) issues...${NC}"

# BUG-001: Pal returns question instead of answering at Level 2
gh issue create \
  --title "🐛 Pal returns question instead of answering at Level 2" \
  --label "bug,P0-critical,cognitive-system" \
  --body "## Description
At Level 2 cognitive setting, when users ask direct factual questions (e.g., \"What is the capital of France?\"), the Pal responds with a question instead of providing an answer (e.g., \"Why do you want to know?\").

## Environment
MyPal app (Level 2 cognitive setting)

## Steps to Reproduce
1. Launch MyPal and select/configure a Pal at Level 2
2. In chat, ask a direct factual question (e.g., \"What is the capital of France?\")
3. Observe the Pal's response

## Expected Behavior
At Level 2 the Pal should return a concise, direct answer (or a low-complexity response), not deflect with another question.

## Actual Behavior
Pal replies with a question (e.g., \"Why do you want to know?\") instead of giving an answer.

## Impact
Users do not receive expected information; degrades conversational utility.

## Suspected Causes
- Curiosity/clarification trigger thresholds too aggressive for Level 2
- Intent classification mislabeling information requests
- Level-gating logic routing to question-generation path

## Suggested Fixes
- Add unit/UI test asserting direct-answer behavior for factual queries at Level 2
- Adjust curiosity/why-question thresholds for Level ≤2
- Verify intent classification and response-routing for \"information request\" intents

## References
- TODO line 4-18
- TODO v0.2.md line 5-16" \
  && echo -e "${GREEN}✓ Created BUG-001${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create BUG-001${NC}"

# BUG-002: New Pal name textbox uneditable
gh issue create \
  --title "🐛 New Pal name textbox uneditable after returning to main menu" \
  --label "bug,P0-critical,ui,input-focus" \
  --body "## Description
The Name textbox in the New Pal dialog becomes uneditable when accessed after returning to the Main Menu from the app window. No caret appears and keyboard input is completely ignored.

## Environment
MyPal UI (New Pal dialog), reproduces on main menu return flow

## Severity
High — prevents creating new Pal

## Frequency
Always (when following reproduction steps)

## Steps to Reproduce
1. Launch MyPal
2. From the app window, press \"Exit\" to return to Main Menu
3. Click \"New Pal\" to open the New Pal dialog
4. Attempt to type in the Name textbox

## Expected Behavior
Name textbox autofocuses when the New Pal dialog opens and accepts typing.

## Actual Behavior
No caret appears; keyboard input is ignored and textbox does not accept focus.

## Suspected Causes
- Missing autofocus logic when dialog is opened from Main Menu return path
- Input rendered with disabled/readonly attribute
- Focus trap or overlay element blocking input events
- Incorrect z-index stacking preventing click/focus
- Event handler preventing key events or stealing focus

## Suggested Fixes
- Ensure New Pal dialog sets focus to Name input on open (add autofocus or programmatic focus in dialog open handler)
- Verify input does not have disabled/readonly attributes in this code path
- Inspect DOM stacking and remove blocking overlays or fix z-index
- Audit keyboard/focus-related event handlers for unintended preventDefault()/stopPropagation()
- Add automated UI/E2E test: open Main Menu → New Pal → assert Name input has focus and accepts text entry
- Add unit test for dialog open lifecycle to prevent regressions

## References
- TODO line 19-46
- TODO v0.2.md line 18-30" \
  && echo -e "${GREEN}✓ Created BUG-002${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create BUG-002${NC}"

# ============================================================================
# HIGH PRIORITY ISSUES (P1)
# ============================================================================

echo ""
echo -e "${GREEN}Creating P1 (High) issues...${NC}"

# BUG-003: Race condition
gh issue create \
  --title "🐛 Race condition when multiple chats arrive before data save completes" \
  --label "bug,P1-high,concurrency,backend" \
  --body "## Description
Multiple chat messages arriving before the data save operation completes can result in data inconsistency or loss.

## Impact
Data corruption or loss of chat messages

## Suggested Fixes
- Implement proper concurrency handling for JSON file operations
- Add queue-based processing for chat messages
- Implement file locking mechanism

## References
- TODO line 55
- TODO v0.2.md line 33" \
  && echo -e "${GREEN}✓ Created BUG-003${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create BUG-003${NC}"

# BUG-004: Duplicate keyword echoing
gh issue create \
  --title "🐛 Duplicate keyword echoing in journal focus selection" \
  --label "bug,P1-high,ui,journal" \
  --body "## Description
Keywords appear duplicated when selecting journal focus entries.

## References
- TODO line 101
- TODO v0.2.md line 34" \
  && echo -e "${GREEN}✓ Created BUG-004${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create BUG-004${NC}"

# BUG-005: Telemetry failures
gh issue create \
  --title "🐛 Intermittent telemetry write failures on Windows sandboxed installs" \
  --label "bug,P1-high,windows,telemetry,filesystem" \
  --body "## Description
Telemetry data fails to write intermittently on Windows installations, particularly in sandboxed environments.

## Impact
Loss of telemetry data and potential debugging information

## Suggested Investigation
- Check file permissions in Windows sandboxed environments
- Verify paths are correctly resolved in all Windows configurations
- Add retry logic with exponential backoff

## References
- TODO line 102
- TODO v0.2.md line 35" \
  && echo -e "${GREEN}✓ Created BUG-005${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create BUG-005${NC}"

# BUG-006: Neuron view not closing
gh issue create \
  --title "🐛 Pressing 'X' on a neuron view not closing the view" \
  --label "bug,P1-high,ui,brain-visualization" \
  --body "## Description
Clicking the 'X' button on the neuron detail view does not close the view as expected.

## References
- TODO v0.2.md line 36" \
  && echo -e "${GREEN}✓ Created BUG-006${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create BUG-006${NC}"

# BUG-007: Modal drag issue
gh issue create \
  --title "🐛 Pop-out Chat Modal initial drag jump/offset" \
  --label "bug,P1-high,ui,drag-and-drop,mobile" \
  --body "## Description
When grabbing the pop-out chat modal to move it, the modal initially jumps away from the cursor (or finger). After the jump, dragging functions normally.

## Environment
Mobile app, pop-out chat modal

## Steps to Reproduce
1. Open the pop-out chat modal
2. Click/press and hold the modal header (or drag handle) and start moving immediately
3. Observe the modal jump to a different position before following the cursor

## Expected Behavior
Modal should start moving immediately under the cursor/finger with no positional jump; the cursor should retain the same relative offset to the modal during the entire drag.

## Actual Behavior
Modal jumps to a different position on initial drag before following cursor normally.

## Impact
Poor UX — imprecise placement, user frustration when attempting to drag the modal to a specific location.

## Suspected Causes
- Initial pointer offset not captured on pointerdown/mousedown
- Using CSS transform/translate or transitions that reset position when drag starts
- Coordinate space mismatch (clientX/clientY vs element offsets)
- Delayed switching from non-drag to drag positioning

## Suggested Fixes
- Store pointer-to-element offset on pointerdown/mousedown
- Use pointer events and pointer capture (element.setPointerCapture)
- Avoid CSS transitions while dragging
- Compute initial top/left before enabling dragging

## Files to Inspect
- Pop-out modal component (components/PopoutChatModal.tsx or screens/ChatPopout.*)
- Drag utility hooks (hooks/useDraggable.ts)
- CSS / style definitions

## References
- quick_todo.md line 5-29" \
  && echo -e "${GREEN}✓ Created BUG-007${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create BUG-007${NC}"

# BUG-008: Bootstrap files
gh issue create \
  --title "🐛 Correct new profile bootstrap files structure" \
  --label "bug,P2-medium,backend,data-structure" \
  --body "## Description
Bootstrap files (chat-log.json, memories.json, vocabulary.json, journal.json) need to use array structures expected by runtime loops.

## Impact
Runtime errors when accessing newly created profiles

## References
- TODO line 57
- TODO v0.2.md line 51-58" \
  && echo -e "${GREEN}✓ Created BUG-008${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create BUG-008${NC}"

# ============================================================================
# FEATURE REQUESTS (Most Critical)
# ============================================================================

echo ""
echo -e "${GREEN}Creating high-priority feature issues...${NC}"

# FEAT-001: Test learning systems
gh issue create \
  --title "🧪 Test new learning systems comprehensively" \
  --label "enhancement,testing,learning-system" \
  --body "## Description
Comprehensive testing of recently implemented learning systems is required before considering them production-ready.

**Note:** **RESTART MYPAL APP to activate new features**

## Acceptance Criteria
- [ ] Test affirmation system: \"Yes, happy is good\" should reinforce happy (+8), good (+6), and relationship (+10)
- [ ] Test affirmation system: \"You are right! Eating is important\" should trigger curiosity → \"Why is eating important?\"
- [ ] Test temporal memory system: \"No, today is Tuesday\" should learn as temporal-fact with 50%/day decay
- [ ] Check memory decay runs at 2 AM daily
- [ ] Test curiosity system: Low knowledge → \"Why?\" questions
- [ ] Test curiosity sophistication matches level (L0-3: \"Why?\", L11+: full sentences)
- [ ] Test priority learning chains: 3.5-4.0x multiplier for answers
- [ ] Check learningChains metadata in vocabulary entries
- [ ] Test definitional learning: \"X means Y\" patterns
- [ ] Test quotation learning and correction system

## Estimate
Large

## References
- TODO line 61-89
- TODO v0.2.md line 61-74" \
  && echo -e "${GREEN}✓ Created FEAT-001${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create FEAT-001${NC}"

# FEAT-002: Developer mode
gh issue create \
  --title "🛠️ Developer debug mode" \
  --label "enhancement,developer-tools,ui" \
  --body "## Description
Create a \"debug\" or \"developer\" mode toggle in Settings to enable verbose logging and testing features.

## Acceptance Criteria
- [ ] Enable verbose logging toggle
- [ ] Add testing features in frontend UI
- [ ] Developer tool access
- [ ] Console output controls

## Estimate
Medium

## References
- TODO line 62
- TODO v0.2.md line 75-79" \
  && echo -e "${GREEN}✓ Created FEAT-002${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create FEAT-002${NC}"

# FEAT-003: Help system
gh issue create \
  --title "❓ Enhanced help system across all tabs" \
  --label "enhancement,documentation,ui,help" \
  --body "## Description
Expand help tooltips to all tabs for better user guidance.

**Status:** Memories and Journal tooltips already completed ✅

## Acceptance Criteria
- [ ] Stats tab: Add explanations for XP/CP/Level/Advancement
- [ ] Brain tab: Add node/edge visualization guide
- [ ] Settings tab: Explain each configuration option

## Estimate
Medium

## References
- TODO line 89-91
- TODO v0.2.md line 81-88" \
  && echo -e "${GREEN}✓ Created FEAT-003${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create FEAT-003${NC}"

# FEAT-004: Rename Concepts
gh issue create \
  --title "📝 Rename 'Concepts' to 'Knowledge Base' throughout UI and docs" \
  --label "enhancement,ui,documentation,naming" \
  --body "## Description
Change \"Concepts\" menu to \"Knowledge Base\" throughout UI and documentation for improved clarity.

## Acceptance Criteria
- [ ] Update menu/tab labels in UI
- [ ] Update documentation references
- [ ] Ensure consistency across app

## Estimate
Small

## References
- TODO v0.2.md line 90-96" \
  && echo -e "${GREEN}✓ Created FEAT-004${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create FEAT-004${NC}"

# ============================================================================
# INFRASTRUCTURE ISSUES
# ============================================================================

echo ""
echo -e "${GREEN}Creating infrastructure issues...${NC}"

# INFRA-001: Documentation
gh issue create \
  --title "📚 Fix development setup documentation" \
  --label "documentation,setup,developer-experience,good-first-issue" \
  --body "## Description
Fix path issues in development setup documentation to help new developers get started more easily.

## Priority
Medium

## Estimate
Small

## References
- TODO line 97
- TODO v0.2.md line 141-145" \
  && echo -e "${GREEN}✓ Created INFRA-001${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create INFRA-001${NC}"

# INFRA-002: Electron builder
gh issue create \
  --title "🔧 Electron builder configuration fix" \
  --label "build,deployment,electron,P1-high" \
  --body "## Description
Fix Electron builder configuration for all platforms (Windows, macOS, Linux).

## Priority
High

## Estimate
Medium

## References
- TODO line 170
- TODO v0.2.md line 181-184" \
  && echo -e "${GREEN}✓ Created INFRA-002${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create INFRA-002${NC}"

# INFRA-003: Testing framework
gh issue create \
  --title "🧪 Add automated testing framework" \
  --label "testing,infrastructure,quality" \
  --body "## Description
Add automated testing framework with unit tests for XP/level logic and other core functionality.

## Acceptance Criteria
- [ ] Unit test framework setup
- [ ] Integration test framework
- [ ] CI/CD integration for automated testing
- [ ] Code coverage reporting

## Estimate
Large

## References
- TODO line 131
- TODO v0.2.md line 167-169" \
  && echo -e "${GREEN}✓ Created INFRA-003${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create INFRA-003${NC}"

# ============================================================================
# SECURITY ISSUES
# ============================================================================

echo ""
echo -e "${GREEN}Creating security issues...${NC}"

# SEC-001: API key masking
gh issue create \
  --title "🔒 API key masking in settings UI" \
  --label "security,ui,privacy" \
  --body "## Description
Implement proper API key masking in settings UI to prevent shoulder surfing and accidental exposure.

## References
- TODO line 160
- TODO v0.2.md line 161" \
  && echo -e "${GREEN}✓ Created SEC-001${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create SEC-001${NC}"

# SEC-002: Content filtering
gh issue create \
  --title "🔒 Content filtering for user inputs" \
  --label "security,input-validation" \
  --body "## Description
Add content filtering to protect against malicious or inappropriate user inputs.

## References
- TODO line 161
- TODO v0.2.md line 162" \
  && echo -e "${GREEN}✓ Created SEC-002${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create SEC-002${NC}"

# SEC-003: Secrets management
gh issue create \
  --title "🔒 Proper secrets management for local storage" \
  --label "security,storage,encryption" \
  --body "## Description
Implement proper secrets management for sensitive data in local storage.

## References
- TODO line 162
- TODO v0.2.md line 163" \
  && echo -e "${GREEN}✓ Created SEC-003${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create SEC-003${NC}"

# SEC-004: Privacy mode
gh issue create \
  --title "🔒 Privacy mode to disable telemetry" \
  --label "security,privacy,telemetry" \
  --body "## Description
Create privacy mode that disables telemetry and sensitive logging entirely.

## References
- TODO line 167" \
  && echo -e "${GREEN}✓ Created SEC-004${NC}" && ((created++)) || echo -e "${RED}✗ Failed to create SEC-004${NC}"

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Issue Creation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Total issues created: ${created}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the created issues on GitHub"
echo "2. Add milestones and projects as needed"
echo "3. Assign team members to appropriate issues"
echo "4. Prioritize issues for the next sprint"
echo ""
echo -e "${GREEN}View all issues: gh issue list${NC}"
echo -e "${GREEN}View issues by label: gh issue list --label <label>${NC}"
echo ""
