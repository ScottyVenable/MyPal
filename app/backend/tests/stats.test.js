import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 31339;
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
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mypal-stats-test-'));
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

describe('Stats & Progress System', () => {
  test('should get initial stats', async () => {
    const res = await fetch(`${API}/stats`);
    assert.equal(res.ok, true, 'stats endpoint should respond OK');
    const body = await res.json();
    assert.equal(typeof body.level, 'number', 'should have level');
    assert.equal(typeof body.xp, 'number', 'should have xp');
    assert.equal(typeof body.cp, 'number', 'should have cp');
    assert.ok(body.personality, 'should have personality traits');
    assert.ok(body.settings, 'should have settings');
  });

  test('should gain XP and level up from chat', async () => {
    const statsBefore = await fetch(`${API}/stats`).then(r => r.json());
    
    // Send a chat message
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello friend!' }),
    });

    const statsAfter = await fetch(`${API}/stats`).then(r => r.json());
    assert.ok(statsAfter.xp > statsBefore.xp, 'XP should increase');
    assert.ok(statsAfter.cp >= statsBefore.cp, 'CP should not decrease');
    assert.ok(statsAfter.level >= statsBefore.level, 'level should stay same or increase');
  });

  test('should track vocabulary size', async () => {
    // Send multiple messages to build vocabulary
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'apple banana orange' }),
    });

    const stats = await fetch(`${API}/stats`).then(r => r.json());
    assert.ok(Array.isArray(stats.vocabulary), 'should have vocabulary array');
  });

  test('should have personality traits', async () => {
    const stats = await fetch(`${API}/stats`).then(r => r.json());
    assert.ok(stats.personality, 'should have personality object');
    assert.equal(typeof stats.personality.curious, 'number', 'should have curious trait');
    assert.equal(typeof stats.personality.logical, 'number', 'should have logical trait');
    assert.equal(typeof stats.personality.social, 'number', 'should have social trait');
    assert.equal(typeof stats.personality.agreeable, 'number', 'should have agreeable trait');
    assert.equal(typeof stats.personality.cautious, 'number', 'should have cautious trait');
  });

  test('should update settings', async () => {
    const res = await fetch(`${API}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        xpMultiplier: 2,
        apiProvider: 'local',
      }),
    });
    assert.equal(res.ok, true, 'settings update should succeed');
    const body = await res.json();
    assert.equal(body.success, true);

    // Verify settings were saved
    const stats = await fetch(`${API}/stats`).then(r => r.json());
    assert.equal(stats.settings.xpMultiplier, 2, 'multiplier should be updated');
    assert.equal(stats.settings.apiProvider, 'local', 'provider should be updated');
  });

  test('should track memory count in stats', async () => {
    // Send chat to create a memory
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'I love programming' }),
    });

    const stats = await fetch(`${API}/stats`).then(r => r.json());
    assert.equal(typeof stats.memoryCount, 'number', 'should have memory count');
    assert.ok(stats.memoryCount > 0, 'should have at least one memory');
  });

  test('should handle XP multiplier in calculations', async () => {
    // Set multiplier to 5
    await fetch(`${API}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xpMultiplier: 5 }),
    });

    const statsBefore = await fetch(`${API}/stats`).then(r => r.json());
    
    // Send chat
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test multiplier' }),
    });

    const statsAfter = await fetch(`${API}/stats`).then(r => r.json());
    const xpGain = statsAfter.xp - statsBefore.xp;
    
    // With 5x multiplier, gain should be significant
    assert.ok(xpGain > 10, 'XP gain should be multiplied');
  });
});
