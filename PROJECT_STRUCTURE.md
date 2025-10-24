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
│   ├── desktop/               # Desktop shells (Tauri)
│   └── frontend/              # Vanilla JavaScript frontend
├── docs/                       # Project documentation
│   ├── archive/               # Legacy documentation (Avalonia, etc.)
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
├── mobile/                     # React Native mobile app (in development)
├── scripts/                    # Automation and utility scripts
├── TRASH/                      # Archived/outdated files (gitignored)
│   ├── fixed-bugs/            # Resolved bug documentation
│   └── outdated-docs/         # Superseded documentation
├── AUTORUN.ps1                # Main development launcher with requirements checking
├── check-requirements.ps1     # Standalone requirements validator
├── requirements.json          # Complete dependency specifications
├── MyPal.bat                  # Windows batch launcher (double-click)
├── MyPal.vbs                  # Windows VBScript launcher (silent)
├── LAUNCHER_README.md         # Launcher usage and customization guide
├── CHANGELOG.md               # Project changelog
├── PROJECT_STRUCTURE.md       # This file - project organization guide
├── quick_todo.md              # Quick notes and ideas (active)
└── README.md                  # Project overview and setup
```

## Directory Purposes

### `/app` - Application Code
**Main desktop application with frontend and backend.**

- **`/backend`**: Node.js/Express server (ESM modules)
  - `/src` - Source code
    - `server.js` - Main Express server with CORS, WebSocket support
    - `profileManager.js` - Multi-profile data management
    - API endpoints for chat, profiles, stats, neural network
  - `/data` - JSON-based local data storage
  - `/tests` - Backend unit tests
  - Port: 3001 (default)
  - CORS: Configured for Tauri origins (tauri://localhost) and localhost

- **`/frontend`**: Vanilla JavaScript SPA
  - `app.js` - Main application logic (3600+ lines)
  - `index.html` - UI structure with three-tab interface (Chat, Stats, Brain)
  - `styles.css` - Complete styling and responsive design
  - `/js` - Modular JavaScript components
  - CSP: Enhanced for Tauri compatibility (tauri://, asset://, http://localhost:3001)
  - Chart.js for statistics visualization
  - vis-network for neural network graphs

- **`/desktop`**: Desktop application shells
  - `/tauri-app` - **Active Tauri 2.0 project**
    - `package.json` - Tauri CLI scripts (dev, build, etc.)
    - `src-tauri/` - Rust entrypoint and tauri.conf.json
    - `tauri.conf.json` - Window config, custom protocols, WebView2
    - Requires: Rust 1.70+, Cargo, WebView2 runtime
  - `DEPRECATED_NOTICE.md` - Historical context for retired Avalonia/Electron

- **`/media`**: Images, logos, and assets

### `/docs` - Documentation
**All project documentation organized by category.**

- **`/ai`**: AI integration, prompts, and LLM configuration
- **`/analysis`**: Project metrics, performance analysis
- **`/design`**: UI/UX designs, wireframes, architecture diagrams
- **`/archive`**: Legacy documentation; `avalonia/` contains retired Avalonia guides
- **`/development`**: Developer guides
  - `LOGGING_GUIDE.md` - Logging best practices and patterns
  - `AGENT.md` - AI agent development guidance
  - `TAURI_SETUP.md` - **Complete Windows development environment setup**
    - Prerequisites: Node.js 18+, Rust 1.70+, Visual Studio Build Tools, WebView2
    - Step-by-step installation instructions
    - Troubleshooting common issues
    - Development workflow and tips
    - Updated: October 2025
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

### `/app/desktop` - Desktop Shells
**Tauri 2.0 configuration for the desktop application.**

- **`tauri-app/`**: Active Tauri 2.0 project wrapping the SPA
  - `package.json` - Tauri CLI scripts (`npm run dev`, `npm run build`, `npm run tauri`)
  - `src-tauri/` - Rust entrypoint and configuration
    - `src/main.rs` - Rust entry point (window lifecycle, system tray)
    - `tauri.conf.json` - Tauri configuration (window, protocols, build)
    - `Cargo.toml` - Rust dependencies
  - `frontendDist: ../../../frontend` - Serves vanilla JS SPA
  - Custom protocol: `tauri://localhost`
  - Requires: Rust toolchain, WebView2 runtime (Windows)
- **`DEPRECATED_NOTICE.md`**: Historical context for retired Avalonia/Electron projects
  - Documents migration from Avalonia (C#/.NET) to Tauri (Rust/WebView)
  - Electron implementation also retired in favor of Tauri

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

- `generate_issue_files_from_todo.py` - Convert TODO items to issue files
- `refresh-tray-icon.ps1` - Tray icon refresh utility
- Other development automation tools

### Root Level Scripts and Launchers

#### Development Automation
- **`AUTORUN.ps1`**: Main development launcher
  - Starts backend server on port 3001
  - Validates requirements before launch
  - Manages log directories with date-based structure
  - Supports multiple log time formats (12h/24h with/without seconds)
  - Cleans up empty log directories automatically
  - Functions: `Test-Requirement`, `Test-AllRequirements`, `Remove-EmptyLogDirectories`, `Ensure-NpmDependencies`, `Start-BackendServer`

#### Requirements System
- **`requirements.json`**: Complete dependency specifications
  - System requirements (OS, RAM, storage)
  - Runtime dependencies (Node.js 18+, npm 9+, Rust 1.70+, Cargo 1.70+)
  - Build tools (MSVC, WebView2, Xcode for cross-platform)
  - npm and Cargo package requirements
  - Installation order and verification steps
  - Troubleshooting guide with common issues

- **`check-requirements.ps1`**: Standalone requirements validator
  - Validates all runtime dependencies
  - Checks npm package installations
  - Provides detailed or summary output modes
  - Supports auto-install flag for missing dependencies
  - ASCII-safe output for PowerShell compatibility
  - Exit codes: 0 (success), 1 (missing requirements)

#### Windows Launchers
- **`MyPal.bat`**: Windows batch launcher
  - Double-click to run AUTORUN.ps1
  - Launches PowerShell with ExecutionPolicy Bypass
  - Keeps terminal open with -NoExit
  - Validates AUTORUN.ps1 exists before launch

- **`MyPal.vbs`**: Windows VBScript launcher
  - Silent launcher alternative (no terminal window)
  - Runs AUTORUN.ps1 in background
  - Suitable for desktop shortcuts and startup scripts

- **`LAUNCHER_README.md`**: Launcher documentation
  - Usage instructions for batch and VBS launchers
  - Desktop shortcut creation guide
  - EXE conversion methods (Ps1ToExe, BatToExe, IExpress)
  - Custom arguments and silent launch options

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
  - `profiles/` - Individual profile directories with user data
  - `chatlog.json`, `concepts.json`, `facts.json`, `journal.json`
  - `memories.json`, `neural_network.json`, `vocabulary.json`
  - `profiles-index.json`, `secrets.json`, `sessions.json`, `state.json`, `users.json`

- **`dev-logs/`**: Development log files with date-based structure
  - Organized as: `YYYY-MM-DD/HH-MM-SS_AM-PM/`
  - Empty directories automatically cleaned by AUTORUN.ps1
  - Supports 4 time formats: 12h/24h with/without seconds

- **`Developer Files/`**: Developer-specific files and notes
  - `server_out.txt`, `server_err.txt` - Backend output logs
  - `logs/` - Additional logging output
  - `dev/` - Development scratch files
  - `media/` - Development assets

- **`logs/`**: Application runtime logs (production)

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

### Setup and Launch
1. **Verify requirements**: Run `.\check-requirements.ps1` or let AUTORUN.ps1 check automatically
2. **Install dependencies**: Backend (`cd app/backend && npm install`), Tauri (`cd app/desktop/tauri-app && npm install`)
3. **Start development**: 
   - Double-click `MyPal.bat` or `MyPal.vbs` (Windows)
   - Or run `.\AUTORUN.ps1` directly in PowerShell
   - Or manually: Start backend (`cd app/backend && npm start`), then Tauri (`cd app/desktop/tauri-app && npm run dev`)
4. **Access application**: Tauri window opens automatically, or browser at `http://localhost:3001`

### Active Development
1. **Work on features**: Use `/app` for code changes
2. **Document changes**: Update relevant `/docs` folders
3. **Track issues**: Create files in `/issues` (local only)
4. **Test thoroughly**: Use development data in `dev-data/`
5. **Update TODO**: Keep `quick_todo.md` current
6. **Commit frequently**: Follow Git workflow standards

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
  - Types: `BUGFIX`, `FEATURE`, `PATCH`, `REFACTOR`, `DOCS`, `TEST`, `TAURI`, `GITHUB`
- **Update CHANGELOG**: For user-facing changes
- **Tag releases**: Use semantic versioning
- **Branch naming**: `feature/...`, `bugfix/...`, `refactor/...`, `patch/...`

## Migration Notes

### Recent Organization (October 2025)
- **Tauri 2.0 Migration**: Retired Avalonia (C#/.NET) and Electron, migrated to Tauri for lightweight cross-platform desktop
- **Requirements System**: Added `requirements.json`, `check-requirements.ps1`, and integrated validation into AUTORUN.ps1
- **Launcher Scripts**: Created `MyPal.bat` and `MyPal.vbs` for Windows double-click execution
- **Enhanced Logging**: Implemented date-based log structure (`dev-logs/YYYY-MM-DD/HH-MM-SS_AM-PM/`) with automatic cleanup
- **CORS & CSP Updates**: Enhanced backend CORS for Tauri origins, updated frontend CSP for `tauri://` and `asset://` protocols
- **Documentation**: Added `TAURI_SETUP.md` comprehensive setup guide, `LAUNCHER_README.md` for launcher usage
- Moved fixed bug documentation to `/TRASH/fixed-bugs/`
- Moved development guides to `/docs/development/`
- Moved automation scripts to `/scripts/` (except root-level launchers)
- Added comprehensive `.gitignore` rules
- Consolidated TODO files

---

**Last Updated**: October 24, 2025  
**Current Branch**: mypal-v0.3-alpha  
**Version**: 0.3.0-alpha
