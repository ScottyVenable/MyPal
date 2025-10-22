# Testing Guide: New Pal Name Input Fix

## Bug Description
After deleting a Pal profile and attempting to create a new one, the name textbox would not accept keyboard input.

## Fix Applied
Modified `app/frontend/app.js` to:
1. Re-query the DOM element on each modal open (avoiding stale references)
2. Comprehensively remove blocking attributes (readonly, disabled, aria-disabled, tabindex)
3. Increase focus delay to 100ms for better DOM settling
4. Add fallback click and focus handlers directly on the input element
5. Double-check attributes before focusing

## Test Steps

### Test 1: Basic New Pal Creation
1. Start the backend server: `cd app/backend && npm start`
2. Open `app/frontend/index.html` in a browser (or use Live Server)
3. Click "New Pal" button
4. **Verify**: Input textbox should automatically focus with cursor visible
5. **Verify**: Can type a name without issues
6. Type a name and click "Create"
7. **Verify**: New profile is created successfully

### Test 2: After Deleting a Profile (Main Bug Scenario)
1. Load an existing profile
2. Click "Exit" to return to profile menu
3. Click "Load Pal" to show profile cards
4. Click the delete (🗑️) button on a profile
5. Confirm deletion
6. Click "New Pal" button
7. **Verify**: Input textbox should focus and accept typing ✓ (This was broken before)
8. **Verify**: Can type a name without any issues
9. Create the new profile

### Test 3: Multiple Modal Opens
1. Click "New Pal"
2. Click "Cancel"
3. Click "New Pal" again
4. **Verify**: Input still works correctly
5. Repeat steps 1-4 several times
6. **Verify**: Input consistently works on every open

### Test 4: Click-to-Focus Fallback
1. Click "New Pal"
2. If input doesn't auto-focus, manually click on the input field
3. **Verify**: Clicking the input should always enable typing (fallback protection)

### Test 5: Switch Profile Flow
1. Load a profile
2. Go to Settings tab
3. Click "Switch Profile"
4. Click "New Pal"
5. **Verify**: Input works correctly after switching

## Expected Results
- ✅ Input textbox auto-focuses when modal opens
- ✅ Cursor is visible in the textbox
- ✅ Can type immediately without clicking
- ✅ No readonly or disabled attributes present
- ✅ Works consistently after deleting profiles
- ✅ Works after switching profiles
- ✅ Clicking input always enables typing (fallback)

## Technical Changes
**File**: `app/frontend/app.js`  
**Function**: `wireProfileManagement()`  
**Lines Modified**: ~413-500

### Key Changes:
1. **Re-query element**: `const newPalName = $('#new-pal-name');` moved inside click handler
2. **Attribute cleanup**: Added `removeAttribute('tabindex')` and `removeAttribute('disabled')`
3. **Focus timing**: Increased from 50ms to 100ms delay
4. **Fallback handlers**: Added click and focus event listeners on input element
5. **Double-check**: Attributes removed twice (before delay and in requestAnimationFrame)

## Rollback (if needed)
If this fix causes issues, revert with:
```bash
git revert 1422256
```

## Related Issues
- Issue file: `issues/bugs/[bug]--new-pal-name-textbox-uneditable.md`
- TODO item: "New Pal name textbox uneditable after menu return"
