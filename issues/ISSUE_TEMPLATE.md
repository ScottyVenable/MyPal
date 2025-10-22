# GitHub Issue Creation Request Template

## File Naming Convention
**Save this file as:** `[type]--[brief-description].md`

**Examples:**
- `[bug]--typing-indicator-blocking.md`
- `[feature]--offline-ai-models.md`
- `[enhancement]--mobile-performance.md`
- `[docs]--setup-guide-update.md`

## Issue Information
**Title:** [Clear, descriptive title for the GitHub issue]

**Type:** [Bug Report / Feature Request / Enhancement / Documentation / Question]

**Priority:** [High / Medium / Low]

**Labels:** [Suggested labels for the GitHub issue, comma-separated]
- Examples: `bug`, `enhancement`, `documentation`, `mobile`, `backend`, `ai-integration`

## Description
[Detailed description of the issue or feature request]

## Context
**Related Files/Components:**
- [ ] Mobile App (`/mobile`)
- [ ] Backend Server (`/app/backend`) 
- [ ] Frontend (`/app/frontend`)
- [ ] AI/LLM Integration
- [ ] Database/Storage
- [ ] Documentation
- [ ] Other: ___________

**Current Behavior:** (for bugs)
[What currently happens]

**Expected Behavior:** (for bugs/enhancements)
[What should happen instead]

## Reproduction Steps (for bugs)
1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Observed result]

## Acceptance Criteria (for features/enhancements)
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Technical Details
**Environment:**
- OS: [Windows/iOS/Android]
- App Version: [Current version]
- Node.js Version: [If backend related]
- React Native Version: [If mobile related]

**Error Messages/Logs:**
```
[Paste any relevant error messages or log entries here]
```

**Code References:**
- Files: [List relevant files]
- Functions/Components: [List relevant code sections]
- Line Numbers: [If applicable]

## Implementation Notes
**Suggested Approach:**
[Your thoughts on how this should be implemented]

**Potential Challenges:**
[Any anticipated difficulties or considerations]

**Dependencies:**
[Other issues or features this depends on]

## GitHub CLI Command
```bash
# Use this command to create the GitHub issue:
gh issue create \
  --title "[TITLE FROM ABOVE]" \
  --body-file "[PATH TO THIS FILE OR CUSTOM BODY]" \
  --label "[LABELS FROM ABOVE]" \
  --assignee "ScottyVenable"
```

## Additional Information
**References:**
- Related Issues: [Link to other GitHub issues]
- Documentation: [Link to relevant docs]
- External Resources: [Any helpful links]

**Screenshots/Mockups:**
[Attach or describe any visual aids]

---
**Template Usage:**
1. Fill out this template completely
2. Save as a new file in `/issues/` folder
3. Use the GitHub CLI command above to create the actual GitHub issue
4. Update local file with GitHub issue number and link
5. Commit changes: `[GITHUB] Create issue #XXX: [Title]`