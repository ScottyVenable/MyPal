import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveMessagePlan, getCachedMessageCount } from './helpers/message-plan.js';

const PORT = 31337;
const API = `http://localhost:${PORT}/api`;

let serverProcess;
let tempRoot;
let unexpectedExit;
let chatMessagePlan = [];

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
  chatMessagePlan = await resolveMessagePlan({ label: 'backend chat', defaultCount: 2 });
  console.info(`\n[chat.test] Using ${chatMessagePlan.length} chat message(s) for sequential flow`);
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

test('chat endpoint handles sequential messages and updates stats', async () => {
  assert.ok(chatMessagePlan.length > 0, 'message plan should be resolved in setup');

  const initialStats = await fetch(`${API}/stats`).then((r) => r.json());
  let previousStats = structuredClone(initialStats);
  const messageSummaries = [];

  for (let index = 0; index < chatMessagePlan.length; index += 1) {
    const message = chatMessagePlan[index];
    const res = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    assert.equal(res.ok, true, `chat request ${index + 1} should respond OK`);

    const body = await res.json();
    assert.ok(typeof body.reply === 'string', 'chat response should include reply');
    assert.ok(body.reply.trim().length > 0, 'reply should not be blank');
    assert.ok(
      ['primitive_phrase', 'single_word', 'free'].includes(body.kind),
      'chat response should include valid utterance kind'
    );
    assert.ok(typeof body.memoryCount === 'number', 'chat response should include memory count');

    const statsAfter = await fetch(`${API}/stats`).then((r) => r.json());
    assert.ok(statsAfter.xp >= previousStats.xp, 'XP should not decrease after chat');
    assert.ok(statsAfter.level >= previousStats.level, 'Level should not decrease');
    assert.ok(statsAfter.memoryCount >= 0, 'memory count should be non-negative');

    messageSummaries.push({
      index: index + 1,
      message,
      replyKind: body.kind,
      replyLength: body.reply.length,
      xpDelta: statsAfter.xp - previousStats.xp,
      memoryCount: statsAfter.memoryCount,
    });

    previousStats = statsAfter;
  }

  const finalStats = previousStats;
  assert.ok(finalStats.xp >= initialStats.xp, 'overall XP should grow or stay equal');
  assert.ok(messageSummaries.length === chatMessagePlan.length, 'should record each chat round');

  console.info('[chat.test] Sequential chat summary:', {
    totalMessages: messageSummaries.length,
    configuredMessages: getCachedMessageCount(),
    messageSummaries,
  });

  const memRes = await fetch(`${API}/memories?limit=5`);
  assert.equal(memRes.ok, true, 'memories endpoint should respond OK');
  const memBody = await memRes.json();
  assert.ok(Array.isArray(memBody.memories), 'memories payload should include list');

  const journalRes = await fetch(`${API}/journal?limit=5`);
  assert.equal(journalRes.ok, true, 'journal endpoint should respond OK');
  const journalBody = await journalRes.json();
  assert.ok(Array.isArray(journalBody.thoughts), 'journal payload should include thoughts array');
});