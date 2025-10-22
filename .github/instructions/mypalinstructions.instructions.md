---
applyTo: '**'
---
# MyPal AI Companion - Copilot Instructions

This is a cross-platform AI companion application with both desktop and mobile implementations. The desktop version uses Electron with a vanilla JavaScript frontend and Node.js/Express backend. The mobile version (in development) uses React Native with an embedded Node.js backend server locally on the device. Both provide offline-first AI interactions with local model support and authentic cognitive development simulation.

## Project Architecture

### Directory Structure
- `/app` - **Desktop Application (Current Implementation)**
    - `/frontend` - Vanilla JavaScript SPA frontend
        - `app.js` - Main application logic (3000+ lines)
        - `index.html` - UI structure with three-tab interface
        - `styles.css` - Complete styling and responsive design
    - `/backend` - Node.js/Express server
        - `/src` - Backend source code
            - `/server.js` - Main Express server with WebSocket support
            - `/profileManager.js` - Multi-profile data management
        - `/data` - JSON-based local data storage
- `/launcher` - **Electron Desktop Wrapper**
    - `main.js` - Electron main process
    - `package.json` - Desktop app configuration
    - Auto-startup backend integration
- `/mobile` - **React Native Mobile App (In Development)**
    - `/src` - Mobile application source code
        - `/components` - Reusable UI components
        - `/screens` - Screen components for navigation
        - `/services` - Business logic and API services
        - `/hooks` - Custom React hooks
        - `/types` - TypeScript type definitions
        - `/utils` - Utility functions and helpers
        - `/store` - State management (Redux/Context)
    - `/nodejs-assets/nodejs-project` - Embedded Node.js backend
        - `/src` - Backend TypeScript source
        - `/models` - Local AI model files
        - `/data` - Local databases and storage
    - `/android` - Android-specific native code
    - `/ios` - iOS-specific native code

### Core Technologies Stack

#### **Desktop Application (Current)**
- **Frontend**: Vanilla JavaScript ES6+ with Chart.js and vis-network
- **UI Framework**: Custom CSS with three-tab interface (Chat, Stats, Brain)
- **Backend**: Node.js/Express with WebSocket support
- **Database**: JSON file-based storage with multi-profile support
- **Desktop Wrapper**: Electron for cross-platform deployment
- **Real-time**: WebSocket for neural network visualization
- **Visualization**: Chart.js for stats, vis-network for neural graphs

#### **Mobile Application (In Development)**
- **Frontend**: React Native 0.72+ with TypeScript 5+
- **Navigation**: React Navigation 6+ (Stack, Tab, Drawer navigators)
- **UI Framework**: React Native Paper 5+ with Material Design 3
- **Backend**: nodejs-mobile-react-native for embedded Node.js
- **Database**: SQLite via react-native-sqlite-storage
- **Storage**: AsyncStorage for app preferences, SecureStore for sensitive data
- **State Management**: Redux Toolkit with RTK Query for API state
- **WebSocket**: ws library for real-time communication

#### **Shared Technologies**
- **AI Models**: Local LLM integration (planned: Ollama, GGML formats)
- **Data Format**: JSON-based profile and conversation storage
- **Psychology Framework**: Piaget's developmental stages implementation
- **Privacy**: Complete offline-first architecture, no telemetry

## Development Environment Setup

### Prerequisites

#### **For Desktop Development (Current)**
- **Node.js**: Version 16+ (LTS recommended)
- **Electron**: Latest stable version
- **Package Managers**: npm (included with Node.js)
- **Git**: Latest version with proper SSH/HTTPS setup
- **Code Editor**: VS Code recommended with extensions

#### **For Mobile Development (Future)**
- **Node.js**: Version 18+ (LTS recommended)
- **React Native CLI**: Latest stable version
- **Platform SDKs**:
  - Android: Android Studio with SDK 34+
  - iOS: Xcode 14+ with iOS 14+ deployment target
- **Package Managers**: npm/yarn, CocoaPods for iOS
- **Git**: Latest version with proper SSH/HTTPS setup

### Project Setup Instructions

#### **Desktop Application Setup (Current)**
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

3. **Build and Run**:
   ```bash
   # Start backend server
   cd app/backend
   npm start  # Starts on localhost:3001
   
   # Open frontend (in separate terminal/browser)
   # Navigate to app/frontend/index.html in browser
   # OR use Live Server extension in VS Code
   
   # Run as desktop app (separate terminal)
   cd launcher
   npm start  # Launches Electron app
   ```

#### **Mobile Application Setup (Future)**
1. **Additional Mobile Dependencies**:
   ```bash
   # Mobile app dependencies
   cd mobile
   npm install
   
   # iOS dependencies (macOS only)
   cd ios && pod install && cd ..
   
   # Backend dependencies
   cd nodejs-assets/nodejs-project
   npm install
   cd ../..
   ```

2. **Local AI Models Setup**:
   ```bash
   # Create models directory
   mkdir -p mobile/nodejs-assets/nodejs-project/models
   
   # Download initial models (examples)
   # Add specific model download instructions here
   ```

3. **Mobile Development Tools**:
   - Configure Flipper for React Native debugging
   - Set up Android/iOS emulators or physical devices
   - Configure environment variables (see .env.example)

4. **Build and Run Mobile**:
   ```bash
   # Start Metro bundler
   npx react-native start
   
   # Run on Android (separate terminal)
   npx react-native run-android
   
   # Run on iOS (separate terminal, macOS only)
   npx react-native run-ios
   ```

### Development Tools Integration
- **VS Code Extensions**:
  - React Native Tools
  - TypeScript and JavaScript Language Features
  - ESLint and Prettier
  - GitLens for Git integration
  - Thunder Client for API testing
- **Debugging Setup**:
  - Flipper for React Native inspection
  - Chrome DevTools for JavaScript debugging
  - Android Studio for native Android debugging
  - Xcode for native iOS debugging
- **Performance Monitoring**:
  - React Native Performance monitor
  - Memory profiling tools
  - AI inference performance tracking

## Development Standards

### Code Organization
- Use feature-based folder structure within `/src`
- Implement barrel exports (index.ts) for clean imports
- Separate business logic from UI components
- Use custom hooks for stateful logic
- Implement proper error boundaries

### TypeScript Guidelines
- Strict mode enabled with all strict flags
- Define interfaces for all data structures
- Use generic types for reusable components
- Implement proper typing for API responses
- No `any` types unless absolutely necessary
- Use branded types for IDs and sensitive data

### React Native Best Practices
- Use FlatList/SectionList for large datasets
- Implement proper image caching and optimization
- Use Hermes JavaScript engine
- Optimize bundle size with proper tree shaking
- Implement lazy loading for screens and components
- Use React.memo and useMemo for performance optimization

### Backend Architecture (Embedded Node.js)
- Lightweight express server for API endpoints
- SQLite database for local data persistence
- WebSocket server for real-time updates
- File system management for model storage
- Background processing for AI inference
- Proper error handling and logging

### Security Requirements
- Use SecureStore for authentication tokens
- Implement proper data encryption for sensitive information
- Validate all inputs on both client and server
- Use HTTPS for any external API calls
- Implement proper session management
- No hardcoded secrets or API keys

### Performance Optimization
- Implement virtual scrolling for large lists
- Use React Native's new architecture (Fabric/TurboModules) when stable
- Optimize images with proper compression
- Implement proper caching strategies
- Use background threading for heavy operations
- Monitor memory usage and prevent leaks

### Offline-First Design
- Local SQLite database as single source of truth
- Queue network requests when offline
- Sync data when connection is restored
- Provide meaningful offline indicators
- Cache essential UI assets locally
- Implement conflict resolution for data sync

### AI Integration Guidelines
- Support for local LLM models (GGML, ONNX formats)
- Implement streaming responses for chat interface
- Use Web Workers/background threads for AI inference
- Provide model downloading and management UI
- Implement conversation context management
- Support for multiple AI personalities/configs

### AI Development Best Practices
- **Model Management**: 
  - Implement lazy loading for AI models to preserve memory
  - Use model pooling for frequently accessed models
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
  - Stream AI responses for better user experience
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
  - Use appropriate model quantization for mobile devices
  - Implement progressive model loading strategies

### Testing Requirements
- Unit tests for all business logic (Jest)
- Integration tests for API endpoints
- E2E testing with Detox
- Component testing with React Native Testing Library
- Performance testing for AI inference
- Manual testing on both iOS and Android

### Platform-Specific Considerations

#### Android
- Target SDK 34+ (Android 14)
- Use Gradle 8+ with build optimization
- Implement proper ProGuard rules
- Handle Android-specific permissions
- Support Android Auto (future consideration)

#### iOS
- Target iOS 14+ with proper Swift integration
- Use CocoaPods for native dependencies
- Handle iOS-specific permissions and privacy
- Support CarPlay (future consideration)
- Implement proper App Store review guidelines compliance

### Data Management
- Local-first architecture with optional cloud sync
- Encrypted local storage for user data
- Efficient data serialization (Protocol Buffers preferred)
- Implement proper data migration strategies
- Regular database maintenance and optimization

### API Design (Internal Backend)
- RESTful endpoints for CRUD operations
- WebSocket channels for real-time features
- Proper HTTP status codes and error responses
- Request/response validation with schemas
- Rate limiting for resource-intensive operations
- Comprehensive logging for debugging

### State Management Patterns
- Redux Toolkit for global application state
- Local component state for UI-only data
- React Query/RTK Query for server state
- Context for theme and user preferences
- Proper state normalization and selectors

### Error Handling & Logging
- Comprehensive error boundaries
- User-friendly error messages
- Detailed logging for debugging (with privacy considerations)
- Crash reporting integration (Flipper/Crashlytics)
- Graceful degradation for feature failures

### Accessibility (a11y)
- Proper accessibility labels and hints
- Support for screen readers
- High contrast mode support
- Font scaling support
- Keyboard navigation where applicable

### Internationalization (i18n)
- react-i18next for translations
- RTL language support
- Proper date/time localization
- Cultural considerations for UI/UX
- Dynamic language switching

### AI User Experience Guidelines

#### Conversation Flow Patterns
- **Message Threading**:
  - Maintain clear conversation context
  - Group related messages visually
  - Implement conversation branching for complex topics
  - Show conversation history with timestamps
- **AI Response Indicators**:
  - Typing indicators during inference
  - Progress bars for long-running operations
  - Model status indicators (online/offline/loading)
  - Response confidence levels when available

#### Loading States & Feedback
- **AI Thinking States**:
  - Animated thinking indicators
  - Estimated response time displays
  - Cancellation options for long requests
  - Queue position for batched requests
- **Streaming Responses**:
  - Real-time text streaming display
  - Partial response formatting
  - Stream interruption handling
  - Response completion indicators

#### Error Handling & Recovery
- **AI Error States**:
  - Model unavailable graceful degradation
  - Inference timeout user-friendly messages
  - Memory/resource limitation explanations
  - Retry mechanisms with exponential backoff
- **Offline Experience**:
  - Clear offline mode indicators
  - Local model availability status
  - Queued message indicators
  - Sync status when reconnecting

#### Personalization & Context
- **AI Personality Consistency**:
  - Maintain character voice across sessions
  - Context-aware response adaptation
  - User preference learning and application
  - Conversation style customization
- **Context Visualization**:
  - Show active context window
  - Highlight relevant conversation history
  - Context pruning notifications
  - Memory/fact integration indicators

#### Accessibility for AI Features
- **Screen Reader Support**:
  - Proper ARIA labels for AI status
  - Audio descriptions for visual AI indicators
  - Voice input/output accessibility
  - Keyboard navigation for AI controls
- **Cognitive Accessibility**:
  - Clear AI vs human message distinction
  - Simple language options
  - Conversation summary features
  - Important information highlighting

#### Performance Optimization UX
- **Model Management UI**:
  - Model download progress indicators
  - Storage usage visualization
  - Model switching interfaces
  - Performance metrics display
- **Response Optimization**:
  - Caching indicators for fast responses
  - Background processing notifications
  - Resource usage awareness features
  - Quality vs speed trade-off controls

### Build and Deployment
- Separate build configurations (dev/staging/prod)
- Code signing for both platforms
- Automated testing in CI/CD pipeline
- Bundle analysis and optimization
- Crash reporting and analytics integration

### Development Tools Integration
- Flipper for debugging and network inspection
- Metro bundler optimization
- ESLint and Prettier for code quality
- Husky for pre-commit hooks
- TypeScript strict mode with custom rules

### Debugging & Troubleshooting Guidelines

#### React Native Debugging
- **Metro Bundler Issues**:
  - Clear cache: `npx react-native start --reset-cache`
  - Clean build: `cd android && ./gradlew clean && cd ..`
  - Restart Metro with clean slate
- **Build Failures**:
  - Check Node.js version compatibility
  - Verify Android SDK and build tools versions
  - Clean and rebuild iOS: `cd ios && xcodebuild clean && cd ..`
- **Runtime Errors**:
  - Use Flipper for network and Redux inspection
  - Enable remote debugging for JavaScript issues
  - Check native logs: `adb logcat` (Android) or Xcode console (iOS)

#### Embedded Node.js Backend
- **Server Startup Issues**:
  - Check port availability and permissions
  - Verify SQLite database file permissions
  - Monitor memory usage during startup
- **API Endpoint Failures**:
  - Use backend logging with timestamps
  - Test endpoints independently with Thunder Client
  - Check WebSocket connection status
- **Model Loading Problems**:
  - Verify model file integrity and format
  - Check available memory before loading
  - Implement proper error handling for model failures

#### AI Model Integration
- **Model Loading Failures**:
  - Verify model file exists and is readable
  - Check model format compatibility (GGML, ONNX)
  - Monitor memory usage during model loading
- **Inference Issues**:
  - Implement timeout handling for long inferences
  - Check context window limits and token counting
  - Monitor background thread performance
- **Memory Management**:
  - Use memory profilers to detect leaks
  - Implement model cleanup after use
  - Monitor total memory usage across models

#### Cross-Platform Issues
- **iOS Specific**:
  - Check Info.plist permissions and capabilities
  - Verify code signing and provisioning profiles
  - Test on physical devices for performance issues
- **Android Specific**:
  - Check manifest permissions and API levels
  - Test different Android API versions
  - Verify ProGuard rules for release builds
- **Performance Debugging**:
  - Use React Native Performance monitor
  - Profile AI inference timing
  - Monitor battery usage during AI operations

#### Common Solutions
- **Clean Development Environment**:
  ```bash
  # Complete cleanup
  cd mobile
  rm -rf node_modules
  npm install
  npx react-native start --reset-cache
  ```
- **Model Cache Issues**:
  - Clear model cache directory
  - Re-download corrupted models
  - Verify model checksums
- **Database Issues**:
  - Check SQLite file permissions
  - Implement database migration scripts
  - Use database browser for manual inspection

### Git Workflow & Version Control
- **Commit After Each Change**: Always commit changes after completing any bugfix, feature implementation, or patch
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
- **Commit Pattern**: After creating GitHub issues, commit with format: `[GITHUB] Create issue 123: [Title]`
- **Local Tracking**: Keep local issue files updated with GitHub issue numbers and links for cross-reference

## Naming Conventions
- PascalCase for components and classes
- camelCase for functions and variables
- UPPER_SNAKE_CASE for constants
- kebab-case for file names (except components)
- Descriptive names that indicate purpose
- Prefix interfaces with 'I' and types with 'T'

## Code Quality Requirements
- 80%+ test coverage for critical paths
- ESLint compliance with custom rules
- Prettier formatting enforced
- No console.log in production builds
- Proper JSDoc comments for public APIs
- Regular code reviews and pair programming

### Code Review Guidelines

#### AI Integration Review Checklist
- **Model Usage**:
  - [ ] Proper model loading/unloading patterns
  - [ ] Memory management for model instances
  - [ ] Error handling for model failures
  - [ ] Context window management
  - [ ] Token counting accuracy
- **Prompt Engineering**:
  - [ ] Use of standardized prompt templates
  - [ ] Input validation and sanitization
  - [ ] Context preservation strategies
  - [ ] Response parsing and validation
- **Performance**:
  - [ ] Background processing for AI inference
  - [ ] Proper async/await usage
  - [ ] Memory leak prevention
  - [ ] Inference timeout handling

#### Mobile Development Review
- **React Native Patterns**:
  - [ ] Proper component lifecycle management
  - [ ] FlatList usage for large datasets
  - [ ] Image optimization and caching
  - [ ] Bundle size impact assessment
- **Performance Optimization**:
  - [ ] React.memo usage where appropriate
  - [ ] useMemo/useCallback for expensive operations
  - [ ] Lazy loading implementation
  - [ ] Virtual scrolling for large lists
- **Cross-Platform Compatibility**:
  - [ ] iOS and Android testing completed
  - [ ] Platform-specific code properly isolated
  - [ ] Accessibility labels and hints
  - [ ] Font scaling support

#### Backend & API Review
- **Embedded Node.js**:
  - [ ] Proper SQLite query optimization
  - [ ] WebSocket connection management
  - [ ] File system access patterns
  - [ ] Background processing implementation
- **API Design**:
  - [ ] RESTful endpoint patterns
  - [ ] Proper HTTP status codes
  - [ ] Request/response validation
  - [ ] Rate limiting implementation
- **Security**:
  - [ ] Input validation on all endpoints
  - [ ] Proper authentication/authorization
  - [ ] Data encryption for sensitive information
  - [ ] No hardcoded secrets or API keys

#### Code Quality Standards
- **TypeScript**:
  - [ ] Strict typing enforcement
  - [ ] No `any` types without justification
  - [ ] Proper interface definitions
  - [ ] Generic type usage where appropriate
- **Testing**:
  - [ ] Unit tests for business logic
  - [ ] Integration tests for API endpoints
  - [ ] Component tests for UI elements
  - [ ] Performance tests for AI operations
- **Documentation**:
  - [ ] JSDoc comments for public APIs
  - [ ] README updates for new features
  - [ ] Code comments for complex logic
  - [ ] API documentation updates
