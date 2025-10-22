# GitHub Issue Creation Request Template

## File Naming Convention
**Saved as:** `[bug]--pal-returns-question-level-2.md`

## Issue Information
**Title:** Pal returns a question instead of answering at Level 2  
**Type:** Bug Report  
**Priority:** High  
**Labels:** bug, backend, ai-integration

## Description
At the Level 2 cognitive setting, Pal responds to factual user questions with a follow-up question instead of the expected direct answer. This behavior makes Level 2 unreliable for users who need straightforward factual responses.

## Context
**Related Files/Components:**
- [ ] Mobile App (`/mobile`)
- [x] Backend Server (`/app/backend`)
- [ ] Frontend (`/app/frontend`)
- [x] AI/LLM Integration
- [ ] Database/Storage
- [ ] Documentation
- [ ] Other: ___________

**Current Behavior:**
When the Pal is configured at Level 2, it deflects information requests by asking clarifying questions (for example, “Why do you want to know?”) instead of returning the factual answer.

**Expected Behavior:**
Level 2 should produce concise factual answers for straightforward queries without asking follow-up questions unless necessary.

## Reproduction Steps
1. Launch MyPal.
2. Configure or select a Pal at Level 2.
3. Ask a factual question such as “What is the capital of France?”
4. Observe that the Pal replies with another question rather than the factual answer.

## Acceptance Criteria
- [ ] Regression test ensures Level 2 returns direct answers for factual prompts.
- [ ] Curiosity/clarification thresholds tuned for Level 2 behavior.
- [ ] Level routing confirms information requests bypass question-generation flow.

## Technical Details
**Environment:**
- OS: Windows 10/11
- App Version: v0.2.0-alpha (current)
- Node.js Version: 18.x (backend runtime)
- React Native Version: N/A

**Error Messages/Logs:**
```
No explicit errors logged; behavior observed through chat responses.
```

**Code References:**
- Files: `app/backend/src/server.js`, `app/backend/src/profileManager.js`
- Functions/Components: Response routing, curiosity threshold checks
- Line Numbers: To be investigated during fix

## Implementation Notes
**Suggested Approach:**
Audit the intent classification and level gating logic to ensure Level 2 requests route through direct-answer generation. Adjust curiosity thresholds or disable “why” prompts for low levels. Add a regression test covering Level 2 factual responses.

**Potential Challenges:**
Balancing curiosity triggers across other levels while fixing Level 2 behavior. Ensuring the change does not regress higher-level conversational depth.

**Dependencies:**
None identified beyond existing backend response pipeline.

## GitHub CLI Command
```bash
gh issue create \
  --title "Pal returns a question instead of answering at Level 2" \
  --body-file "issues/[bug]--pal-returns-question-level-2.md" \
  --label "bug,backend,ai-integration" \
  --assignee "ScottyVenable"
```

## Additional Information
**References:**
- Related Issues: TODO – add link after GitHub issue creation
- Documentation: `docs/updates/v0.2.0-alpha_IMPLEMENTATION_SUMMARY.md`
- External Resources: N/A

**Screenshots/Mockups:**
Not available.
