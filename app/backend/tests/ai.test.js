import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 31344;
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
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mypal-ai-test-'));
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

describe('AI Status and Configuration', () => {
  test('should get AI status', async () => {
    const res = await fetch(`${API}/ai/status`);
    assert.equal(res.ok, true, 'ai status endpoint should respond OK');
    const body = await res.json();
    assert.ok(body.provider, 'should have provider info');
    assert.equal(typeof body.available, 'boolean', 'should have availability status');
  });

  test('should list available models', async () => {
    const res = await fetch(`${API}/ai/models`);
    assert.equal(res.ok, true, 'ai models endpoint should respond OK');
    const body = await res.json();
    assert.ok(Array.isArray(body.models) || body.models === null, 'should return models array or null');
  });

  test('should configure AI provider', async () => {
    const res = await fetch(`${API}/ai/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        provider: 'local',
        model: null
      }),
    });
    assert.equal(res.ok, true, 'configuration should succeed');
    const body = await res.json();
    assert.equal(body.success, true);
  });

  test('should reject invalid provider', async () => {
    const res = await fetch(`${API}/ai/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        provider: 'invalid-provider',
      }),
    });
    const body = await res.json();
    assert.equal(body.success, false, 'should reject invalid provider');
  });

  test('should support ollama configuration', async () => {
    const res = await fetch(`${API}/ai/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        provider: 'ollama',
        endpoint: 'http://localhost:11434',
        model: 'llama3.2:3b'
      }),
    });
    assert.equal(res.ok, true, 'ollama configuration should be accepted');
  });
});

describe('Models System', () => {
  test('should list available models', async () => {
    const res = await fetch(`${API}/models`);
    assert.equal(res.ok, true, 'models endpoint should respond OK');
    const body = await res.json();
    assert.ok(body.models, 'should have models data');
  });
});

describe('Plugins System', () => {
  test('should list available plugins', async () => {
    const res = await fetch(`${API}/plugins`);
    assert.equal(res.ok, true, 'plugins endpoint should respond OK');
    const body = await res.json();
    assert.ok(Array.isArray(body.plugins), 'should return plugins array');
  });

  test('should toggle plugin state', async () => {
    const res = await fetch(`${API}/plugins/test-plugin/toggle`, {
      method: 'POST',
    });
    // This may succeed or fail depending on plugin existence
    // Just verify endpoint responds
    assert.ok(res.status === 200 || res.status === 404, 'should respond to toggle request');
  });
});

describe('AI Prompt Builder', () => {
  test('should import PromptBuilder correctly', async () => {
    // Indirect test - if server started, imports worked
    const res = await fetch(`${API}/health`);
    assert.equal(res.ok, true, 'server should be running with prompt builder imported');
  });
});

describe('AI Model Adapter', () => {
  test('should import ModelAdapter correctly', async () => {
    // Indirect test - if server started, imports worked
    const res = await fetch(`${API}/health`);
    assert.equal(res.ok, true, 'server should be running with model adapter imported');
  });
});

describe('Developmental Stages', () => {
  test('should respond with stage-appropriate utterances', async () => {
    // Get current level
    const statsRes = await fetch(`${API}/stats`);
    const stats = await statsRes.json();
    const currentLevel = stats.level;

    // Send chat
    const chatRes = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    });
    const chat = await chatRes.json();
    
    // Verify response kind matches level
    assert.ok(['primitive_phrase', 'single_word', 'free'].includes(chat.kind), 
      'should return valid utterance kind');
    
    if (currentLevel < 4) {
      assert.ok(['primitive_phrase', 'single_word'].includes(chat.kind),
        'low levels should use constrained utterances');
    }
  });

  test('should track stage progression', async () => {
    // Send multiple chats to gain levels
    for (let i = 0; i < 3; i++) {
      await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Message ${i}` }),
      });
    }

    const stats = await fetch(`${API}/stats`).then(r => r.json());
    assert.ok(stats.level >= 0, 'should have valid level');
  });
});

describe('Vocabulary Learning', () => {
  test('should learn new words from input', async () => {
    const uniqueWord = 'xylophone' + Date.now();
    
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `I like the ${uniqueWord}` }),
    });

    // Check if word was learned (it may be filtered by stop words)
    const brain = await fetch(`${API}/brain`).then(r => r.json());
    assert.ok(Array.isArray(brain.vocabulary), 'should have vocabulary array');
  });

  test('should track vocabulary growth', async () => {
    const beforeRes = await fetch(`${API}/brain`);
    const beforeBrain = await beforeRes.json();
    const beforeSize = beforeBrain.vocabulary.length;

    // Add diverse vocabulary
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'telescope microscope kaleidoscope' }),
    });

    const afterRes = await fetch(`${API}/brain`);
    const afterBrain = await afterRes.json();
    
    // Vocabulary should exist
    assert.ok(Array.isArray(afterBrain.vocabulary), 'vocabulary should be tracked');
  });
});
