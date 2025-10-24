# MyPal Mobile - Architecture Documentation

## Overview

MyPal Mobile is a React Native application with an embedded Node.js backend, designed to run completely offline on iOS and Android devices. This document explains the architecture, design decisions, and technical implementation.

## Technology Stack

### Frontend
- **React Native**: 0.76.6 - Cross-platform mobile framework
- **TypeScript**: 5.0.4 - Type safety and better developer experience
- **React Navigation**: 6.x - Navigation library (Stack and Bottom Tabs)
- **React Native Paper**: 5.x - Material Design 3 UI components
- **Redux Toolkit**: State management with modern Redux patterns
- **React Hooks**: Functional component patterns

### Backend
- **nodejs-mobile-react-native**: Embedded Node.js runtime on mobile devices
- **Express**: Lightweight web framework for API endpoints
- **WebSocket (ws)**: Real-time communication (future feature)
- **nanoid**: Unique ID generation

## Architecture Pattern: MVVM + Redux

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx (Root)                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │           Navigation Container                    │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │          Stack Navigator                    │ │  │
│  │  │  ┌───────────────────────────────────────┐  │ │  │
│  │  │  │   ProfileSelection Screen            │  │ │  │
│  │  │  └───────────────────────────────────────┘  │ │  │
│  │  │  ┌───────────────────────────────────────┐  │ │  │
│  │  │  │   Main (Tab Navigator)               │  │ │  │
│  │  │  │  - Chat Screen                       │  │ │  │
│  │  │  │  - Stats Screen                      │  │ │  │
│  │  │  │  - Brain Screen                      │  │ │  │
│  │  │  │  - Settings Screen                   │  │ │  │
│  │  │  └───────────────────────────────────────┘  │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 Redux Store (State)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Profile   │  │    Chat     │  │    Stats    │    │
│  │   Slice     │  │    Slice    │  │    Slice    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Backend Service Layer                      │
│  - API communication with embedded Node.js              │
│  - HTTP requests to localhost:3001                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│         Embedded Node.js Backend Server                 │
│  - Express server on port 3001                          │
│  - In-memory data storage (temporary)                   │
│  - RESTful API endpoints                                │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
mobile/
├── App.tsx                      # Root component with navigation
├── index.js                     # App entry point
├── package.json                 # Dependencies and scripts
│
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── MessageBubble.tsx
│   │   ├── LoadingScreen.tsx
│   │   └── index.ts            # Barrel exports
│   │
│   ├── screens/                 # Screen components
│   │   ├── ProfileSelectionScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   ├── StatsScreen.tsx
│   │   ├── BrainScreen.tsx
│   │   └── SettingsScreen.tsx
│   │
│   ├── services/                # Business logic
│   │   └── BackendService.ts   # API communication
│   │
│   ├── store/                   # Redux state management
│   │   ├── index.ts            # Store configuration
│   │   ├── profileSlice.ts     # Profile state
│   │   ├── chatSlice.ts        # Chat state
│   │   └── statsSlice.ts       # Stats state
│   │
│   ├── types/                   # TypeScript definitions
│   │   ├── index.ts            # Data models
│   │   └── navigation.ts       # Navigation types
│   │
│   ├── hooks/                   # Custom React hooks
│   │   └── index.ts
│   │
│   └── utils/                   # Utility functions
│       └── index.ts
│
├── nodejs-assets/
│   └── nodejs-project/          # Embedded backend
│       ├── package.json
│       ├── src/
│       │   └── main.js         # Express server
│       ├── models/             # AI models (future)
│       └── data/               # Local storage
│
├── android/                     # Android native code
└── ios/                         # iOS native code
```

## Data Flow

### 1. User Interaction → Redux Action
```typescript
// User types a message in ChatScreen
dispatch(sendMessage(userMessage));
```

### 2. Redux Thunk → Backend Service
```typescript
// chatSlice.ts
export const sendMessage = createAsyncThunk('chat/sendMessage', async (message: string) => {
  const response = await BackendService.sendMessage(message);
  return { userMessage: message, response: response.data };
});
```

### 3. Backend Service → Embedded Node.js
```typescript
// BackendService.ts
async sendMessage(message: string): Promise<ApiResponse<ChatResponse>> {
  return this.fetch<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
```

### 4. Node.js Processing → Response
```javascript
// main.js
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  // Process message, generate response
  res.json({ reply, xpGained: 10, leveledUp: false });
});
```

### 5. Redux Update → UI Re-render
```typescript
// chatSlice.ts
.addCase(sendMessage.fulfilled, (state, action) => {
  state.messages.push(userMessage);
  state.messages.push(palResponse);
});
```

## State Management

### Redux Slices

#### Profile Slice
- **State**: List of profiles, current active profile
- **Actions**: fetchProfiles, createProfile, loadProfile, deleteProfile
- **Used by**: ProfileSelectionScreen

#### Chat Slice
- **State**: Message history, typing indicator
- **Actions**: sendMessage, fetchChatLog, addMessage
- **Used by**: ChatScreen

#### Stats Slice
- **State**: Current stats (level, XP, personality, lobes)
- **Actions**: fetchStats
- **Used by**: StatsScreen

## API Endpoints

All endpoints are served by the embedded Node.js backend on `localhost:3001`.

### Profile Management
- `GET /api/profiles` - List all profiles
- `POST /api/profiles` - Create new profile
- `POST /api/profiles/:id/load` - Load profile
- `DELETE /api/profiles/:id` - Delete profile

### Chat
- `POST /api/chat` - Send message and get response
- `GET /api/chatlog` - Get conversation history
- `POST /api/reinforce` - Reinforce a message

### Stats & Data
- `GET /api/stats` - Get current stats
- `GET /api/neural-network` - Get brain structure
- `POST /api/neural/regenerate` - Regenerate neural network
- `GET /api/export` - Export all data
- `POST /api/reset` - Reset all data

### Settings
- `POST /api/settings` - Update settings
- `GET /api/health` - Health check

## Offline-First Design

MyPal Mobile is designed to work completely offline:

1. **Embedded Backend**: Node.js runs directly on the device
2. **Local Storage**: All data stored in app-specific directories
3. **No External Calls**: No internet required for core functionality
4. **Optional Telemetry**: Can be enabled by user (future feature)

## Performance Optimizations

### React Native
- **FlatList**: Virtualized lists for chat history
- **React.memo**: Memoized components to prevent unnecessary re-renders
- **useMemo/useCallback**: Memoized values and functions
- **Lazy Loading**: Future implementation for heavy components

### State Management
- **Redux Toolkit**: Reduced boilerplate with createSlice
- **Immer**: Immutable updates with mutable syntax
- **Selector Memoization**: Efficient state selection

### Backend
- **In-Memory Storage**: Fast access (temporary solution)
- **Future SQLite**: Persistent storage with indexing
- **Connection Pooling**: For WebSocket connections (future)

## Security Considerations

### Data Protection
- All data stays on device
- No cloud sync without explicit opt-in
- Secure storage for sensitive data (future)

### API Security
- Backend only accepts localhost connections
- Input validation on all endpoints
- Rate limiting (future implementation)

## Testing Strategy

### Unit Tests
- Redux slices and reducers
- Utility functions
- Backend API endpoints

### Integration Tests
- API communication flow
- State management integration
- Navigation flow

### E2E Tests (Future)
- User flows with Detox
- Cross-platform testing

## Known Limitations

1. **In-Memory Storage**: Data lost on app restart (SQLite planned)
2. **Simple AI**: Basic response logic (local LLM planned)
3. **No Background Processing**: Limited by mobile OS restrictions
4. **Basic Visualization**: 3D neural network in future

## Future Enhancements

### Phase 1: Data Persistence
- SQLite database integration
- Data migration system
- Backup/restore functionality

### Phase 2: AI Integration
- Local LLM models (GGML format)
- Model downloading and management
- Inference optimization for mobile

### Phase 3: Advanced Features
- Voice input/output
- Push notifications
- Widget support
- Cloud sync (optional)

### Phase 4: Visualization
- 3D neural network with react-native-3d-model-view
- Interactive brain exploration
- Animation improvements

## Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes to src/
# Run on device
npm run android  # or npm run ios

# Test changes
npm test

# Commit and push
git commit -m "[FEATURE] Description"
git push
```

### 2. Backend Updates
```bash
# Update nodejs-assets/nodejs-project/src/main.js
# The backend restarts automatically on rebuild

# Test API endpoint
# Use BackendService methods in components
```

### 3. State Management Updates
```bash
# Update or create new slice in src/store/
# Connect to components with useAppSelector/useAppDispatch
# Test with Redux DevTools (future)
```

## Debugging

### React Native Debugger
- Enable in Debug Menu (Cmd+D on iOS, Cmd+M on Android)
- View component hierarchy
- Inspect Redux state

### Backend Logs
- Check Metro bundler output
- Add console.log in main.js
- View in device logs (adb logcat or Xcode)

### Network Inspection
- Use React Native Network Inspector
- Monitor API calls to localhost:3001

## Contributing Guidelines

When contributing to MyPal Mobile:

1. Follow TypeScript best practices
2. Use React hooks (no class components)
3. Write tests for new features
4. Update documentation
5. Test on both iOS and Android
6. Ensure offline functionality
7. Maintain privacy-first design

---

For more information, see:
- README.md - Setup and usage instructions
- QUICKSTART.md - Quick start guide
- Main repository documentation
