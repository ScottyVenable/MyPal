# GitHub Issue Creation Request Template

## File Naming Convention
**Saved as:** `[bug]--pal-returns-question-level-2.md`

## Issue Information
**Title:** Pal returns a question instead of answering at Level 2
**Type:** Bug Report
**Priority:** High
**Labels:** bug, backend, ai-integration

## Description
At the Level 2 cognitive setting, Pal replies to factual user prompts with a follow-up question (for example, “Why do you want to know?”) instead of providing a direct answer. This regression makes Level 2 unusable for users who need straightforward information.

## Context
**Related Files/Components:**
- [ ] Mobile App (`/mobile`)
- [x] Backend Server (`/app/backend`)
- [ ] Frontend (`/app/frontend`)
- [x] AI/LLM Integration
- [ ] Database/Storage
- [ ] Documentation
- [ ] Testing
- [ ] Security
- [ ] Other: ___________

**Current Behavior:** (for bugs)
Level 2 deflects factual queries with curiosity-style questions.

**Expected Behavior:** (for bugs/enhancements)
Level 2 should respond with concise, factual answers without unnecessary follow-up questions.

## Reproduction Steps (for bugs)
1. Launch MyPal.
2. Configure or select a Level 2 Pal.
3. Ask a factual question such as “What is the capital of France?”
4. Observe the Pal answering with a question instead of a fact.

## Acceptance Criteria (for features/enhancements)
- [ ] Regression test ensures Level 2 returns direct answers for factual prompts.
- [ ] Curiosity/clarification thresholds tuned appropriately for Level 2.
- [ ] Intent routing confirms information requests avoid question-generation paths.

## Technical Details
**Environment:**
- OS: Windows 10/11
- App Version: v0.2.0-alpha (current)
- Node.js Version: 18.x
- React Native Version: N/A

**Error Messages/Logs:**
```
No explicit errors; behavior observed via chat responses.
```

**Code References:**
- Files: app/backend/src/server.js, app/backend/src/profileManager.js
- Functions/Components: Intent classification, curiosity thresholds
- Line Numbers: Identify during debugging

## Implementation Notes
**Suggested Approach:**
Audit response routing for Level 2, adjust curiosity gates, and add regression tests for factual question handling.

**Potential Challenges:**
Balancing curiosity across higher levels without reintroducing regressions.

**Dependencies:**
None currently identified.

## GitHub CLI Command
```bash
gh issue create \
  --title "Pal returns a question instead of answering at Level 2" \
  --body-file "issues/bugs/[bug]--pal-returns-question-level-2.md" \
  --label "bug" \
  --label "backend" \
  --label "ai-integration" \
  --assignee "ScottyVenable"
```

## Additional Information
**References:**
- Related Issues: TODO – link after creation
- Documentation: docs/updates/v0.2.0-alpha_IMPLEMENTATION_SUMMARY.md
- External Resources: N/A

**Screenshots/Mockups:**
Capture chat transcript showing the deflecting response.
