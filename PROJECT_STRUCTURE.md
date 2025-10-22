# MyPal Project Structure

This document provides a comprehensive overview of the MyPal project's directory structure and organization.

## Root Directory

```
MyPal/
├── .github/                    # GitHub configuration and workflows
│   ├── copilot-instructions.md # GitHub Copilot configuration
│   └── instructions/           # Project instructions for AI assistants
├── app/                        # Main application code
│   ├── backend/               # Node.js/Express backend server
│   └── frontend/              # Vanilla JavaScript frontend
├── docs/                       # Project documentation
│   ├── ai/                    # AI and LLM integration documentation
│   ├── analysis/              # Project analysis and metrics
│   ├── design/                # Design specifications and mockups
│   ├── development/           # Development guides and tools
│   ├── features/              # Feature documentation and specs
│   ├── performance_logs/      # Performance monitoring data
│   ├── research/              # Research and reference materials
│   ├── ui/                    # UI/UX documentation
│   └── updates/               # Release notes and update history
├── issues/                     # Issue tracking files (gitignored)
│   ├── bugs/                  # Active bug reports
│   └── [feature/enhancement]  # Feature and enhancement requests
├── launcher/                   # Electron desktop wrapper
├── mobile/                     # React Native mobile app (in development)
├── scripts/                    # Automation and utility scripts
├── TRASH/                      # Archived/outdated files (gitignored)
│   ├── fixed-bugs/            # Resolved bug documentation
│   └── outdated-docs/         # Superseded documentation
├── CHANGELOG.md               # Project changelog
├── PROJECT_STRUCTURE.md       # This file - project organization guide
├── quick_todo.md              # Quick notes and ideas (active)
└── README.md                  # Project overview and setup
```

## Directory Purposes

### `/app` - Application Code
**Main desktop application with frontend and backend.**

- **`/backend`**: Node.js/Express server
  - `/src` - Source code (server.js, profileManager.js, etc.)
  - `/data` - JSON-based local data storage
- **`/frontend`**: Vanilla JavaScript SPA
  - `app.js` - Main application logic (3600+ lines)
  - `index.html` - UI structure with three-tab interface
  - `styles.css` - Complete styling and responsive design
- **`/media`**: Images, logos, and assets

### `/docs` - Documentation
**All project documentation organized by category.**

- **`/ai`**: AI integration, prompts, and LLM configuration
- **`/analysis`**: Project metrics, performance analysis
- **`/design`**: UI/UX designs, wireframes, architecture diagrams
- **`/development`**: Developer guides (LOGGING_GUIDE.md, AGENT.md, etc.)
- **`/features`**: Feature specifications and implementation details
- **`/performance_logs`**: Performance monitoring and benchmarks
- **`/research`**: Research materials, psychology references
- **`/ui`**: UI component documentation and style guides
- **`/updates`**: Release notes, changelogs, roadmaps
  - `/patches` - Bug fix documentation

### `/issues` - Issue Tracking (Gitignored)
**Developer-only issue tracking files.**

- **`/bugs`**: Active bug reports awaiting fixes
- **`[feature]--*.md`**: Feature requests and enhancements
- **`[enhancement]--*.md`**: Improvement proposals
- **`[infrastructure]--*.md`**: Infrastructure and deployment issues
- **`create-github-issues.ps1`**: Script to create GitHub issues
- **`ISSUE_TEMPLATE.md`**: Template for new issues

**Note**: This folder is excluded from Git to keep local development organized separately from GitHub issues.

### `/launcher` - Electron Desktop Wrapper
**Electron configuration for desktop application.**

- `main.js` - Electron main process
- `preload.js` - Preload scripts for security
- `package.json` - Desktop app dependencies
- Auto-startup backend integration

### `/mobile` - React Native Mobile App (In Development)
**Mobile application implementation (not yet complete).**

- `/src` - Mobile app source code
  - `/components` - Reusable UI components
  - `/screens` - Screen components
  - `/services` - Business logic and APIs
  - `/hooks` - Custom React hooks
  - `/types` - TypeScript definitions
  - `/utils` - Utility functions
  - `/store` - State management
- `/nodejs-assets` - Embedded Node.js backend
- `/android` - Android-specific code
- `/ios` - iOS-specific code

### `/scripts` - Automation Scripts
**Utility and automation scripts.**

- `AUTORUN.ps1` - Auto-start script for development
- `generate_issue_files_from_todo.py` - Convert TODO items to issue files
- `refresh-tray-icon.ps1` - Tray icon refresh utility
- Other development automation tools

### `/TRASH` - Archived Files (Gitignored)
**Outdated files kept for historical reference.**

- **`/fixed-bugs`**: Resolved bug documentation
  - `CHAT_INPUT_BUG_FIX.md`
  - `TYPING_INDICATOR_FIX.md`
  - `TESTING_NEW_PAL_INPUT_FIX.md`
  - Resolved issue files from `/issues/bugs`
- **`/outdated-docs`**: Superseded documentation
  - Old TODO lists
  - Quick notes consolidated elsewhere
  - Deprecated guides

**Cleanup Policy**: Files can be deleted after 3-12 months depending on importance.

## Key Files (Root Level)

- **`CHANGELOG.md`**: Version history and changes
- **`PROJECT_STRUCTURE.md`**: This file - complete project organization guide
- **`quick_todo.md`**: Quick notes, ideas, and temporary task tracking
- **`README.md`**: Project overview, setup instructions, getting started
- **`MyPal.code-workspace`**: VS Code workspace configuration
- **`.gitignore`**: Git exclusions (node_modules, data, logs, TRASH, issues, etc.)

## Data Directories (Gitignored)

These folders contain runtime data and are excluded from version control:

- **`dev-data/`**: Development profile data (JSON files)
- **`dev-logs/`**: Development log files
- **`Developer Files/`**: Developer-specific files and notes
- **`logs/`**: Application runtime logs

## Build and Distribution

- **`dist/`**: Build output (gitignored)
- **`node_modules/`**: Dependencies (gitignored)
- **`coverage/`**: Test coverage reports (gitignored)

## Configuration Files

- **`.vscode/`**: VS Code settings and tasks
- **`.github/`**: GitHub-specific configuration
- **`package.json`**: Project dependencies (various locations)
- **`.gitignore`**: Git exclusion rules
- **`.gitattributes`**: Git attribute configuration

## Development Workflow

### Active Development
1. **Work on features**: Use `/app` for code changes
2. **Document changes**: Update relevant `/docs` folders
3. **Track issues**: Create files in `/issues` (local only)
4. **Test thoroughly**: Use development data in `dev-data/`
5. **Update TODO**: Keep `TODO v0.2-alpha.md` current

### Bug Fixes
1. **Create bug issue**: Add to `/issues/bugs/`
2. **Fix the bug**: Implement solution in `/app`
3. **Document fix**: Create fix documentation if significant
4. **Test fix**: Verify resolution
5. **Archive**: Move fixed bug issue to `/TRASH/fixed-bugs/`

### Feature Completion
1. **Implement feature**: Code in `/app`
2. **Document**: Add to `/docs/features/`
3. **Update**: Note in CHANGELOG.md
4. **Archive issue**: Move completed feature issue to TRASH

## Best Practices

### File Naming
- **Lowercase with hyphens**: `my-feature-name.md`
- **Prefix with type**: `[bug]--`, `[feature]--`, `[enhancement]--`
- **Descriptive names**: Clear, concise, self-explanatory

### Organization
- **Keep root clean**: Move detailed docs to `/docs`
- **Use TRASH**: Don't delete, archive for reference
- **Update .gitignore**: Exclude generated/local files
- **Document structure**: Update this file when adding folders

### Git Workflow
- **Commit frequently**: After each logical change
- **Descriptive messages**: `[TYPE] Brief description`
- **Update CHANGELOG**: For user-facing changes
- **Tag releases**: Use semantic versioning

## Migration Notes

### Recent Organization (October 2025)
- Moved fixed bug documentation to `/TRASH/fixed-bugs/`
- Moved development guides to `/docs/development/`
- Moved automation scripts to `/scripts/`
- Added comprehensive `.gitignore` rules
- Consolidated TODO files

---

**Last Updated**: October 22, 2025  
**Current Branch**: mypal-0.2-alpha  
**Version**: 0.2.0-alpha
