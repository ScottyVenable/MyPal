import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 31340;
const API = `http://localhost:${PORT}/api`;

let serverProcess;
let tempRoot;
let unexpectedExit;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

async function waitForHealth(timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${API}/health`);
      if (res.ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Backend health check timed out');
}

before(async () => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mypal-memory-test-'));
  const dataDir = path.join(tempRoot, 'data');
  const logsDir = path.join(tempRoot, 'logs');
  const modelsDir = path.join(tempRoot, 'models');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });
  fs.mkdirSync(modelsDir, { recursive: true });

  serverProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: backendDir,
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR: dataDir,
      LOGS_DIR: logsDir,
      MODELS_DIR: modelsDir,
    },
    stdio: 'inherit',
  });

  unexpectedExit = (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    throw new Error(`Backend exited early during tests (${reason})`);
  };
  serverProcess.once('exit', unexpectedExit);

  await waitForHealth();
});

after(async () => {
  if (serverProcess) {
    if (unexpectedExit) {
      serverProcess.off('exit', unexpectedExit);
    }
    if (!serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => {
        serverProcess.once('exit', () => resolve());
        setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill('SIGKILL');
          }
        }, 2000);
      });
    }
  }
  if (tempRoot && fs.existsSync(tempRoot)) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

describe('Memories System', () => {
  test('should start with no memories', async () => {
    const res = await fetch(`${API}/memories?limit=10`);
    assert.equal(res.ok, true, 'memories endpoint should respond OK');
    const body = await res.json();
    assert.ok(Array.isArray(body.memories), 'should return memories array');
    assert.equal(body.memories.length, 0, 'should start empty');
    assert.equal(body.total, 0, 'total should be 0');
  });

  test('should create memory from chat interaction', async () => {
    // Send a chat message
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'I love learning new things' }),
    });

    const res = await fetch(`${API}/memories?limit=10`);
    const body = await res.json();
    assert.ok(body.memories.length > 0, 'should have at least one memory');
    
    const memory = body.memories[0];
    assert.ok(memory.id, 'memory should have ID');
    assert.ok(memory.ts, 'memory should have timestamp');
    assert.ok(memory.userText, 'memory should have user text');
    assert.ok(memory.palText, 'memory should have pal response');
    assert.ok(memory.summary, 'memory should have summary');
    assert.ok(['positive', 'neutral', 'negative'].includes(memory.sentiment), 'memory should have valid sentiment');
  });

  test('should limit memories with pagination', async () => {
    // Create multiple memories
    for (let i = 0; i < 5; i++) {
      await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Message number ${i}` }),
      });
    }

    const res = await fetch(`${API}/memories?limit=3`);
    const body = await res.json();
    assert.equal(body.memories.length, 3, 'should limit to 3 memories');
    assert.ok(body.total >= 5, 'total should be at least 5');
  });

  test('should track keywords in memories', async () => {
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'I am happy and excited today' }),
    });

    const res = await fetch(`${API}/memories?limit=1`);
    const body = await res.json();
    const memory = body.memories[0];
    assert.ok(Array.isArray(memory.keywords), 'memory should have keywords');
  });

  test('should track XP gained in each memory', async () => {
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Tell me about yourself' }),
    });

    const res = await fetch(`${API}/memories?limit=1`);
    const body = await res.json();
    const memory = body.memories[0];
    assert.ok(memory.xp, 'memory should have xp object');
    assert.equal(typeof memory.xp.gained, 'number', 'should have xp gained');
    assert.equal(typeof memory.xp.total, 'number', 'should have total xp');
    assert.equal(typeof memory.xp.level, 'number', 'should have level at time');
  });

  test('should track importance in memories', async () => {
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'My name is Alice' }),
    });

    const res = await fetch(`${API}/memories?limit=1`);
    const body = await res.json();
    const memory = body.memories[0];
    assert.ok(memory.importance, 'memory should have importance object');
    assert.equal(typeof memory.importance.score, 'number', 'should have importance score');
    assert.ok(['low', 'medium', 'high'].includes(memory.importance.level), 'should have valid importance level');
    assert.equal(typeof memory.importance.shouldRemember, 'boolean', 'should have remember flag');
  });
});

describe('Journal System', () => {
  test('should get journal entries', async () => {
    const res = await fetch(`${API}/journal?limit=10`);
    assert.equal(res.ok, true, 'journal endpoint should respond OK');
    const body = await res.json();
    assert.ok(Array.isArray(body.thoughts), 'should return thoughts array');
    assert.equal(typeof body.total, 'number', 'should have total count');
  });

  test('should create journal entry from chat', async () => {
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What do you think about friendship?' }),
    });

    const res = await fetch(`${API}/journal?limit=10`);
    const body = await res.json();
    assert.ok(body.thoughts.length > 0, 'should have journal entries');
    
    const entry = body.thoughts[0];
    assert.ok(entry.id, 'entry should have ID');
    assert.ok(entry.ts, 'entry should have timestamp');
    assert.ok(entry.text, 'entry should have text');
    assert.ok(entry.trigger, 'entry should have trigger');
    assert.ok(['reflection', 'learning', 'question', 'emotion', 'goal'].includes(entry.type), 'should have valid type');
  });

  test('should limit journal entries', async () => {
    const res = await fetch(`${API}/journal?limit=2`);
    const body = await res.json();
    assert.ok(body.thoughts.length <= 2, 'should respect limit parameter');
  });
});

describe('Chat Log System', () => {
  test('should retrieve chat log', async () => {
    const res = await fetch(`${API}/chatlog?limit=10`);
    assert.equal(res.ok, true, 'chatlog endpoint should respond OK');
    const body = await res.json();
    assert.ok(Array.isArray(body.log), 'should return log array');
  });

  test('should record chat exchanges in log', async () => {
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Test chat log entry' }),
    });

    const res = await fetch(`${API}/chatlog?limit=10`);
    const body = await res.json();
    assert.ok(body.log.length > 0, 'log should have entries');
    
    const entry = body.log[0];
    assert.ok(entry.ts, 'entry should have timestamp');
    assert.ok(entry.user, 'entry should have user message');
    assert.ok(entry.pal, 'entry should have pal response');
  });
});
