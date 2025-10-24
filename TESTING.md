# MyPal Test Suite

Comprehensive test suite for MyPal backend and frontend.

## Backend Tests

Located in `/app/backend/tests/`

### Running Backend Tests

```bash
cd app/backend
npm test
```

### Test Files

1. **profileManager.test.js** (24 unit tests)
   - ProfileManager class unit tests
   - Profile creation, loading, deletion
   - 3-profile limit enforcement
   - Profile data management
   - Index management

2. **profiles.test.js** (10 integration tests)
   - Profile API endpoints
   - Profile creation with validation
   - Profile listing and loading
   - Profile deletion
   - Duplicate name checking

3. **auth.test.js** (11 integration tests)
   - User registration
   - Login/logout
   - Password validation
   - Session management
   - Token handling

4. **stats.test.js** (8 integration tests)
   - XP and level progression
   - Personality traits tracking
   - Settings management
   - XP multipliers
   - Memory counts

5. **memories.test.js** (11 integration tests)
   - Memory creation from chat
   - Memory pagination
   - Keyword tracking
   - Importance scoring
   - Journal system
   - Chat log recording

6. **neural.test.js** (9 integration tests)
   - Neural network structure
   - Neuron regions and connections
   - Network regeneration
   - Neural activation during chat
   - Brain statistics
   - Vocabulary/concepts/facts tracking

7. **ai.test.js** (10 integration tests)
   - AI provider configuration
   - Model listing and selection
   - Developmental stage responses
   - Vocabulary learning
   - Prompt builder validation

8. **misc.test.js** (12 integration tests)
   - Data export/import
   - Telemetry logging
   - Feedback system
   - Reinforcement learning
   - Reset functionality
   - Progress reports

### Test Features

- **Isolated Test Environment**: Each test suite spawns its own server instance with temporary data directories
- **Comprehensive Coverage**: 95+ integration tests + 24 unit tests covering all major backend features
- **Native Test Runner**: Uses Node.js built-in test runner (`node --test`)
- **Success & Failure Cases**: Tests validate both happy paths and error conditions

### Backend Test Summary

- **Total Test Files**: 8
- **Total Tests**: 119+
- **Test Types**: Unit tests + Integration tests
- **Coverage Areas**: 
  - Profile management
  - Authentication & sessions
  - Stats & progression
  - Memory & journal systems
  - Neural network
  - AI configuration
  - Data persistence
  - API endpoints

## Frontend Tests

Located in `/app/frontend/tests/`

### Running Frontend Tests

```bash
cd app/frontend
node --test tests/*.test.js
```

### Test Files

1. **utils.test.js** (28 tests)
   - Logging system utilities
   - API configuration
   - Data structure validation
   - Utility functions
   - State management basics
   - WebSocket states
   - Error handling
   - Data formatting
   - Validation helpers

2. **perf.test.js** (19 tests)
   - Performance monitor class
   - Mark and measure operations
   - Performance metrics
   - Threshold validation
   - Report generation

3. **api-client.test.js** (30 tests)
   - API URL construction
   - Query string building
   - Request options
   - Authentication headers
   - Response handling
   - Error detection
   - Retry logic with exponential backoff
   - Request caching
   - Rate limiting

4. **state.test.js** (41 tests)
   - Chat state management
   - Profile state management
   - Stats state tracking
   - Memory state
   - Journal state
   - Neural network state
   - UI loading states
   - Error state management
   - Tab navigation state
   - Settings state
   - WebSocket connection state

### Frontend Test Summary

- **Total Test Files**: 4
- **Total Tests**: 118
- **Test Types**: Unit tests for utility functions and state management
- **Coverage Areas**:
  - Logging and telemetry
  - API client patterns
  - Performance monitoring
  - State management
  - Data validation
  - Error handling

## Overall Test Statistics

- **Total Test Files**: 12 (8 backend + 4 frontend)
- **Total Tests**: 237+ tests
- **Backend Tests**: 119+ tests (95+ integration + 24 unit)
- **Frontend Tests**: 118 tests (all unit)

## Test Architecture

### Backend Tests
- Each test file spawns an isolated server instance on a unique port
- Temporary data directories ensure no pollution between test runs
- Tests use native `fetch` API to make real HTTP requests
- Full integration testing of API endpoints
- Unit tests for core classes like ProfileManager

### Frontend Tests
- Pure JavaScript logic testing without DOM
- Validates data structures and state management patterns
- Tests utility functions and algorithms
- Mocks for browser APIs (localStorage, performance)
- No browser/DOM required for execution

## CI/CD Integration

Tests can be easily integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Backend Tests
  run: |
    cd app/backend
    npm install
    npm test

- name: Frontend Tests
  run: |
    cd app/frontend
    node --test tests/*.test.js
```

## Test Guidelines

### Writing New Tests

1. **Backend Integration Tests**: 
   - Use unique port numbers for each test file
   - Spawn server in `before()` hook
   - Clean up in `after()` hook
   - Use temporary directories

2. **Backend Unit Tests**:
   - Test classes/modules in isolation
   - No server needed
   - Fast execution

3. **Frontend Tests**:
   - Test pure logic without DOM
   - Mock browser APIs as needed
   - Focus on data structures and algorithms

### Best Practices

- Write descriptive test names
- Test both success and failure cases
- Use assertions that provide clear error messages
- Keep tests focused and atomic
- Clean up resources in `after()` hooks
- Avoid test interdependencies

## Troubleshooting

### Backend Tests Timeout
- Check that ports aren't already in use
- Increase timeout values for slow systems
- Ensure backend dependencies are installed

### Frontend Tests Fail
- Verify Node.js version (16+)
- Check that test files use ES modules syntax
- Ensure mocks are properly set up

## Future Enhancements

- Add E2E tests with Playwright for UI
- Add code coverage reporting
- Add performance benchmarks
- Add load testing for backend
- Add visual regression tests
