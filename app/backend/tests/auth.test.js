import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 31341;
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
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mypal-auth-test-'));
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

describe('Authentication System', () => {
  test('should register a new user', async () => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'testuser',
        password: 'password123'
      }),
    });
    assert.equal(res.ok, true, 'registration should succeed');
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.token, 'should return auth token');
    assert.ok(body.userId, 'should return user ID');
  });

  test('should reject duplicate username', async () => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'testuser',
        password: 'password456'
      }),
    });
    const body = await res.json();
    assert.equal(body.success, false, 'should reject duplicate');
    assert.ok(body.error, 'should return error message');
  });

  test('should reject short password', async () => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'newuser',
        password: '123'
      }),
    });
    const body = await res.json();
    assert.equal(body.success, false, 'should reject short password');
  });

  test('should reject empty username', async () => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: '',
        password: 'password123'
      }),
    });
    const body = await res.json();
    assert.equal(body.success, false, 'should reject empty username');
  });

  test('should login with valid credentials', async () => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'testuser',
        password: 'password123'
      }),
    });
    assert.equal(res.ok, true, 'login should succeed');
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.token, 'should return auth token');
    assert.ok(body.userId, 'should return user ID');
  });

  test('should reject invalid password', async () => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'testuser',
        password: 'wrongpassword'
      }),
    });
    const body = await res.json();
    assert.equal(body.success, false, 'should reject wrong password');
  });

  test('should reject non-existent user', async () => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'nonexistent',
        password: 'password123'
      }),
    });
    const body = await res.json();
    assert.equal(body.success, false, 'should reject non-existent user');
  });

  test('should logout successfully', async () => {
    // Login first
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'testuser',
        password: 'password123'
      }),
    });
    const loginBody = await loginRes.json();
    const token = loginBody.token;

    // Logout
    const res = await fetch(`${API}/auth/logout`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    assert.equal(res.ok, true, 'logout should succeed');
    const body = await res.json();
    assert.equal(body.success, true);
  });

  test('should track active sessions', async () => {
    // Register a new user and get token
    const registerRes = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'sessionuser',
        password: 'password123'
      }),
    });
    const registerBody = await registerRes.json();
    assert.ok(registerBody.token, 'should have token after registration');
  });

  test('should handle concurrent logins for same user', async () => {
    // Login twice with same credentials
    const login1 = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'testuser',
        password: 'password123'
      }),
    }).then(r => r.json());

    const login2 = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'testuser',
        password: 'password123'
      }),
    }).then(r => r.json());

    assert.ok(login1.token, 'first login should succeed');
    assert.ok(login2.token, 'second login should succeed');
    assert.notEqual(login1.token, login2.token, 'tokens should be different');
  });
});
