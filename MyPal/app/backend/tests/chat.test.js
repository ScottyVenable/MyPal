import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 31337;
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
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mypal-test-'));
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

test('health endpoint responds with ok', async () => {
  const res = await fetch(`${API}/health`);
  assert.equal(res.ok, true, 'health endpoint should respond OK');
  const body = await res.json();
  assert.equal(body.ok, true, 'health payload should contain ok flag');
});

test('chat endpoint returns constrained reply and updates stats', async () => {
  const statsBefore = await fetch(`${API}/stats`).then((r) => r.json());
  const res = await fetch(`${API}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello there' }),
  });
  assert.equal(res.ok, true, 'chat endpoint should respond OK');
  const body = await res.json();
  assert.ok(typeof body.reply === 'string', 'chat response should include reply');
  assert.notEqual(body.reply.trim().length, 0, 'reply should not be empty');
  assert.ok(['primitive_phrase', 'single_word', 'free'].includes(body.kind), 'chat response should include utterance kind');
  assert.ok(typeof body.memoryCount === 'number', 'chat response should include memory count');

  const statsAfter = await fetch(`${API}/stats`).then((r) => r.json());
  assert.equal(statsAfter.level >= statsBefore.level, true, 'level should stay same or increase');
  assert.equal(statsAfter.xp > statsBefore.xp, true, 'XP should increase after chat');
  assert.equal(typeof statsAfter.memoryCount, 'number', 'stats should include memory count');

  const memRes = await fetch(`${API}/memories?limit=5`);
  assert.equal(memRes.ok, true, 'memories endpoint should respond OK');
  const memBody = await memRes.json();
  assert.ok(Array.isArray(memBody.memories), 'memories payload should include list');
  assert.equal(memBody.memories.length > 0, true, 'memories list should contain at least one entry');
});