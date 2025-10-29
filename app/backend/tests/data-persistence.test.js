import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveMessagePlan } from './helpers/message-plan.js';

const PORT = 31345;
const API = `http://localhost:${PORT}/api`;

let serverProcess;
let tempRoot;
let unexpectedExit;
let dataDir;
let profileId;
let messagePlan = [];

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

async function readJson(filePath) {
  const raw = await fs.promises.readFile(filePath, 'utf8');
  if (!raw || raw.trim() === '') {
    return null;
  }
  return JSON.parse(raw);
}

before(async () => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mypal-data-persistence-'));
  dataDir = path.join(tempRoot, 'data');
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

  messagePlan = await resolveMessagePlan({ label: 'data persistence chat', defaultCount: 2 });

  // Create and load a profile so data persists under profile directory
  const createRes = await fetch(`${API}/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'PersistencePal' }),
  });
  assert.equal(createRes.ok, true, 'profile creation should succeed');
  const createBody = await createRes.json();
  assert.equal(createBody.success, true, 'profile creation should return success');
  profileId = createBody.profile.id;
  assert.ok(profileId, 'profile id should be present');

  const loadRes = await fetch(`${API}/profiles/${profileId}/load`, { method: 'POST' });
  assert.equal(loadRes.ok, true, 'profile load should succeed');
  const loadBody = await loadRes.json();
  assert.equal(loadBody.success, true, 'profile load should return success');

  // Drive interactions that create data
  for (const message of messagePlan) {
    const res = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    assert.equal(res.ok, true, 'chat request should succeed during setup');
    await res.json();
  }

  // Force neural network regeneration to ensure neural.json content
  await fetch(`${API}/neural/regenerate`, { method: 'POST' }).catch(() => {});

  // Allow async saves to flush
  await new Promise((resolve) => setTimeout(resolve, 200));
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

test('profile data files persist chat information and remain readable', async () => {
  const profileDir = path.join(dataDir, 'profiles', `profile-${profileId}`);
  const fileExpectations = [
    {
      file: 'metadata.json',
      validate: (data) => {
        assert.equal(data.id, profileId, 'metadata should store profile id');
        assert.ok(typeof data.level === 'number', 'metadata level should be numeric');
        assert.ok(typeof data.xp === 'number', 'metadata xp should be numeric');
      },
    },
    {
      file: 'chat-log.json',
      validate: (data) => {
        assert.ok(Array.isArray(data), 'chat log should be array');
      },
    },
    {
      file: 'memories.json',
      validate: (data) => {
        assert.ok(Array.isArray(data), 'memories should be array');
      },
    },
    {
      file: 'journal.json',
      validate: (data) => {
        assert.ok(Array.isArray(data), 'journal should be array');
      },
    },
    {
      file: 'concepts.json',
      validate: (data) => {
        assert.ok(Array.isArray(data), 'concepts should be array');
      },
    },
    {
      file: 'facts.json',
      validate: (data) => {
        assert.ok(Array.isArray(data), 'facts should be array');
      },
    },
    {
      file: 'neural.json',
      validate: (data) => {
        assert.ok(data === null || typeof data === 'object', 'neural data should be null or object');
      },
    },
    {
      file: 'vocabulary.json',
      validate: (data) => {
        assert.ok(Array.isArray(data), 'vocabulary should be array');
      },
    },
    {
      file: 'settings.json',
      validate: (data) => {
        assert.ok(typeof data === 'object' && data !== null, 'settings should be object');
        assert.ok(typeof data.apiProvider === 'string', 'settings should include apiProvider');
      },
    },
  ];

  for (const { file, validate } of fileExpectations) {
    const fullPath = path.join(profileDir, file);
    assert.ok(fs.existsSync(fullPath), `${file} should exist in profile directory`);
    const json = await readJson(fullPath);
    validate(json);
  }

  const sqlitePath = path.join(dataDir, 'storage', 'mypal.sqlite');
  assert.ok(fs.existsSync(sqlitePath), 'sqlite mirror should exist alongside JSON files');
  const sqliteStats = fs.statSync(sqlitePath);
  assert.ok(sqliteStats.size > 0, 'sqlite mirror should contain data');

  // Verify API endpoints can still read the persisted data
  const stats = await fetch(`${API}/stats`).then((r) => r.json());
  assert.equal(typeof stats.level, 'number', 'stats endpoint should read metadata');

  const memories = await fetch(`${API}/memories?limit=10`).then((r) => r.json());
  assert.ok(Array.isArray(memories.memories), 'memories endpoint should read stored memories');

  const journal = await fetch(`${API}/journal?limit=10`).then((r) => r.json());
  assert.ok(Array.isArray(journal.thoughts), 'journal endpoint should read stored journal');

  const neural = await fetch(`${API}/neural-network`).then((r) => r.json());
  assert.ok(neural.regions || neural.metrics, 'neural endpoint should respond with data structure');

  const metadataPath = path.join(profileDir, 'metadata.json');
  const metadataSnapshot = await readJson(metadataPath);
  fs.unlinkSync(metadataPath);
  assert.ok(!fs.existsSync(metadataPath), 'metadata.json should be removed to test sqlite hydration');

  const profilesList = await fetch(`${API}/profiles`).then((r) => r.json());
  const hydratedProfile = profilesList.profiles.find((p) => p.id === profileId);
  assert.ok(hydratedProfile, 'profiles endpoint should still list the profile');
  assert.equal(hydratedProfile.name, metadataSnapshot.name, 'hydrated profile should retain original name');
  assert.ok(fs.existsSync(metadataPath), 'metadata.json should be regenerated from sqlite mirror');
});
