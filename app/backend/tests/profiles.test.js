import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 31338;
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
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mypal-profiles-test-'));
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

describe('Profile Management', () => {
  test('should list profiles (initially empty)', async () => {
    const res = await fetch(`${API}/profiles`);
    assert.equal(res.ok, true, 'profiles endpoint should respond OK');
    const body = await res.json();
    assert.ok(Array.isArray(body.profiles), 'should return profiles array');
    assert.equal(body.profiles.length, 0, 'should start with no profiles');
  });

  test('should create a new profile', async () => {
    const res = await fetch(`${API}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'TestPal' }),
    });
    assert.equal(res.ok, true, 'profile creation should succeed');
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.profile, 'should return profile object');
    assert.equal(body.profile.name, 'TestPal');
    assert.ok(body.profile.id, 'should have generated ID');
    assert.equal(body.profile.level, 1, 'should start at level 1');
  });

  test('should list created profile', async () => {
    const res = await fetch(`${API}/profiles`);
    const body = await res.json();
    assert.equal(body.profiles.length, 1, 'should have one profile');
    assert.equal(body.profiles[0].name, 'TestPal');
  });

  test('should reject empty profile name', async () => {
    const res = await fetch(`${API}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    assert.equal(res.ok, true, 'request should complete');
    const body = await res.json();
    assert.equal(body.success, false, 'should fail validation');
    assert.ok(body.error, 'should return error message');
  });

  test('should reject duplicate profile names', async () => {
    const res = await fetch(`${API}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'TestPal' }),
    });
    const body = await res.json();
    assert.equal(body.success, false, 'should fail on duplicate');
    assert.ok(body.error.includes('exists'), 'error should mention duplication');
  });

  test('should reject name longer than 30 characters', async () => {
    const longName = 'A'.repeat(31);
    const res = await fetch(`${API}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: longName }),
    });
    const body = await res.json();
    assert.equal(body.success, false, 'should fail validation');
    assert.ok(body.error.includes('30'), 'error should mention character limit');
  });

  test('should load a profile', async () => {
    // Get the profile ID
    const listRes = await fetch(`${API}/profiles`);
    const listBody = await listRes.json();
    const profileId = listBody.profiles[0].id;

    // Load the profile
    const res = await fetch(`${API}/profiles/${profileId}/load`, {
      method: 'POST',
    });
    assert.equal(res.ok, true, 'profile load should succeed');
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.profile.id, profileId);

    // Verify stats endpoint reflects loaded profile
    const statsRes = await fetch(`${API}/stats`);
    const statsBody = await statsRes.json();
    assert.ok(statsBody.level >= 0, 'stats should have level');
  });

  test('should enforce 3 profile limit', async () => {
    // Create two more profiles
    await fetch(`${API}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'SecondPal' }),
    });
    await fetch(`${API}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ThirdPal' }),
    });

    // Try to create a fourth
    const res = await fetch(`${API}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'FourthPal' }),
    });
    const body = await res.json();
    assert.equal(body.success, false, 'should reject 4th profile');
    assert.ok(body.error.includes('3'), 'error should mention limit');
  });

  test('should delete a profile', async () => {
    const listRes = await fetch(`${API}/profiles`);
    const listBody = await listRes.json();
    const profileId = listBody.profiles[0].id;

    const res = await fetch(`${API}/profiles/${profileId}`, {
      method: 'DELETE',
    });
    assert.equal(res.ok, true, 'profile deletion should succeed');
    const body = await res.json();
    assert.equal(body.success, true);

    // Verify profile is gone
    const verifyRes = await fetch(`${API}/profiles`);
    const verifyBody = await verifyRes.json();
    assert.equal(
      verifyBody.profiles.find(p => p.id === profileId),
      undefined,
      'deleted profile should not be in list'
    );
  });
});
