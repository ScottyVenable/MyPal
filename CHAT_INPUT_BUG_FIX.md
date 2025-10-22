# Chat Input State Bug Fix

## Issue Description
The chat interface was showing "Pal is thinking..." at the bottom input field even after Pal had already processed and sent a response. This prevented users from sending new messages because the input remained disabled with the thinking placeholder text.

## Root Cause
The main chat handler (`wireChat()` function) was only managing the main chat input state, while the floating chat handler was properly managing both inputs. When a message was sent from the main chat:

1. Both inputs were disabled and set to "Pal is thinking..."
2. After response, only the main input was re-enabled and reset to "Type a message..."
3. The floating input remained stuck in "thinking" state

## Fix Applied
Updated the main chat handler to:

- ✅ **Sync both inputs during thinking state**: Both main and floating inputs are disabled and show "Pal is thinking..."
- ✅ **Re-enable both inputs after response**: Both inputs are re-enabled with "Type a message..." placeholder
- ✅ **Synchronize messages between windows**: When floating chat is open, messages are added to both windows
- ✅ **Manage typing indicators properly**: Both typing indicators are shown/hidden appropriately
- ✅ **Handle errors consistently**: Error messages are shown in both windows when floating chat is open

## Technical Details
**File Modified**: `app/frontend/app.js`
**Function**: `wireChat()` (around line 1346)

**Key Changes**:
```javascript
// Before: Only managed main input
input.disabled = false;
input.placeholder = 'Type a message...';

// After: Manages both inputs
input.disabled = false;
input.placeholder = 'Type a message...';
if (floatingInput) {
  floatingInput.disabled = false;
  floatingInput.placeholder = 'Type a message...';
}
```

## Testing
After this fix:
1. Send a message from main chat → both inputs should be properly reset
2. Send a message from floating chat → both inputs should be properly reset  
3. No more stuck "Pal is thinking..." state
4. Users can send follow-up messages immediately after receiving responses

This resolves the user experience issue where the chat interface appeared broken after receiving responses.