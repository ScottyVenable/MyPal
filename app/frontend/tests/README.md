# MyPal Frontend Tests

This directory contains comprehensive tests for the MyPal frontend application, focusing on pure JavaScript logic, state management, and utility functions.

## Overview

- **Total Tests**: 118 tests across 4 test files
- **Test Type**: Unit tests (no DOM/browser required)
- **Test Runner**: Node.js native test runner (`node --test`)
- **Pass Rate**: 100%
- **Execution Time**: <1 second for all tests

## Test Files

### `utils.test.js` (28 tests)
Tests utility functions, logging system, and data validation.

**Test Suites:**

1. **Logging System Utilities** (3 tests)
   - Log timestamp formatting
   - Log level validation (DEBUG, INFO, WARN, ERROR)
   - Log category validation (CHAT, TYPING, UI, API, WEBSOCKET, PROFILE, NEURAL, PERFORMANCE, STATE, ERROR)

2. **API Configuration** (2 tests)
   - API base URL definition
   - API endpoint validation

3. **Data Structure Validation** (4 tests)
   - Message structure (timestamp, user text, pal response)
   - Memory structure (ID, texts, sentiment, keywords, XP, importance, tags)
   - Profile structure (ID, name, timestamps, level, XP)
   - Stats structure (level, XP, CP, personality, settings)

4. **Utility Functions** (4 tests)
   - Timestamp generation
   - ID generation patterns
   - Array operations (slicing, limiting)
   - Object merging

5. **State Management** (3 tests)
   - Backend health tracking
   - Current profile tracking
   - Memory count tracking

6. **WebSocket State** (1 test)
   - Connection state validation

7. **Error Handling** (2 tests)
   - Fetch error handling
   - JSON parsing errors

8. **Data Formatting** (3 tests)
   - Number formatting (decimal places)
   - Date formatting (ISO strings)
   - String truncation

9. **Validation Helpers** (3 tests)
   - Email format validation
   - Non-empty string validation
   - Number range validation

**Run:** `node --test tests/utils.test.js`

### `perf.test.js` (19 tests)
Tests the PerfMonitor class for performance instrumentation.

**Test Suites:**

1. **Performance Monitor** (15 tests)
   - Initialization (disabled by default)
   - Enable/disable via localStorage flag
   - Mark creation and tracking
   - Duration measurement between marks
   - Measure from mark to now
   - Missing mark handling
   - Clear functionality
   - Report generation
   - Multiple marks and measures
   - Mark overwrite behavior

2. **Performance Metrics** (3 tests)
   - Duration calculation
   - Zero duration handling
   - Performance threshold classification (fast, normal, slow, very_slow)

**Features:**
- Mocks localStorage for testing
- Mocks performance API
- Tests PerfMonitor class in isolation
- Validates marking, measuring, and reporting

**Run:** `node --test tests/perf.test.js`

### `api-client.test.js` (30 tests)
Tests API client patterns and HTTP request handling.

**Test Suites:**

1. **API Client Patterns** (7 tests)
   - API URL construction
   - Query string building
   - URL encoding
   - POST request body construction
   - GET request options
   - POST request options
   - Authentication headers

2. **Response Handling** (7 tests)
   - Successful response structure
   - Error response structure
   - JSON response parsing
   - Chat response validation
   - Stats response validation
   - Profile list response validation

3. **Error Handling Patterns** (4 tests)
   - Network error detection
   - Timeout error detection
   - HTTP error code handling
   - Error message construction

4. **Request Retry Logic** (3 tests)
   - Exponential backoff calculation
   - Retry attempt tracking
   - Retryable condition validation (408, 429, 5xx)

5. **Request Caching** (2 tests)
   - Cache key generation
   - Cache expiry validation

6. **Request Throttling** (2 tests)
   - Request timing tracking
   - Rate limit validation

**Coverage:**
- API endpoint construction
- Request/response patterns
- Error handling strategies
- Retry logic with backoff
- Caching mechanisms
- Rate limiting

**Run:** `node --test tests/api-client.test.js`

### `state.test.js` (41 tests)
Tests state management patterns used throughout the frontend.

**Test Suites:**

1. **Chat State Management** (4 tests)
   - Typing indicator tracking
   - Last user message tracking
   - Chat message queue management
   - Chat history size limiting

2. **Profile State Management** (4 tests)
   - Current profile ID tracking
   - Profile list management
   - Profile switching
   - Profile validation before loading

3. **Stats State Management** (3 tests)
   - Stats data tracking
   - Level progress calculation
   - Personality trait tracking (5 traits)

4. **Memory State Management** (3 tests)
   - Memory count tracking
   - Memory list management
   - Memory sorting by timestamp

5. **Journal State Management** (2 tests)
   - Journal entry tracking
   - Journal filtering by type

6. **Neural Network State** (3 tests)
   - Neural graph data structure
   - Node structure validation
   - Link structure validation

7. **UI Loading States** (3 tests)
   - Single loading state tracking
   - Multiple loading states (by component)
   - Any loading check

8. **Error State Management** (3 tests)
   - Single error message tracking
   - Error tracking by component
   - Clear all errors

9. **Tab State Management** (2 tests)
   - Active tab tracking
   - Tab name validation

10. **Settings State Management** (3 tests)
    - Settings tracking (xpMultiplier, apiProvider, theme)
    - Individual setting updates
    - Settings value validation

11. **WebSocket State Management** (2 tests)
    - Connection status tracking
    - Reconnection attempt tracking

**Coverage:**
- All major UI state domains
- State transitions
- State validation
- State operations (add, remove, update, clear)

**Run:** `node --test tests/state.test.js`

## Running Tests

### Run All Tests
```bash
cd app/frontend
node --test tests/*.test.js
```

### Run Specific Test File
```bash
cd app/frontend
node --test tests/utils.test.js
node --test tests/perf.test.js
node --test tests/api-client.test.js
node --test tests/state.test.js
```

### Run Multiple Test Files
```bash
cd app/frontend
node --test tests/utils.test.js tests/perf.test.js
```

### Watch Mode (Node.js 18+)
```bash
cd app/frontend
node --test --watch tests/*.test.js
```

## Test Architecture

### Pure JavaScript Testing
These tests validate logic without requiring a browser or DOM:

- **No Browser Required**: Tests run in Node.js environment
- **Mocked APIs**: Browser APIs (localStorage, performance) are mocked
- **Pure Logic**: Tests focus on data structures and algorithms
- **Fast Execution**: All tests complete in <1 second
- **Isolated**: No dependencies between test files

### Mock Implementations

#### localStorage Mock
```javascript
global.localStorage = {
  storage: {},
  getItem(key) { return this.storage[key] || null; },
  setItem(key, value) { this.storage[key] = String(value); },
  removeItem(key) { delete this.storage[key]; }
};
```

#### performance API Mock
```javascript
global.performance = {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {}
};
```

### Test Structure
Each test file follows this pattern:

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Feature Name', () => {
  test('should do something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = processInput(input);
    
    // Assert
    assert.equal(result, expectedValue);
  });
});
```

## Writing New Tests

### Basic Test Template
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('My Feature', () => {
  test('should validate input', () => {
    const isValid = validateInput('test');
    assert.ok(isValid);
  });

  test('should handle empty input', () => {
    const isValid = validateInput('');
    assert.ok(!isValid);
  });
});
```

### Testing with Mocks
```javascript
// Mock setup
global.localStorage = { /* mock implementation */ };

describe('Storage Feature', () => {
  test('should save to localStorage', () => {
    localStorage.setItem('key', 'value');
    const retrieved = localStorage.getItem('key');
    assert.equal(retrieved, 'value');
  });
});
```

### Testing State Transitions
```javascript
describe('State Management', () => {
  test('should transition states correctly', () => {
    let state = 'initial';
    
    // Transition
    state = 'loading';
    assert.equal(state, 'loading');
    
    // Transition again
    state = 'complete';
    assert.equal(state, 'complete');
  });
});
```

## Best Practices

1. **Descriptive Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Follow AAA pattern for test structure
3. **Single Assertion Focus**: Each test should validate one behavior
4. **Mock Browser APIs**: Provide mocks for any browser-specific APIs
5. **Test Edge Cases**: Include tests for empty, null, and boundary values
6. **Keep Tests Simple**: Tests should be easy to read and understand
7. **No Side Effects**: Tests should not modify global state
8. **Fast Execution**: Keep tests lightweight and fast

## What to Test

### ✅ Do Test
- Pure functions and logic
- Data structure validation
- State management patterns
- Utility functions
- API client patterns
- Error handling logic
- Validation rules
- Calculations and algorithms

### ❌ Don't Test
- DOM manipulation (requires E2E tests)
- Browser-specific behavior
- External API calls (use mocks)
- Third-party library internals
- CSS styling
- Visual appearance

## Test Coverage

Current coverage areas:
- ✅ Logging system (levels, categories, formatting)
- ✅ API configuration and endpoints
- ✅ Data structure validation
- ✅ Performance monitoring
- ✅ State management (10+ domains)
- ✅ Error handling patterns
- ✅ Request/response handling
- ✅ Retry logic and backoff
- ✅ Caching strategies
- ✅ Rate limiting
- ✅ Validation helpers

## Troubleshooting

### Tests Fail to Run
```bash
# Check Node.js version (16+ required)
node --version

# Ensure you're in the correct directory
cd app/frontend
pwd

# Verify test files exist
ls tests/
```

### Import Errors
```bash
# Tests use ES modules syntax
# Ensure Node.js 16+ is installed
# Check that test files have .js extension
```

### Mock Issues
```bash
# Ensure mocks are defined before tests run
# Check that global objects are properly set up
# Verify mock implementations match expected API
```

## CI/CD Integration

Frontend tests integrate easily into CI/CD:

```yaml
# Example GitHub Actions
- name: Frontend Tests
  run: |
    cd app/frontend
    node --test tests/*.test.js

# Example with Node version matrix
- name: Test on Node.js ${{ matrix.node }}
  strategy:
    matrix:
      node: [16, 18, 20]
  run: |
    cd app/frontend
    node --test tests/*.test.js
```

## Performance

Frontend tests are designed for speed:
- **Total execution time**: <1 second
- **No network calls**: All tests are local
- **No browser startup**: Pure Node.js execution
- **Parallel execution**: Tests can run in parallel
- **Minimal dependencies**: Only Node.js built-ins

## Future Enhancements

Potential additions:
- Code coverage reporting (c8)
- Mutation testing
- Property-based testing
- Snapshot testing for complex objects
- Integration with E2E tests (Playwright)

## Contributing

When adding new tests:
1. Follow existing structure and naming conventions
2. Use descriptive test names
3. Include both success and failure cases
4. Add edge case tests
5. Keep tests isolated and independent
6. Update this README with new test descriptions
7. Ensure all tests pass before committing

## Related Files

- **Source code**: `/app/frontend/app.js` (4475 lines)
- **HTML**: `/app/frontend/index.html`
- **Styles**: `/app/frontend/styles.css`
- **Services**: `/app/frontend/services/perf.js`
- **Main testing guide**: `/TESTING.md`
- **Implementation summary**: `/TEST_IMPLEMENTATION_SUMMARY.md`

## Additional Resources

- Node.js test runner documentation: https://nodejs.org/api/test.html
- Main testing guide: `/TESTING.md`
- Backend tests: `/app/backend/tests/README.md`
- Test implementation summary: `/TEST_IMPLEMENTATION_SUMMARY.md`
