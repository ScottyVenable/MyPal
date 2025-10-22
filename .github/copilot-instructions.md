# MyPal Mobile App - Copilot Instructions

This is a React Native mobile application for the MyPal AI companion that runs an embedded Node.js backend server locally on the device, providing offline-first AI interactions with local model support.

## Project Architecture

### Directory Structure
- `/mobile` - React Native mobile app (TypeScript)
    - `/src` - Main application source code
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
- `/app/backend` - Original backend code (reference only)

### Core Technologies Stack
- **Frontend**: React Native 0.72+ with TypeScript 5+
- **Navigation**: React Navigation 6+ (Stack, Tab, Drawer navigators)
- **UI Framework**: React Native Paper 5+ with Material Design 3
- **Backend**: nodejs-mobile-react-native for embedded Node.js
- **Database**: SQLite via react-native-sqlite-storage
- **Storage**: AsyncStorage for app preferences, SecureStore for sensitive data
- **State Management**: Redux Toolkit with RTK Query for API state
- **WebSocket**: ws library for real-time communication
- **AI Models**: Local LLM integration (Ollama, GGML formats)

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
