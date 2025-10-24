import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 31343;
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
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mypal-export-test-'));
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

describe('Data Export System', () => {
  test('should export all data', async () => {
    // Create some data first
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello for export test' }),
    });

    const res = await fetch(`${API}/export`);
    assert.equal(res.ok, true, 'export endpoint should respond OK');
    const body = await res.json();
    
    assert.ok(body.state, 'export should include state');
    assert.ok(body.memories, 'export should include memories');
    assert.ok(body.chatLog, 'export should include chat log');
    assert.ok(body.journal, 'export should include journal');
    assert.ok(body.vocabulary, 'export should include vocabulary');
    assert.ok(body.concepts, 'export should include concepts');
    assert.ok(body.facts, 'export should include facts');
    assert.ok(body.neuralNetwork, 'export should include neural network');
  });

  test('should include metadata in export', async () => {
    const res = await fetch(`${API}/export`);
    const body = await res.json();
    
    assert.equal(typeof body.exportedAt, 'number', 'should have export timestamp');
    assert.ok(body.version, 'should have version info');
  });

  test('should export valid JSON structure', async () => {
    const res = await fetch(`${API}/export`);
    const text = await res.text();
    
    // Should be valid JSON
    assert.doesNotThrow(() => {
      JSON.parse(text);
    }, 'export should be valid JSON');
  });

  test('should handle export with no data', async () => {
    // Reset to clear data
    await fetch(`${API}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });

    const res = await fetch(`${API}/export`);
    assert.equal(res.ok, true, 'export should work with empty data');
    const body = await res.json();
    assert.ok(body, 'should return valid export object');
  });
});

describe('Telemetry System', () => {
  test('should accept telemetry data', async () => {
    const res = await fetch(`${API}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        source: 'test',
        type: 'info',
        message: 'Test telemetry message',
        timestamp: Date.now()
      }),
    });
    assert.equal(res.ok, true, 'telemetry endpoint should accept data');
  });

  test('should handle various telemetry types', async () => {
    const types = ['info', 'warn', 'error', 'debug'];
    
    for (const type of types) {
      const res = await fetch(`${API}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          source: 'test',
          type,
          message: `Test ${type} message`,
          timestamp: Date.now()
        }),
      });
      assert.equal(res.ok, true, `should accept ${type} telemetry`);
    }
  });
});

describe('Feedback System', () => {
  test('should accept positive feedback', async () => {
    // Send a chat first
    const chatRes = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Test feedback' }),
    });
    const chatBody = await chatRes.json();

    // Send positive feedback
    const res = await fetch(`${API}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messageId: chatBody.memoryCount || 0,
        positive: true
      }),
    });
    assert.equal(res.ok, true, 'feedback should be accepted');
    const body = await res.json();
    assert.equal(body.success, true);
  });

  test('should accept negative feedback', async () => {
    const res = await fetch(`${API}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messageId: 0,
        positive: false
      }),
    });
    assert.equal(res.ok, true, 'negative feedback should be accepted');
  });
});

describe('Reinforcement System', () => {
  test('should reinforce learned patterns', async () => {
    const res = await fetch(`${API}/reinforce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        pattern: 'greeting',
        strength: 0.5
      }),
    });
    assert.equal(res.ok, true, 'reinforcement should be accepted');
    const body = await res.json();
    assert.equal(body.success, true);
  });
});

describe('Reset System', () => {
  test('should require confirmation for reset', async () => {
    const res = await fetch(`${API}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: false }),
    });
    const body = await res.json();
    assert.equal(body.success, false, 'should reject without confirmation');
  });

  test('should reset data with confirmation', async () => {
    // Create some data
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Data before reset' }),
    });

    // Reset
    const res = await fetch(`${API}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    assert.equal(res.ok, true, 'reset should succeed');
    const body = await res.json();
    assert.equal(body.success, true);

    // Verify data is cleared
    const memRes = await fetch(`${API}/memories?limit=10`);
    const memBody = await memRes.json();
    assert.equal(memBody.memories.length, 0, 'memories should be cleared');

    const statsRes = await fetch(`${API}/stats`);
    const statsBody = await statsRes.json();
    assert.equal(statsBody.level, 0, 'level should be reset');
    assert.equal(statsBody.xp, 0, 'xp should be reset');
  });
});

describe('Report System', () => {
  test('should generate progress report', async () => {
    const res = await fetch(`${API}/report`, {
      method: 'POST',
    });
    assert.equal(res.ok, true, 'report endpoint should respond OK');
    const body = await res.json();
    assert.ok(body.report, 'should return report data');
  });
});
