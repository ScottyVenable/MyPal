# Quick Start: Creating GitHub Issues

## 🎯 Goal
Turn 53+ documented bugs and features from TODO files into GitHub Issues.

## ⚡ Fast Track (Recommended)

### Step 1: Install GitHub CLI (if not already installed)
```bash
# macOS
brew install gh

# Windows
winget install --id GitHub.cli

# Linux
# See: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
```

### Step 2: Authenticate
```bash
gh auth login
# Follow the prompts to authenticate
```

### Step 3: Run the Script
```bash
cd /path/to/MyPal
./scripts/create-github-issues.sh
```

That's it! The script will create 23 high-priority issues in about 1-2 minutes.

## 📋 What Gets Created

The script creates **23 prioritized issues**:

### Critical (P0) - 2 issues
- 🐛 Pal returns question instead of answering at Level 2
- 🐛 New Pal name textbox uneditable after menu return

### High Priority (P1) - 6 issues
- 🐛 Race condition in chat data save
- 🐛 Duplicate keyword echoing
- 🐛 Telemetry failures on Windows
- 🐛 Neuron view not closing
- 🐛 Pop-out modal drag jump
- 🐛 Bootstrap files structure

### Features & Enhancements - 4 issues
- 🧪 Test new learning systems
- 🛠️ Developer debug mode
- ❓ Enhanced help system
- 📝 Rename "Concepts" to "Knowledge Base"

### Infrastructure - 3 issues
- 📚 Fix setup documentation
- 🔧 Electron builder fix
- 🧪 Automated testing framework

### Security - 4 issues
- 🔒 API key masking
- 🔒 Content filtering
- 🔒 Secrets management
- 🔒 Privacy mode

## 🔍 View All Issues

See `ISSUES_TO_CREATE.md` for the complete catalog of all 53 issues.

## 📖 Detailed Documentation

- `GITHUB_ISSUES_SUMMARY.md` - Complete overview and statistics
- `ISSUES_TO_CREATE.md` - Full catalog with all details
- `scripts/README.md` - Script documentation

## 🛑 Troubleshooting

**Script fails with "gh: command not found"**
- Install GitHub CLI (see Step 1 above)

**Script fails with "not authenticated"**
- Run `gh auth login` (see Step 2 above)

**Script fails with "permission denied"**
- Ensure you have write access to the repository
- Check you're running from the correct repository

**Want to create issues manually?**
- Use GitHub web interface
- Copy issue details from `ISSUES_TO_CREATE.md`

## ✅ After Running

1. Verify issues were created: `gh issue list`
2. View by priority: `gh issue list --label P0-critical`
3. View by type: `gh issue list --label bug`

## 🎉 Success!

Once issues are created:
- Check them at: https://github.com/ScottyVenable/MyPal/issues
- Add milestones for sprint planning
- Assign team members
- Start closing bugs! 🐛➡️✅
