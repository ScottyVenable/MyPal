# MyPal Frontend Logging System

## Overview
A comprehensive logging system has been added to MyPal's frontend to provide real-time diagnostic information for debugging chat issues, typing indicators, and other UI interactions.

## Features

### 🕐 Timestamped Logs
All logs include precise timestamps with millisecond accuracy for detailed timing analysis.

### 📊 Categorized Logging
Logs are organized into clear categories with emojis for easy identification:
- 💬 **CHAT** - Chat flow, message handling, response processing
- ⌨️ **TYPING** - Typing indicator state changes and cleanup
- 🖥️ **UI** - User interface interactions, input states, tab switching
- 🌐 **API** - Backend API calls, responses, errors
- 🔌 **WEBSOCKET** - WebSocket connections and neural stream events
- 👤 **PROFILE** - Profile management operations
- 🧠 **NEURAL** - Neural network visualization events
- ⚡ **PERFORMANCE** - Performance timing and metrics
- 📊 **STATE** - Application state changes
- ❌ **ERROR** - Error conditions and exceptions

### 📈 Log Levels
- **DEBUG** (0) - Detailed diagnostic information
- **INFO** (1) - General information about application flow
- **WARN** (2) - Warning conditions that might need attention
- **ERROR** (3) - Error conditions that need immediate attention

### 🎯 Sequence Numbers
Each log entry includes a sequential number for easy tracking of event order.

## Usage

### Console Commands
Access the logging system via the global `MyPalLogging` object:

```javascript
// Change log level (shows more or fewer logs)
MyPalLogging.setLevel("DEBUG");  // Show all logs
MyPalLogging.setLevel("INFO");   // Show info and above
MyPalLogging.setLevel("WARN");   // Show warnings and errors only
MyPalLogging.setLevel("ERROR");  // Show errors only

// Get current log level
MyPalLogging.getLevel();

// Emergency functions
MyPalLogging.forceEnableInputs();  // Force re-enable chat inputs
MyPalLogging.clearTyping();        // Clear all typing indicators

// Manual logging
MyPalLogging.debug("UI", "Debug message", { data: "optional" });
MyPalLogging.info("CHAT", "Info message");
MyPalLogging.warn("API", "Warning message");
MyPalLogging.error("ERROR", "Error message");
```

### Emergency Shortcuts
- **Ctrl + Shift + R** - Force re-enable all chat inputs and clear typing indicators

## Key Tracked Events

### Chat Flow
```
[10:23:45.123] [0001] 💬 [INFO] Chat submission started
[10:23:45.125] [0002] 🖥️ [INFO] Main input disabled - waiting for response  
[10:23:45.127] [0003] ⌨️ [INFO] Typing indicator created and added to DOM
[10:23:45.130] [0004] 🌐 [INFO] Sending chat request to backend
[10:23:46.245] [0005] 🌐 [INFO] Backend response received
[10:23:46.247] [0006] 💬 [INFO] Pal message added to main chat
[10:23:46.250] [0007] ⌨️ [INFO] All typing indicators successfully cleared
[10:23:46.252] [0008] 🖥️ [INFO] Main input re-enabled
[10:23:46.255] [0009] 💬 [INFO] Chat cycle completed (1132.45ms)
```

### Typing Indicator Issues
```
[10:23:45.127] [0003] ⌨️ [INFO] Typing indicator created and added to DOM
[10:23:46.250] [0020] ⌨️ [WARN] Found 2 existing typing indicators before cleanup
[10:23:46.252] [0021] ⌨️ [INFO] Clearing 2 typing indicators
[10:23:46.254] [0022] ⌨️ [INFO] All typing indicators successfully cleared
```

### Input State Problems
```
[10:23:47.100] [0030] 🖥️ [WARN] Main input force re-enabled via timeout
[10:23:47.102] [0031] ❌ [WARN] Emergency function called: forceEnableAllInputs
```

## Integration with Backend
- Warning and error logs are automatically sent to backend telemetry
- Performance timers track complete request cycles
- Sequence numbers help correlate frontend and backend events

## Monitoring Chat Issues
To diagnose typing indicator problems:

1. Set debug level: `MyPalLogging.setLevel("DEBUG")`
2. Send a test message
3. Watch for typing indicator lifecycle:
   - Creation → DOM insertion → Backend request → Response → Cleanup → Input re-enable
4. Look for warnings about lingering indicators or disabled inputs
5. Use emergency shortcut (Ctrl+Shift+R) if inputs get stuck

## Production Configuration
For production, set log level to INFO or WARN to reduce console noise:
```javascript
MyPalLogging.setLevel("INFO");
```

## Performance Impact
- Minimal performance overhead with proper log level management
- Logs are batched and sent to backend telemetry for critical issues only
- Debug logs can be disabled entirely in production builds