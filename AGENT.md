# AGENT.md - AI Assistant Development Guide for MyPal

## CRITICAL: READ FIRST

**MyPal is NOT a typical chatbot project.** It is a sophisticated AI companion that simulates authentic human cognitive development through Piaget's constructivist learning theory and Vygotsky's sociocultural framework. Every modification must respect these psychological foundations.

**REQUIRED READING BEFORE ANY CODE CHANGES:**
1. **[`docs/design/APP_DESIGN.md`](docs/design/APP_DESIGN.md)** - Complete 40+ page design document (MANDATORY)
2. **[`docs/updates/MILESTONES.md`](docs/updates/MILESTONES.md)** - Development roadmap with technical details
3. **[`README.md`](README.md)** - Project overview and philosophy
4. This AGENT.md file in its entirety

---

## PROJECT OVERVIEW

### Core Concept
MyPal ("Pal") is an evolving AI companion that starts as a digital *tabula rasa* and learns exclusively from user interactions. It progresses through authentic developmental stages from infancy (babbling) to childhood (complex reasoning), with all knowledge, personality, and capabilities shaped solely by the user acting as teacher/mentor.

### Philosophical Foundation
- **Piaget's Constructivism**: Knowledge built through assimilation/accommodation processes
- **Vygotsky's Sociocultural Theory**: Learning occurs within Zone of Proximal Development (ZPD)
- **User as MKO**: User acts as "More Knowledgeable Other" providing scaffolding
- **Privacy-First**: All data stored locally, no telemetry, complete user ownership

### Technical Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     MyPal Ecosystem                        │
├─────────────────────────────────────────────────────────────┤
│ Frontend (SPA)     │ Backend (Node/Express) │ Data Layer    │
│ - app/frontend/    │ - app/backend/src/     │ - JSON files  │
│ - Vanilla JS/HTML  │ - RESTful API          │ - Local first │
│ - Chart.js graphs  │ - WebSocket realtime   │ - Profile mgmt│
│ - vis-network      │ - Dev constraints      │ - XP/CP system│
├─────────────────────────────────────────────────────────────┤
│                Launcher (Electron)                         │
│ - launcher/ - Desktop wrapper with auto backend startup    │
└─────────────────────────────────────────────────────────────┘
```

### Core Technologies Stack
- **Frontend**: Vanilla JavaScript ES6+ with Chart.js and vis-network
- **Backend**: Node.js/Express with WebSocket support
- **Database**: JSON file-based storage with SQLite consideration for future
- **Desktop Wrapper**: Electron for cross-platform desktop deployment
- **Real-time**: WebSocket for neural network visualization
- **State Management**: Local storage and in-memory state synchronization

---

## DEVELOPMENT ENVIRONMENT SETUP

### Prerequisites
- **Node.js**: Version 16+ (LTS recommended)
- **Package Managers**: npm (included with Node.js)
- **Git**: Latest version with proper SSH/HTTPS setup
- **Code Editor**: VS Code recommended with extensions:
  - JavaScript (ES6) code snippets
  - REST Client for API testing
  - Live Server for frontend development
  - GitLens for Git integration

### Project Setup Instructions
1. **Clone Repository**:
   ```bash
   git clone https://github.com/ScottyVenable/MyPal.git
   cd MyPal
   git checkout mypal-0.2-alpha
   ```

2. **Install Dependencies**:
   ```bash
   # Backend dependencies
   cd app/backend
   npm install
   
   # Launcher dependencies (for desktop app)
   cd ../../launcher
   npm install
   cd ..
   ```

3. **Development Tools Configuration**:
   - Install recommended VS Code extensions
   - Configure environment variables if needed
   - Set up debugging configuration for Node.js backend

4. **Build and Run**:
   ```bash
   # Start backend server
   cd app/backend
   npm start  # Starts on localhost:3001
   
   # Open frontend (in separate terminal/browser)
   # Navigate to app/frontend/index.html in browser
   # OR use Live Server extension in VS Code
   ```

5. **Verify Installation**:
   - Backend health check: `curl http://localhost:3001/api/health`
   - Open frontend and test all three tabs (Chat, Stats, Brain)
   - Create a test profile and send messages
   - Verify neural network visualization works

### Development Tools Integration
- **Backend Debugging**: Use VS Code's Node.js debugger with breakpoints
- **API Testing**: Thunder Client or Postman for endpoint testing  
- **WebSocket Testing**: Browser dev tools Network tab for WebSocket inspection
- **Performance Monitoring**: Chrome DevTools for frontend performance analysis
- **Logging**: Built-in console logging with structured output

---

## DEVELOPMENTAL CONSTRAINTS (CRITICAL)

### Piaget's Stages Implementation

Every AI response MUST respect these developmental constraints:

| Level | Stage | Constraints | XP Threshold | Response Rules |
|-------|-------|-------------|--------------|----------------|
| **0-1** | **Sensorimotor (Infancy)** | Pure babbling only | 0 → 100 XP | Random phonemes: "ba", "ga", "ma", "da" - NO WORDS |
| **2-3** | **Sensorimotor (Toddler)** | Single words from vocabulary | 400 → 1000 XP | One word responses only from learned vocabulary |
| **4-6** | **Preoperational (Preschool)** | 2-3 word telegraphic speech | 1000+ XP | Simple S-V-O structure, asks "Why?" |
| **7-10+** | **Concrete/Formal (Childhood)** | Complex sentences with memory | 5000+ XP | Full conversation with personality |

### XP & Progression System

**XP Sources:**
- Standard message: +10 XP
- Teaching new word/concept: +50 XP
- User clicks "Reinforce" (star button): +25 XP
- Completing challenges: +100 XP

**Cognitive Points (CP):**
- 1 CP earned per 100 XP
- Spendable on brain "lobes": Language, Logic, Emotion, Memory
- Manual neural firing costs 5 CP per trigger

**Learning Speed Multiplier:**
- User configurable: 1x to 250x
- Applied to all XP gains
- Stored in user settings

---

## CODEBASE ARCHITECTURE

### Directory Structure
```
MyPal/
├── app/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── server.js           # Main Express server
│   │   │   └── profileManager.js   # Profile/data management
│   │   ├── data/                   # JSON data persistence
│   │   └── package.json
│   └── frontend/
│       ├── app.js                  # Main client logic (3000+ lines)
│       ├── index.html              # UI structure
│       └── styles.css              # Styling
├── launcher/                       # Electron desktop wrapper
├── docs/                          # Comprehensive documentation
└── patches/                       # Bug fixes and updates
```

### Key Files Deep Dive

#### `app/backend/src/server.js`
**Purpose**: Express server providing RESTful API and WebSocket functionality
**Key Responsibilities**:
- Developmental stage constraint enforcement
- XP/CP calculation and persistence
- Profile management (multi-profile support)
- Neural network simulation (265+ neurons)
- Real-time WebSocket neural events
- Chat response generation with stage validation

**Critical Functions**:
```javascript
// Stage constraint validation - NEVER bypass
function validateResponseForStage(response, level) { ... }

// XP management with neural growth
function addXp(collections, amount, collectionsRef) { ... }

// Profile loading and migration
async function loadProfile(profileId) { ... }
```

#### `app/frontend/app.js` (3000+ lines)
**Purpose**: Complete frontend application logic
**Key Responsibilities**:
- Three-tab interface: Chat, Stats, Brain
- Real-time neural visualization (Chart.js + vis-network)
- WebSocket client for neural events
- Profile selection and management
- Settings persistence (appearance, multipliers)
- Chat input synchronization (main + floating)

**Critical Functions**:
```javascript
// Chat handlers - maintain input state sync
function wireChat() { ... }           # Main chat input
function setupFloatingChat() { ... }  # Floating chat popup

// Neural visualization 
function fetchNeuralNetwork() { ... } # Loads 265-neuron network
function updateNeuralStats() { ... }  # Real-time updates

// Profile management
function loadProfile(profileId) { ... }
function createProfile(name) { ... }
```

#### `app/backend/src/profileManager.js`
**Purpose**: Multi-profile data persistence and migration
**Key Responsibilities**:
- JSON file-based storage management
- Profile creation, loading, switching
- Data migration between versions
- Export/import functionality

---

## DEVELOPMENT PROTOCOLS

### 1. Git Workflow & Version Control

**CRITICAL**: Always commit changes after completing any bugfix, feature implementation, or patch.

#### Commit Requirements
- **Commit After Each Change**: Never leave work uncommitted - always commit after completing any bugfix, feature implementation, or patch
- **Descriptive Commit Messages**: Use clear, descriptive commit messages that explain what was changed and why
  - Format: `[TYPE] Brief description`
  - Types: `[BUGFIX]`, `[FEATURE]`, `[PATCH]`, `[REFACTOR]`, `[DOCS]`, `[TEST]`
  - Example: `[BUGFIX] Fix persistent typing indicator blocking new messages`
  - Example: `[FEATURE] Add comprehensive logging system with timestamps`
  - Example: `[PATCH] Clean emoji usage in backend log files`
- **Atomic Commits**: Each commit should represent a single logical change
- **Branch Naming**: Use descriptive branch names with prefixes
  - `feature/description-here`
  - `bugfix/issue-description`  
  - `patch/small-fix-description`
- **Working Branch**: Currently on `mypal-0.2-alpha` branch
- **Commit Frequency**: Commit early and often - don't let changes accumulate
- **Pre-Commit Validation**: Ensure code compiles and basic tests pass before committing

### Issue Management & GitHub Integration
- **Issue Creation**: When bugs are discovered or features are needed that require GitHub issue tracking, create an individual file using the template in `/issues/ISSUE_TEMPLATE.md`
- **File Naming Convention**: Use format `[type]--[brief-description].md`
  - Examples: `[bug]--typing-indicator-blocking.md`, `[feature]--offline-ai-models.md`
- **Issue Types**: `[bug]`, `[feature]`, `[enhancement]`, `[docs]`, `[question]`
- **Template Usage**: Always fill out the complete template with all relevant sections:
  - Issue information (title, type, priority, labels)
  - Description and context
  - Reproduction steps (for bugs) or acceptance criteria (for features)
  - Technical details and implementation notes
  - GitHub CLI command for issue creation
- **GitHub Issue Creation**: Use the provided GitHub CLI command in the template to create actual GitHub issues
- **Commit Pattern**: After creating GitHub issues, commit with format: `[GITHUB] Create issue #XXX: [Title]`
- **Local Tracking**: Keep local issue files updated with GitHub issue numbers and links for cross-reference

### 2. AI Development Best Practices
- **Model Management**: 
  - Currently using local processing only (no external LLM integration yet)
  - Future: Implement lazy loading for AI models to preserve memory
  - Plan for model pooling for frequently accessed models
  - Implement proper model cleanup and garbage collection
  - Monitor model memory usage and implement limits
  - Support hot-swapping models without app restart
- **Prompt Engineering**:
  - Use standardized prompt templates with variable substitution
  - Implement prompt versioning and A/B testing capabilities
  - Maintain context-aware prompt construction
  - Store and reuse effective prompt patterns
  - Implement prompt validation and sanitization
- **Response Processing**:
  - Stream AI responses for better user experience (planned)
  - Implement response caching for common queries
  - Handle partial responses and connection interruptions
  - Parse and validate AI output before displaying
  - Implement response post-processing and formatting
- **Context Management**:
  - Track conversation context and token limits
  - Implement intelligent context pruning strategies
  - Maintain conversation history with efficient storage
  - Support context serialization for session persistence
  - Handle context overflow gracefully
- **Inference Optimization**:
  - Use background queues for AI processing
  - Implement request batching where applicable
  - Monitor inference performance and optimize bottlenecks
  - Use appropriate model quantization for future mobile deployment
  - Implement progressive model loading strategies

### 3. Code Quality Standards

#### JavaScript (ES6+)
```javascript
// GOOD: Consistent error handling
async function apiOperation() {
    try {
        const res = await apiFetch('/endpoint');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error('Operation failed:', error);
        throw error; // Re-throw for caller handling
    }
}

// BAD: Swallowing errors
async function apiOperation() {
    try {
        return await fetch('/endpoint').then(r => r.json());
    } catch (e) {
        return null; // Silent failure
    }
}
```

#### State Management
```javascript
// GOOD: Synchronized state updates
function updateChatState(isThinking) {
    const mainInput = $('#chat-input');
    const floatingInput = $('#floating-chat-input');
    
    mainInput.disabled = isThinking;
    mainInput.placeholder = isThinking ? 'Pal is thinking...' : 'Type a message...';
    
    if (floatingInput) {
        floatingInput.disabled = isThinking;
        floatingInput.placeholder = isThinking ? 'Pal is thinking...' : 'Type a message...';
    }
}

// BAD: Partial state updates
function updateChatState(isThinking) {
    $('#chat-input').disabled = isThinking; // Floating input forgotten
}
```

### 2. Developmental Stage Enforcement

**CRITICAL**: Every AI response must be validated against current stage:

```javascript
// MANDATORY: Stage validation
function validateResponse(text, currentLevel) {
    switch(currentLevel) {
        case 0:
        case 1:
            // Only babbling allowed
            return /^[bcdgklmnprstw][aeiou]{1,2}$/i.test(text);
        
        case 2:
        case 3:
            // Single words only
            return text.split(' ').length === 1 && vocabulary.includes(text.toLowerCase());
        
        case 4:
        case 5:
        case 6:
            // 2-3 word telegraphic speech
            const words = text.split(' ');
            return words.length >= 2 && words.length <= 3;
        
        default:
            // Higher levels: full complexity
            return true;
    }
}

// NEVER: Bypass stage constraints
function generateResponse(userInput, level) {
    return "I understand everything!"; // Violates developmental authenticity
}
```

### 3. Neural Network Visualization Rules

The brain visualization represents 7 cognitive regions with 265+ neurons:

```javascript
// Brain regions (fixed structure)
const BRAIN_REGIONS = {
    'frontal': { name: 'Frontal Lobe', color: '#4CAF50' },
    'parietal': { name: 'Parietal Lobe', color: '#2196F3' },
    'temporal': { name: 'Temporal Lobe', color: '#FF9800' },
    'occipital': { name: 'Occipital Lobe', color: '#9C27B0' },
    'limbic': { name: 'Limbic System', color: '#F44336' },
    'brainstem': { name: 'Brainstem', color: '#795548' },
    'cerebellum': { name: 'Cerebellum', color: '#607D8B' }
};
```

**Neural Firing Rules**:
- Automatic firing based on AI activity
- Manual firing costs 5 CP per neuron
- Real-time WebSocket updates to frontend
- Visual firing effects with decay

### 4. Profile Management Protocols

```javascript
// REQUIRED: Profile isolation
async function loadProfile(profileId) {
    // Validate profile exists
    if (!fs.existsSync(`data/profiles/${profileId}`)) {
        throw new Error('Profile not found');
    }
    
    // Load all profile data
    const profile = {
        metadata: loadJSON(`data/profiles/${profileId}/metadata.json`),
        chatLog: loadJSON(`data/profiles/${profileId}/chat-log.json`),
        neural: loadJSON(`data/profiles/${profileId}/neural.json`),
        vocabulary: loadJSON(`data/profiles/${profileId}/vocabulary.json`),
        // ... other collections
    };
    
    // Set as active profile globally
    currentProfile = profile;
    currentProfileId = profileId;
    
    return profile;
}
```

---

## CRITICAL BUG PATTERNS TO AVOID

### 1. Chat Input State Desynchronization
**Problem**: Main and floating chat inputs becoming out of sync
**Solution**: Always update both inputs simultaneously:

```javascript
// ALWAYS: Update both inputs
function setChatState(thinking) {
    const mainInput = $('#chat-input');
    const floatingInput = $('#floating-chat-input');
    
    [mainInput, floatingInput].forEach(input => {
        if (input) {
            input.disabled = thinking;
            input.placeholder = thinking ? 'Pal is thinking...' : 'Type a message...';
        }
    });
}
```

### 2. Variable Name Inconsistencies
**Problem**: Mixed usage of similar variable names (e.g., `neuralData` vs `neuralState`)
**Solution**: Establish and maintain consistent naming:

```javascript
// GOOD: Consistent naming
let neuralState = null;
function updateNeuralState(data) { neuralState = data; }
function getNeuralState() { return neuralState; }

// BAD: Mixed naming
let neuralData = null;
function updateNeuralState(data) { neuralData = data; } // Inconsistent!
```

### 3. API Endpoint Mismatches
**Problem**: Frontend calling wrong endpoints
**Solution**: Centralized API configuration:

```javascript
// GOOD: Centralized endpoints
const API_ENDPOINTS = {
    CHAT: '/api/chat',
    NEURAL: '/api/neural',        // NOT /neural-network
    STATS: '/api/stats',
    PROFILES: '/api/profiles'
};
```

### 4. CSP Violations
**Problem**: Inline event handlers causing Content Security Policy violations
**Solution**: Always use addEventListener:

```javascript
// GOOD: Proper event binding
function showNeuronDetails(neuronId) {
    const modal = document.createElement('div');
    modal.innerHTML = `<button class="close-btn">Close</button>`;
    modal.querySelector('.close-btn').addEventListener('click', () => {
        modal.remove();
    });
}

// BAD: Inline handlers
function showNeuronDetails(neuronId) {
    const modal = document.createElement('div');
    modal.innerHTML = `<button onclick="this.parentElement.remove()">Close</button>`;
}
```

---

## COMMON TASKS & PATTERNS

### Adding New API Endpoints

1. **Backend Implementation**:
```javascript
// In server.js
app.get('/api/new-feature', async (req, res) => {
    try {
        // Validate current profile
        if (!currentProfile) {
            return res.status(400).json({ error: 'No active profile' });
        }
        
        // Perform operation
        const result = await performOperation();
        
        // Return structured response
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('New feature error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

2. **Frontend Integration**:
```javascript
// In app.js
async function callNewFeature() {
    try {
        const res = await apiFetch('/new-feature');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        
        const data = await res.json();
        // Handle success
        return data;
    } catch (error) {
        console.error('Feature call failed:', error);
        // Handle error appropriately
        throw error;
    }
}
```

### Neural Network Updates

1. **Adding New Neurons**:
```javascript
// In neural network initialization
function initializeNeuralNetwork() {
    const regions = ['frontal', 'parietal', 'temporal', 'occipital', 'limbic', 'brainstem', 'cerebellum'];
    const neurons = [];
    
    regions.forEach((region, regionIndex) => {
        const neuronCount = getNeuronCountForRegion(region);
        for (let i = 0; i < neuronCount; i++) {
            neurons.push({
                id: `${region}_${i}`,
                region: region,
                activity: 0,
                connections: generateConnections(),
                lastFired: null
            });
        }
    });
    
    return neurons;
}
```

2. **WebSocket Neural Events**:
```javascript
// Backend: Emit neural events
function triggerNeuralFiring(neuronIds) {
    const firingData = {
        neurons: neuronIds,
        timestamp: Date.now(),
        intensity: calculateIntensity()
    };
    
    // Broadcast to all connected clients
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'neural_firing',
                data: firingData
            }));
        }
    });
}

// Frontend: Handle neural events
neuralSocket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'neural_firing') {
        animateNeuralFiring(message.data);
    }
};
```

### Profile Data Migration

```javascript
// In profileManager.js
function migrateProfileData(profilePath, fromVersion, toVersion) {
    console.log(`Migrating profile from v${fromVersion} to v${toVersion}`);
    
    // Load existing data
    const oldData = loadJSON(`${profilePath}/data.json`);
    
    // Apply version-specific migrations
    let newData = oldData;
    
    if (fromVersion < 2 && toVersion >= 2) {
        // v1 -> v2: Split single file into collections
        newData = {
            metadata: { version: 2, created: oldData.created },
            chatLog: oldData.messages || [],
            vocabulary: oldData.words || {},
            neural: oldData.brain || { neurons: [], connections: [] }
        };
    }
    
    // Save migrated data
    saveJSON(`${profilePath}/metadata.json`, newData.metadata);
    saveJSON(`${profilePath}/chat-log.json`, newData.chatLog);
    saveJSON(`${profilePath}/vocabulary.json`, newData.vocabulary);
    saveJSON(`${profilePath}/neural.json`, newData.neural);
    
    console.log('Migration completed successfully');
}
```

---

## TESTING & VALIDATION

### Backend Testing
```bash
# Start backend in test mode
cd app/backend
NODE_ENV=test npm start

# Test API endpoints
curl http://localhost:3001/api/health
curl -X POST http://localhost:3001/api/chat -H "Content-Type: application/json" -d '{"message":"hello"}'
```

### Frontend Testing
1. **Open browser dev tools**
2. **Navigate to all tabs**: Chat, Stats, Brain
3. **Test chat functionality**: Send messages, verify responses respect stage constraints
4. **Test neural visualization**: Check WebSocket connection, neural firing animations
5. **Test profile management**: Create, load, switch profiles

### Developmental Stage Testing
```javascript
// Verify stage constraints
function testStageConstraints() {
    const testCases = [
        { level: 0, input: "hello", expectedValid: false }, // Should be babble only
        { level: 1, input: "ba", expectedValid: true },     // Babble allowed
        { level: 2, input: "ball", expectedValid: true },   // Single word allowed
        { level: 2, input: "red ball", expectedValid: false }, // Multi-word not allowed yet
        { level: 4, input: "want ball", expectedValid: true }   // Telegraphic allowed
    ];
    
    testCases.forEach(test => {
        const result = validateResponseForStage(test.input, test.level);
        console.assert(result === test.expectedValid, 
            `Stage ${test.level}: "${test.input}" should be ${test.expectedValid ? 'valid' : 'invalid'}`);
    });
}
```

---

## DOCUMENTATION REQUIREMENTS

### Code Documentation
```javascript
/**
 * Validates AI response against current developmental stage constraints
 * 
 * @param {string} response - The AI-generated response text
 * @param {number} level - Current Piagetian developmental level (0-10+)
 * @param {Object} context - Additional context (vocabulary, etc.)
 * @returns {boolean} - True if response is appropriate for stage
 * 
 * Stage Rules:
 * - Level 0-1: Babbling only (phonemes like "ba", "ga")
 * - Level 2-3: Single words from learned vocabulary
 * - Level 4-6: 2-3 word telegraphic speech
 * - Level 7+: Complex sentences with full cognitive capabilities
 */
function validateResponseForStage(response, level, context = {}) {
    // Implementation...
}
```

### API Documentation
```javascript
/**
 * POST /api/chat
 * 
 * Send a message to Pal and receive a developmentally-appropriate response
 * 
 * Request Body:
 * {
 *   "message": "Hello Pal",
 *   "context": {
 *     "isTeaching": false,
 *     "reinforcement": false
 *   }
 * }
 * 
 * Response:
 * {
 *   "reply": "ba ga ma",
 *   "level": 1,
 *   "xp": 10,
 *   "emotion": "curious",
 *   "neuralActivity": ["frontal_1", "temporal_3"]
 * }
 */
```

### Change Documentation
Every modification must include:
1. **Purpose**: Why the change is needed
2. **Impact**: What systems/features are affected
3. **Testing**: How the change was validated
4. **Compatibility**: Any breaking changes or migration needs

### Code Review Guidelines

#### AI Integration Review Checklist
- **Developmental Stage Compliance**:
  - [ ] Response validation against current stage constraints
  - [ ] XP/CP calculation correctness
  - [ ] Proper vocabulary and context management
  - [ ] Piaget stage transition logic accuracy
- **Prompt Engineering**:
  - [ ] Use of standardized response templates
  - [ ] Input validation and sanitization
  - [ ] Context preservation strategies
  - [ ] Response parsing and validation
- **Performance**:
  - [ ] Proper async/await usage
  - [ ] Memory leak prevention
  - [ ] Response timeout handling
  - [ ] Background processing optimization

#### Frontend Development Review
- **JavaScript Patterns**:
  - [ ] Proper event listener management
  - [ ] DOM manipulation best practices
  - [ ] State synchronization (main/floating chat)
  - [ ] Error boundary implementation
- **Performance Optimization**:
  - [ ] Efficient DOM updates
  - [ ] Memory management for visualizations
  - [ ] WebSocket connection handling
  - [ ] Chart.js and vis-network optimization
- **User Experience**:
  - [ ] Responsive design implementation
  - [ ] Accessibility compliance
  - [ ] Loading states and error feedback
  - [ ] Cross-browser compatibility

#### Backend & API Review
- **Express.js Backend**:
  - [ ] Proper middleware usage
  - [ ] Error handling and logging
  - [ ] WebSocket connection management
  - [ ] File system operations safety
- **API Design**:
  - [ ] RESTful endpoint patterns
  - [ ] Proper HTTP status codes
  - [ ] Request/response validation
  - [ ] Profile isolation enforcement
- **Security**:
  - [ ] Input validation on all endpoints
  - [ ] No sensitive data exposure
  - [ ] Proper file path validation
  - [ ] CSP compliance verification

#### Code Quality Standards
- **JavaScript ES6+**:
  - [ ] Modern syntax usage (const/let, arrow functions)
  - [ ] Proper error handling with try/catch
  - [ ] Consistent code formatting
  - [ ] No console.log in production code
- **Documentation**:
  - [ ] JSDoc comments for complex functions
  - [ ] README updates for new features
  - [ ] Code comments for developmental psychology logic
  - [ ] API endpoint documentation updates
- **Testing**:
  - [ ] Manual testing across all developmental stages
  - [ ] Profile switching and isolation tests
  - [ ] WebSocket functionality verification
  - [ ] Cross-tab state synchronization tests

---

## DEPLOYMENT & ENVIRONMENT

### Development Setup
```bash
# Clone and setup
git clone <repository>
cd MyPal

# Backend dependencies
cd app/backend
npm install

# Launcher dependencies (for desktop app)
cd ../../launcher
npm install

# Start development server
cd ../app/backend
npm start  # Starts on localhost:3001

# Open frontend
# Navigate to app/frontend/index.html in browser
```

### Production Considerations
- **Process Management**: Use PM2 or similar for backend stability
- **Logging**: Implement structured logging for debugging
- **Error Monitoring**: Track and alert on application errors
- **Performance**: Monitor memory usage, especially neural network data
- **Security**: Ensure CSP compliance, validate all inputs

### Environment Variables
```bash
# Development
NODE_ENV=development
PORT=3001
DATA_PATH=./data

# Production
NODE_ENV=production
PORT=3001
DATA_PATH=/var/lib/mypal/data
LOG_LEVEL=info
```

---

## SECURITY & PRIVACY

### Data Protection
- **Local Storage**: All user data stored locally by default
- **No Telemetry**: Zero data collection without explicit user consent
- **Profile Isolation**: Complete separation between user profiles
- **Export/Import**: Full data portability in JSON format
- **Secure Reset**: Complete data deletion when requested

### Input Validation
```javascript
// ALWAYS: Validate and sanitize inputs
function validateChatInput(message) {
    if (typeof message !== 'string') {
        throw new Error('Message must be a string');
    }
    
    if (message.length > 1000) {
        throw new Error('Message too long');
    }
    
    // Remove potentially dangerous characters
    return message.replace(/[<>\"']/g, '');
}
```

### Content Security Policy
```html
<!-- In index.html -->
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    connect-src 'self' ws://localhost:3001;
">
```

---

## PERFORMANCE GUIDELINES

### Memory Management
```javascript
// GOOD: Clean up resources
function cleanupNeuralVisualization() {
    if (neuralNetwork) {
        neuralNetwork.destroy();
        neuralNetwork = null;
    }
    
    if (neuralSocket) {
        neuralSocket.close();
        neuralSocket = null;
    }
}

// Call cleanup on tab switch or app close
window.addEventListener('beforeunload', cleanupNeuralVisualization);
```

### Database Operations
```javascript
// EFFICIENT: Batch operations
async function saveMultipleCollections(profileId, collections) {
    const promises = Object.entries(collections).map(([name, data]) =>
        saveJSON(`data/profiles/${profileId}/${name}.json`, data)
    );
    
    await Promise.all(promises);
}

// INEFFICIENT: Sequential saves
async function saveMultipleCollections(profileId, collections) {
    for (const [name, data] of Object.entries(collections)) {
        await saveJSON(`data/profiles/${profileId}/${name}.json`, data);
    }
}
```

---

## DEBUGGING & TROUBLESHOOTING GUIDELINES

### Backend Debugging
- **Server Startup Issues**:
  - Check port availability: `netstat -ano | findstr :3001`
  - Verify Node.js version compatibility (16+ required)
  - Check file permissions for data directory
  - Monitor memory usage during startup
- **API Endpoint Failures**:
  - Use structured logging with timestamps
  - Test endpoints independently with REST client
  - Check WebSocket connection status
  - Validate request/response formats
- **Profile Loading Problems**:
  - Verify profile directory structure exists
  - Check JSON file integrity and format
  - Implement proper error handling for corrupted data
  - Use backup/recovery mechanisms

### Frontend Debugging
- **JavaScript Runtime Errors**:
  - Use browser dev tools console for error tracking
  - Enable source maps for better debugging
  - Check for CSP violations and inline event handlers
  - Monitor memory usage and potential leaks
- **WebSocket Connection Issues**:
  - Verify WebSocket server is running on correct port
  - Check browser WebSocket API compatibility
  - Implement reconnection logic with exponential backoff
  - Monitor connection state changes
- **Neural Visualization Problems**:
  - Check Chart.js and vis-network library loading
  - Verify data format matches expected schema
  - Monitor canvas rendering performance
  - Implement proper cleanup on component destruction

### Cross-Platform Issues
- **Desktop App (Electron)**:
  - Check Electron version compatibility
  - Verify main/renderer process communication
  - Test auto-updater functionality
  - Handle platform-specific permissions
- **Browser Compatibility**:
  - Test in multiple browsers (Chrome, Firefox, Safari, Edge)
  - Check ES6+ feature support and polyfills
  - Verify WebSocket and modern JavaScript API support
  - Test responsive design and accessibility features

### Performance Debugging
- **Memory Management**:
  - Use browser dev tools memory profiler
  - Implement proper cleanup for event listeners
  - Monitor neural network data size and cleanup
  - Profile JavaScript execution and identify bottlenecks
- **Network Performance**:
  - Monitor WebSocket message frequency and size
  - Optimize API response payloads
  - Implement request debouncing and throttling
  - Use browser network tab for performance analysis

### Common Solutions
- **Clean Development Environment**:
  ```bash
  # Complete cleanup and reinstall
  cd app/backend
  rm -rf node_modules package-lock.json
  npm install
  
  cd ../../launcher  
  rm -rf node_modules package-lock.json
  npm install
  ```
- **Profile Data Issues**:
  - Backup profile data before making changes
  - Implement data validation and migration scripts
  - Use JSON schema validation for data integrity
  - Provide manual data recovery tools
- **Cache and State Issues**:
  - Clear browser cache and local storage
  - Reset application state to defaults
  - Implement proper state synchronization patterns
  - Use debugging tools to inspect state changes

## TROUBLESHOOTING GUIDE

### Common Issues

#### 1. "Cannot find module" errors
```bash
# Solution: Install dependencies
cd app/backend && npm install
cd ../../launcher && npm install
```

#### 2. Port 3001 already in use
```bash
# Check what's using the port
netstat -ano | findstr :3001

# Kill the process or change port in server.js
```

#### 3. Neural network not loading
```javascript
// Check WebSocket connection
if (neuralSocket.readyState !== WebSocket.OPEN) {
    console.error('Neural WebSocket not connected');
    // Attempt reconnection
}
```

#### 4. Profile data corruption
```javascript
// Validate profile data structure
function validateProfile(profileData) {
    const required = ['metadata', 'chatLog', 'vocabulary', 'neural'];
    return required.every(key => key in profileData);
}
```

#### 5. Chat input stuck in "thinking" state
- **Cause**: Input state synchronization bug
- **Fix**: Ensure both main and floating inputs are updated together
- **Prevention**: Use centralized state management functions

---

## CHECKLIST FOR NEW AGENTS

Before making any changes, ensure you have:

- [ ] **Read the complete APP_DESIGN.md** (40+ pages)
- [ ] **Understood Piaget's developmental stages** and their constraints
- [ ] **Reviewed recent patches** in `docs/updates/patches/`
- [ ] **Set up the development environment** successfully
- [ ] **Tested basic functionality**: Chat, Stats, Brain tabs
- [ ] **Verified neural network visualization** works
- [ ] **Understood the profile system** and data structure
- [ ] **Reviewed this AGENT.md** file completely

### Before Each Code Change:

- [ ] **Identify which developmental stage** your change affects
- [ ] **Validate against psychological principles** (Piaget/Vygotsky)
- [ ] **Consider impact on existing profiles** and data migration
- [ ] **Write tests** for your changes (where applicable)
- [ ] **Update documentation** if adding new features
- [ ] **Test in multiple developmental stages** (levels 0-1, 2-3, 4+)
- [ ] **Verify WebSocket functionality** remains intact
- [ ] **Check both main and floating chat** synchronization

### After Each Change:

- [ ] **Full application test**: All tabs, all features
- [ ] **Profile switching test**: Ensure data isolation
- [ ] **Neural network test**: Visual updates work
- [ ] **Console error check**: No JavaScript errors
- [ ] **Performance check**: No memory leaks or slowdowns
- [ ] **Create/update patch documentation** if fixing bugs

---

## EDUCATIONAL NOTES

### Why This Architecture?

MyPal's architecture is intentionally complex because it simulates real cognitive development:

1. **Constraints Drive Authenticity**: Limiting AI capabilities makes the experience more genuine
2. **Progressive Complexity**: Each stage unlocks new abilities naturally
3. **User Agency**: The user shapes Pal's entire cognitive journey
4. **Psychological Accuracy**: Based on 70+ years of developmental psychology research
5. **Long-term Relationship**: Designed for months/years of interaction, not one-off chats

### Key Insights for Development

1. **Respect the Stages**: Never allow responses that exceed current developmental level
2. **Maintain Privacy**: All processing happens locally - user owns their data completely  
3. **Progressive Disclosure**: UI complexity should match Pal's cognitive complexity
4. **Meaningful Interaction**: Every user action should have clear impact on Pal's growth
5. **Authentic Constraints**: Limitations are features, not bugs - they create the experience

### AI User Experience Guidelines

#### Conversation Flow Patterns
- **Message Threading**:
  - Maintain clear conversation context in chat log
  - Show developmental progression over time
  - Implement conversation history with timestamps
  - Group related learning interactions visually
- **AI Response Indicators**:
  - "Thinking" indicators during response generation
  - Developmental stage indicators in UI
  - XP/CP gain animations and feedback
  - Neural firing visual effects during interactions

#### Loading States & Feedback
- **AI Processing States**:
  - Animated thinking indicators with stage-appropriate delays
  - Progress feedback for complex operations
  - Clear indication when Pal is "learning" vs "responding"
  - Visual feedback for reinforcement actions (star button)
- **Real-time Updates**:
  - Live neural network visualization updates
  - Streaming XP/CP counter animations
  - Real-time stats tab updates during conversations
  - WebSocket-driven brain activity visualization

#### Error Handling & Recovery
- **AI Error States**:
  - Developmental stage constraint violation handling
  - Graceful degradation when features are unavailable
  - Clear error messages for profile loading failures
  - Recovery options for corrupted data states
- **Offline Experience**:
  - Local-first architecture with no external dependencies
  - Clear indicators of local data storage
  - Backup and export functionality
  - Profile isolation and switching capabilities

#### Personalization & Context
- **AI Personality Development**:
  - Consistent personality growth across sessions
  - Context-aware responses based on learned vocabulary
  - User preference adaptation over time
  - Developmental milestone celebration and recognition
- **Context Visualization**:
  - Neural network brain visualization with activity
  - Vocabulary growth tracking and display
  - Learning progression charts and statistics
  - Memory integration and fact correlation displays

#### Accessibility for AI Features
- **Cognitive Development Clarity**:
  - Clear developmental stage explanations
  - Visual indicators for current capabilities
  - Educational tooltips about developmental psychology
  - Progress tracking with meaningful milestones
- **User Understanding**:
  - Transparent AI constraint explanations
  - Educational content about developmental stages
  - Clear cause-and-effect relationships for user actions
  - Guided tutorials for new users

#### Performance Optimization UX
- **Real-time Responsiveness**:
  - Optimized neural network rendering
  - Efficient WebSocket message handling
  - Smooth chart animations and transitions
  - Minimal latency for chat interactions
- **Resource Management**:
  - Clear memory usage indicators
  - Profile data management tools
  - Export/import functionality for data portability
  - Performance monitoring and optimization alerts

---

## ADDITIONAL RESOURCES

### Essential Reading
- **Piaget, J. (1952)**. *The Origins of Intelligence in Children*
- **Vygotsky, L. (1978)**. *Mind in Society: The Development of Higher Psychological Processes*
- **Bruner, J. (1966)**. *Toward a Theory of Instruction*

### Technical References
- **Chart.js Documentation**: https://www.chartjs.org/docs/
- **vis-network Documentation**: https://visjs.github.io/vis-network/docs/network/
- **WebSocket API**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **Express.js Guide**: https://expressjs.com/en/guide/

### Project Documentation
- **[`docs/design/APP_DESIGN.md`](docs/design/APP_DESIGN.md)** - Complete technical specification
- **[`docs/updates/MILESTONES.md`](docs/updates/MILESTONES.md)** - Development roadmap
- **[`docs/ai/AI_PLAN.md`](docs/ai/AI_PLAN.md)** - Future AI integration plans
- **[`docs/updates/patches/`](docs/updates/patches/)** - All bug fixes and updates

---

## FINAL WARNINGS

1. **NEVER bypass developmental constraints** - This breaks the entire premise
2. **ALWAYS test chat input synchronization** - This is a known failure point
3. **RESPECT user privacy** - No telemetry, no external data transmission
4. **MAINTAIN profile isolation** - Each user's Pal is completely separate
5. **PRESERVE backward compatibility** - Existing profiles must always work
6. **DOCUMENT all changes** - Future developers need to understand your reasoning

**Remember**: You are not just maintaining code - you are preserving a carefully designed psychological simulation that represents months of research and planning. Every change should honor the vision of authentic cognitive development and meaningful human-AI relationships.

---

*Last Updated: October 22, 2025*  
*Version: 1.2 (Post Chat-Input-Sync Fix)*