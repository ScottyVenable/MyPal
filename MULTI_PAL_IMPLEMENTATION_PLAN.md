# Multi-Pal Profile System Implementation Plan

## Overview
Add support for multiple Pal profiles with isolated data storage, profile switching, and a main menu interface.

## Features
- **Max 3 Profiles**: Enforce a 3-profile limit
- **Profile Management**: Create, load, delete profiles
- **Isolated Data**: Each profile has separate chat logs, memories, vocabulary, journal, neural network
- **Last Used**: Track and display last used profile for "Continue" option
- **Main Menu**: New startup screen before entering chat

---

## Backend Changes

### 1. Profile Manager Module (`profileManager.js`) ✅ CREATED
**Location**: `app/backend/src/profileManager.js`

**Responsibilities**:
- Create/load/delete profiles
- Manage profile metadata
- Isolate data per profile
- Enforce 3-profile limit
- Track last used profile

**Data Structure**:
```
data/
├── profiles/
│   ├── profile-abc123/
│   │   ├── metadata.json      (id, name, level, xp, stats)
│   │   ├── chat-log.json      (all chat messages)
│   │   ├── memories.json      (memories collection)
│   │   ├── vocabulary.json    (word frequencies)
│   │   ├── journal.json       (thought entries)
│   │   ├── neural.json        (neural network state)
│   │   └── settings.json      (profile-specific settings)
│   ├── profile-def456/
│   └── profile-ghi789/
└── profiles-index.json         (metadata for all profiles)
```

**profiles-index.json format**:
```json
{
  "profiles": [
    {
      "id": "abc123",
      "name": "My First Pal",
      "createdAt": 1729512000000,
      "lastPlayedAt": 1729598400000
    }
  ],
  "lastUsedId": "abc123",
  "version": "1.0.0"
}
```

### 2. Server Integration Changes
**File**: `app/backend/src/server.js`

**Required Changes**:
1. **Import ProfileManager** at top of file
2. **Initialize ProfileManager** with DATA_DIR
3. **Add Profile API Endpoints**:
   - `GET /api/profiles` - List all profiles
   - `POST /api/profiles` - Create new profile
   - `POST /api/profiles/:id/load` - Load/switch to profile
   - `DELETE /api/profiles/:id` - Delete profile
4. **Modify existing endpoints** to use profile manager:
   - All file I/O should go through profile manager
   - Update paths to use current profile directory
5. **Add profile validation middleware**:
   - Check if profile is loaded before allowing data operations
   - Return 400 if no profile selected

**Key Integration Points**:
- Replace direct DATA_DIR file access with `profileManager.getCurrentProfilePath()`
- Use `profileManager.getCurrentProfileData()` for reading
- Use `profileManager.saveCurrentProfileData()` for writing
- Update stats/level/xp with `profileManager.updateProfileMetadata()`

---

## Frontend Changes

### 1. New Main Menu Screen
**File**: `app/frontend/index.html`

**Add before main app**:
```html
<!-- Profile Selection Menu (hidden when profile loaded) -->
<div id="profile-menu" class="profile-menu">
  <div class="profile-menu-container">
    <h1 class="profile-menu-title">
      <span class="logo-icon">🤖</span> MyPal
    </h1>
    
    <!-- Continue Button (if last profile exists) -->
    <div id="continue-section" class="continue-section hidden">
      <button id="continue-btn" class="btn-primary btn-large">
        Continue with <span id="continue-name"></span>
      </button>
    </div>
    
    <!-- Profile Cards -->
    <div id="profile-list" class="profile-list">
      <!-- Dynamically populated profile cards -->
    </div>
    
    <!-- Action Buttons -->
    <div class="profile-actions">
      <button id="new-pal-btn" class="btn-secondary">
        ➕ New Pal
      </button>
      <button id="load-pal-btn" class="btn-secondary">
        📂 Load Pal
      </button>
    </div>
  </div>
</div>

<!-- New Pal Modal -->
<div id="new-pal-modal" class="modal hidden">
  <div class="modal-card">
    <h2>Create New Pal</h2>
    <p>Give your Pal a unique name (max 30 characters):</p>
    <input 
      id="new-pal-name" 
      type="text" 
      placeholder="Enter Pal name..." 
      maxlength="30"
      autocomplete="off"
    />
    <div id="new-pal-error" class="error-message hidden"></div>
    <div class="modal-actions">
      <button id="new-pal-cancel" class="btn-secondary">Cancel</button>
      <button id="new-pal-create" class="btn-primary">Create</button>
    </div>
  </div>
</div>

<!-- Main App (shown when profile loaded) -->
<div id="main-app" class="hidden">
  <!-- Existing app content -->
</div>
```

### 2. Profile Selection JavaScript
**File**: `app/frontend/app.js`

**Add at top**:
```javascript
let currentProfileId = null;
let profiles = [];
```

**Add functions**:
```javascript
async function loadProfiles() {
  // Fetch GET /api/profiles
  // Render profile cards
  // Show/hide continue button
  // Check if 3 profiles exist (disable New button)
}

async function createNewPal(name) {
  // POST /api/profiles with { name }
  // Load the new profile
  // Enter main app
}

async function loadProfile(profileId) {
  // POST /api/profiles/:id/load
  // Set currentProfileId
  // Hide profile menu
  // Show main app
  // Refresh all data
}

async function deleteProfile(profileId) {
  // Confirm deletion
  // DELETE /api/profiles/:id
  // Reload profile list
}

function showProfileMenu() {
  $('#profile-menu').classList.remove('hidden');
  $('#main-app').classList.add('hidden');
}

function showMainApp() {
  $('#profile-menu').classList.add('hidden');
  $('#main-app').classList.remove('hidden');
}
```

**Update init()**:
```javascript
async function init() {
  // Load profiles first
  await loadProfiles();
  
  // If lastUsedId exists, show continue option
  // If no profiles exist, show only "New Pal" button
  // Otherwise show profile menu
  
  // Only wire up main app after profile is loaded
}
```

### 3. Profile Card Component
**HTML Structure**:
```html
<div class="profile-card" data-profile-id="{id}">
  <div class="profile-header">
    <h3 class="profile-name">{name}</h3>
    <button class="profile-delete" title="Delete">🗑️</button>
  </div>
  <div class="profile-stats">
    <div class="stat">
      <span class="stat-label">Level</span>
      <span class="stat-value">{level}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Messages</span>
      <span class="stat-value">{messageCount}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Memories</span>
      <span class="stat-value">{memoryCount}</span>
    </div>
  </div>
  <div class="profile-meta">
    <span class="profile-date">Last played: {date}</span>
  </div>
  <button class="profile-load-btn btn-primary">Load</button>
</div>
```

### 4. CSS Styling
**File**: `app/frontend/styles.css`

**Add**:
- `.profile-menu` - Full-screen overlay
- `.profile-menu-container` - Centered container
- `.profile-card` - Card styling with hover effects
- `.continue-section` - Prominent continue button
- `.profile-actions` - Action buttons layout
- `.btn-primary`, `.btn-secondary`, `.btn-large` - Button variants

---

## Migration Strategy

### For Existing Users
When user first launches with new version:

1. **Detect legacy data**: Check if `DATA_DIR` has old format (no `profiles/` folder)
2. **Auto-migrate**: Create first profile named "My Pal" with existing data
3. **Copy files**:
   - `chat-log.json` → `profiles/profile-{id}/chat-log.json`
   - `memories.json` → `profiles/profile-{id}/memories.json`
   - etc.
4. **Create metadata**: Generate metadata.json from existing stats
5. **Mark as migrated**: Add `migrated: true` to profiles-index.json

**Migration Function** (server.js):
```javascript
function migrateToProfiles() {
  const legacyChatLog = path.join(DATA_DIR, 'chat-log.json');
  
  // Check if legacy format exists
  if (fs.existsSync(legacyChatLog) && !fs.existsSync(profileManager.indexPath)) {
    console.log('Migrating to multi-profile system...');
    
    // Create first profile
    const result = profileManager.createProfile('My Pal');
    
    if (result.success) {
      // Copy legacy data
      const files = [
        'chat-log.json',
        'memories.json',
        'vocabulary.json',
        'journal.json'
      ];
      
      for (const file of files) {
        const srcPath = path.join(DATA_DIR, file);
        const destPath = profileManager.getCurrentProfilePath(file);
        
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
          fs.renameSync(srcPath, srcPath + '.old'); // Backup
        }
      }
      
      console.log('Migration complete!');
    }
  }
}
```

---

## Implementation Steps

### Phase 1: Backend Core ✅
1. ✅ Create ProfileManager class
2. ⏳ Integrate into server.js
3. ⏳ Add API endpoints
4. ⏳ Add migration logic
5. ⏳ Update all file I/O to use profile manager

### Phase 2: Frontend UI
1. ⏳ Create main menu HTML
2. ⏳ Add profile selection CSS
3. ⏳ Implement profile management JS
4. ⏳ Add New Pal modal
5. ⏳ Add profile cards

### Phase 3: Integration
1. ⏳ Connect frontend to backend APIs
2. ⏳ Update init flow to check for profiles
3. ⏳ Add profile switching logic
4. ⏳ Update all data refresh calls

### Phase 4: Testing
1. ⏳ Test new profile creation
2. ⏳ Test profile switching
3. ⏳ Test 3-profile limit
4. ⏳ Test deletion
5. ⏳ Test migration from legacy format

---

## Benefits

1. **Multiple Personalities**: Users can experiment with different training approaches
2. **Data Isolation**: Complete separation prevents cross-contamination
3. **Easy Switching**: Quick profile switching for different use cases
4. **Clean Start**: Easy to start fresh without losing previous work
5. **Organized**: Professional multi-user feel

---

## Risks & Considerations

1. **Breaking Change**: Requires migration for existing users
2. **Storage Space**: 3 profiles = 3x data storage
3. **Complexity**: More moving parts to maintain
4. **Profile Confusion**: Users might forget which profile has what data

---

## Next Steps

**Ready to proceed?** I can start implementing:
1. Server integration (add ProfileManager to server.js)
2. API endpoints (profiles CRUD operations)
3. Frontend UI (main menu + profile cards)
4. Migration logic (convert existing data)

This will be a ~1000 line change across multiple files. Should I proceed with implementation?
