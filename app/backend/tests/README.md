# MyPal Backend Tests

This directory contains comprehensive tests for the MyPal backend server, covering all major features and API endpoints.

## Overview

- **Total Tests**: 120+ tests across 9 test files
- **Test Types**: Unit tests + Integration tests
- **Test Runner**: Node.js native test runner (`node --test`)
- **Pass Rate**: 100%

## Test Files

### Unit Tests

#### `profileManager.test.js` (24 tests)
Tests the ProfileManager class in isolation without requiring a server instance.

**Coverage:**
- Profile creation with validation
- Profile loading and switching
- Profile deletion with cleanup
- 3-profile limit enforcement
- Name validation (length, duplicates, whitespace trimming)
- Profile data persistence (save/load)
- Index management
- Current profile tracking

**Run:** `node --test tests/profileManager.test.js`

### Integration Tests

Each integration test file spawns an isolated Express server instance on a unique port with temporary data directories.

#### `profiles.test.js` (10 tests)
Tests profile management API endpoints.

**Endpoints Tested:**
- `GET /api/profiles` - List all profiles
- `POST /api/profiles` - Create new profile
- `POST /api/profiles/:id/load` - Load a profile
- `DELETE /api/profiles/:id` - Delete a profile

**Coverage:**
- Profile listing (initially empty)
- Profile creation with metadata
- Name validation (empty, too long, duplicates)
- 3-profile limit enforcement
- Profile loading with state updates
- Profile deletion with verification

**Run:** `node --test tests/profiles.test.js`

#### `auth.test.js` (11 tests)
Tests user authentication and session management.

**Endpoints Tested:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

**Coverage:**
- User registration with validation
- Password requirements (minimum length)
- Username requirements (non-empty, unique)
- Login with valid/invalid credentials
- Logout functionality
- Token generation and management
- Session tracking
- Concurrent login support

**Run:** `node --test tests/auth.test.js`

#### `stats.test.js` (8 tests)
Tests stats, progression, and settings systems.

**Endpoints Tested:**
- `GET /api/stats` - Get current stats
- `POST /api/settings` - Update settings

**Coverage:**
- Initial stats retrieval
- XP gain from chat interactions
- Level progression
- Vocabulary size tracking
- Personality traits (curious, logical, social, agreeable, cautious)
- Settings updates (XP multiplier, API provider)
- Memory count tracking
- CP (Cognitive Points) calculation

**Run:** `node --test tests/stats.test.js`

#### `memories.test.js` (11 tests)
Tests memory, journal, and chat log systems.

**Endpoints Tested:**
- `GET /api/memories` - List memories
- `GET /api/journal` - List journal entries
- `GET /api/chatlog` - List chat history
- `POST /api/chat` - Send chat message (creates memories)

**Coverage:**
- Memory creation from conversations
- Memory structure validation (ID, timestamp, texts, summary, sentiment)
- Pagination support
- Keyword extraction
- Sentiment analysis (positive, neutral, negative)
- XP tracking per memory
- Importance scoring (low, medium, high)
- Journal thought entries with types (reflection, learning, question, emotion, goal)
- Chat log recording

**Run:** `node --test tests/memories.test.js`

#### `neural.test.js` (9 tests)
Tests neural network simulation and brain statistics.

**Endpoints Tested:**
- `GET /api/neural-network` - Get network structure
- `GET /api/neural` - Get graph data
- `POST /api/neural/regenerate` - Regenerate network
- `GET /api/brain` - Get brain statistics

**Coverage:**
- Neural network structure (neurons, connections)
- Initial neuron initialization
- Node and link structure
- Neuron regions and activation levels
- Network regeneration
- Connection strength tracking
- Neural activation during chat
- Vocabulary tracking
- Concept learning
- Fact storage

**Run:** `node --test tests/neural.test.js`

#### `ai.test.js` (10 tests)
Exercises AI configuration and developmental behaviour.

**Endpoints Tested:**
- `GET /api/ai/models` - List available models
- `POST /api/ai/configure` - Configure AI provider
- `POST /api/reset` - Reset all data
- `POST /api/report` - Generate report

**Coverage:**
- Provider selection and validation (local, ollama, openai, etc.)
- Rejecting invalid provider payloads
- Developmental stage transitions driven by sequential chats
- Vocabulary learning from chat input
- Reporting export structure and metadata integrity

**Run:** `node --test tests/ai.test.js`

#### `chat.test.js` (2 tests)
Validates basic health checks and sequential chat flows.

**Coverage:**
- Backend health guard responding with `{ ok: true }`
- Sequential chat requests using the shared message plan helper
- XP, level, memory growth, and reply structure across the chat sequence
- Follow-up verification of memories and journal endpoints

**Highlights:**
- Reads `MYPAL_TEST_MESSAGES` (or prompts interactively) to decide how many chats to send
- Logs a per-message summary including reply kind and XP delta for easier debugging

**Run:** `node --test tests/chat.test.js`

### Configurable Chat Message Counts

- **Environment variable**: set `MYPAL_TEST_MESSAGES` to a number (e.g. `5`) or JSON array of strings to customise the chat messages used during integration tests that send chats.
- **Interactive prompt**: when running tests in an interactive terminal without the env var, you will be prompted for the desired number of messages. Press Enter to accept the default (2).
- `tests/helpers/message-plan.js` resolves the plan once per run and caches it for `chat.test.js`, `ai.test.js`, and `data-persistence.test.js`.
- The shared helper keeps sequential behaviour consistent across suites and prints helpful logging so you can reproduce failures.

#### `data-persistence.test.js` (1 test)
Verifies that all profile-scoped data files are written to disk and remain readable through their respective APIs.

**Highlights:**
- Creates a dedicated profile within a temporary data directory.
- Sends configurable chat messages (via the shared message-plan helper) to drive persistence.
- Reads each JSON file (`metadata`, `chat-log`, `memories`, `journal`, `concepts`, `facts`, `neural`, `vocabulary`, `settings`) directly from disk and validates structure.
- Confirms API endpoints (`/stats`, `/memories`, `/journal`, `/neural-network`) reflect the persisted content.

**Run:** `node --test tests/data-persistence.test.js`


## Writing New Tests

### Unit Test Template
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import MyClass from '../src/MyClass.js';

describe('MyClass', () => {
  test('should do something', () => {
    const instance = new MyClass();
    const result = instance.method();
    assert.equal(result, expectedValue);
  });
});
```

### Integration Test Template
```javascript
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'path';

const PORT = 31345; // Choose unique port
const API = `http://localhost:${PORT}/api`;

let serverProcess;
let tempRoot;

before(async () => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  // ... setup server
  await waitForHealth();
});

after(async () => {
  // ... cleanup
});

test('should do something', async () => {
  const res = await fetch(`${API}/endpoint`);
  assert.equal(res.ok, true);
  const body = await res.json();
  assert.ok(body.someProperty);
});
```

## Best Practices

1. **Test Naming**: Use descriptive names that explain what is being tested
2. **Assertions**: Use strict assertions with helpful error messages
3. **Isolation**: Keep tests independent and isolated
4. **Cleanup**: Always clean up resources in `after()` hooks
5. **Timeouts**: Set appropriate timeouts for server operations
6. **Ports**: Use unique ports for each test file to allow parallel execution
7. **Data**: Use temporary directories for all test data
8. **Validation**: Test both success and failure cases

## Troubleshooting

### Tests Timeout
- Check that port isn't already in use
- Increase timeout value in test file
- Ensure server starts successfully
- Check server logs in temporary directory

### Server Fails to Start
- Verify all backend dependencies are installed: `npm install`
- Check for syntax errors in server code
- Ensure AI modules are properly exported (ES modules)

### Tests Fail
- Check test expectations match current behavior
- Verify API endpoints haven't changed
- Ensure database schema matches expectations
- Check for test data conflicts

### Port Already in Use
- Each test file uses a unique port
- Kill any hanging processes: `pkill -f "node.*server.js"`
- Check for port conflicts: `lsof -i :PORT_NUMBER`

## CI/CD Integration

Tests are designed for CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Install Dependencies
  run: |
    cd app/backend
    npm install

- name: Run Tests
  run: |
    cd app/backend
    npm test
```

## Test Coverage

Current coverage areas:
- ✅ Profile management (CRUD)
- ✅ Authentication & sessions
- ✅ Stats & progression
- ✅ Memory system
- ✅ Journal & chat logs
- ✅ Neural network
- ✅ AI configuration
- ✅ Data export/import
- ✅ Telemetry & feedback
- ✅ Settings management

## Contributing

When adding new tests:
1. Follow existing patterns and structure
2. Use unique port numbers for integration tests
3. Include both success and failure test cases
4. Add comprehensive coverage for new features
5. Update this README with new test descriptions
6. Ensure all tests pass before committing

## Additional Resources

- Main testing guide: `/TESTING.md`
- Test implementation summary: `/TEST_IMPLEMENTATION_SUMMARY.md`
- Backend source: `/app/backend/src/`
- Package configuration: `/app/backend/package.json`
