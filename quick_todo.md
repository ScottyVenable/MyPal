# Quick TODO
Add these to the main todo list when available.

## Bugs

### ✅ COMPLETED - Console Output Issues (PATCH-v0.1.3)
- **Remove emojis from console.log messages** to prevent garbled characters on Windows terminals
    - **Problem**: Emoji characters in console output cause display issues on Windows Command Prompt and PowerShell
    - **Impact**: Makes debugging difficult and creates unprofessional output
    - **Solution**: ✅ **FIXED** - Replaced with bracketed prefixes like `[NEURAL]`, `[SUCCESS]`, `[CHAT]`, `[SAVE]`
    - **Files Modified**: `app/backend/src/server.js` - 10 console.log statements updated
    - **Priority**: ✅ **COMPLETED** - Clean professional console output now displays correctly on Windows


### ✅ COMPLETED - Auto Profile Loading (PATCH-v0.1.3) 
- **Auto-loading last used profile instead of showing profile menu**
    - **Problem**: Users expect to see the profile selection menu on startup, but the app loads the last used profile automatically
    - **Impact**: Confuses users who want to switch profiles or create a new one
    - **Solution**: ✅ **FIXED** - Modified `init()` function to always show profile selection menu first
    - **Files Modified**: `app/frontend/app.js` - Simplified startup logic to always show profile menu
    - **Priority**: ✅ **COMPLETED** - Profile menu now appears on every startup with convenient "Continue" option