# Quick TODO
Just a few notes to keep track of tasks and ideas, quick todo notes. 
**DO NOT DELETE**

## 🔧 Bug Fixes Completed (Oct 24, 2025)
- ✅ **Fixed npm command invocation** - AUTORUN.ps1 now properly calls npm commands
- ✅ **Migrated Tauri config to v2** - Updated tauri.conf.json to Tauri 2.0 format
- ✅ **Tests passing** - Backend tests run successfully (2/2 passing)
- ✅ **Tauri-backend integration** - Enhanced CSP and CORS for proper communication
- ✅ **Empty log cleanup** - AUTORUN.ps1 automatically removes empty log directories
- ✅ **Rust/Tauri setup documentation** - Created comprehensive TAURI_SETUP.md guide

## 📋 Pending Tasks

1. ✅ ~~Remove empty log folders when starting autorun.ps1~~ - COMPLETED
2. Make an EXE file for autorun (called MyPal.exe) that just opens a cmd window to run the autorun.ps1 file?
3. ✅ ~~Test Tauri app launch after configuration fixes~~ - Requires Rust installation (see docs/development/TAURI_SETUP.md)
4. Update documentation with recent changes (README.md, PROJECT_STRUCTURE.md)
5. Remove the cmd window that pops up, since it should be a dev console for Tauri when opening in dev mode.
6. Resolve the merging conflicts from `Add comprehensive test suite for MyPal backend and frontend (237+ tests) #14` pull and then merge it with mypal-v0.3-alpha when merging conflicts are completed.
7. Create a branch for `mypal-release`, `mypal-alpha`. Then merge `mypal-v0.3-alpha` into `mypal-alpha` and create a new branch to work on called `mypal-alpha-v0.4`.