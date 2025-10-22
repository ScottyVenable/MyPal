# Scripts Directory

This directory contains utility scripts for the MyPal project.

## Available Scripts

### create-github-issues.sh

Creates GitHub issues from the documented bugs and features found in the TODO files.

**Prerequisites:**
- GitHub CLI (`gh`) must be installed
- You must be authenticated with GitHub (`gh auth login`)
- You must have write access to the repository

**Usage:**
```bash
cd /path/to/MyPal
./scripts/create-github-issues.sh
```

The script will:
1. Verify GitHub CLI is installed and authenticated
2. Ask for confirmation before creating issues
3. Create issues with appropriate labels, descriptions, and priorities
4. Display a summary of created issues

**What it creates:**
- 8 bug reports (P0-P2 priority)
- 4 high-priority feature enhancements
- 3 infrastructure improvements
- 4 security issues

All issues are created with:
- Detailed descriptions
- Steps to reproduce (for bugs)
- Acceptance criteria (for features)
- References to TODO file line numbers
- Appropriate labels for categorization

**After running:**
View created issues with:
```bash
gh issue list
gh issue list --label bug
gh issue list --label P0-critical
```

## Notes

- The script is idempotent-safe by default (GitHub will prevent exact duplicates)
- You can cancel the script at the confirmation prompt
- Issues are created in the order: P0 bugs → P1 bugs → Features → Infrastructure → Security
- Each issue includes emoji prefixes for easy visual identification

## Additional Documentation

For a complete list of all identified issues with full descriptions, see:
- `ISSUES_TO_CREATE.md` - Comprehensive catalog of all bugs and features
