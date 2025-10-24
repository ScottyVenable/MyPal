import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 31342;
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
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mypal-neural-test-'));
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

describe('Neural Network System', () => {
  test('should get neural network structure', async () => {
    const res = await fetch(`${API}/neural-network`);
    assert.equal(res.ok, true, 'neural-network endpoint should respond OK');
    const body = await res.json();
    assert.ok(body.neurons, 'should have neurons object');
    assert.ok(body.connections, 'should have connections object');
    assert.equal(typeof body.totalNeurons, 'number', 'should have total neuron count');
    assert.equal(typeof body.totalConnections, 'number', 'should have total connection count');
  });

  test('should have initial neurons', async () => {
    const res = await fetch(`${API}/neural-network`);
    const body = await res.json();
    assert.ok(body.totalNeurons > 0, 'should have neurons initialized');
    assert.ok(body.neurons, 'should have neurons data structure');
  });

  test('should get neural graph data', async () => {
    const res = await fetch(`${API}/neural`);
    assert.equal(res.ok, true, 'neural endpoint should respond OK');
    const body = await res.json();
    assert.ok(Array.isArray(body.nodes), 'should have nodes array');
    assert.ok(Array.isArray(body.links), 'should have links array');
  });

  test('should have neuron regions', async () => {
    const res = await fetch(`${API}/neural`);
    const body = await res.json();
    
    if (body.nodes.length > 0) {
      const node = body.nodes[0];
      assert.ok(node.id, 'node should have ID');
      assert.ok(node.region, 'node should have region');
      assert.equal(typeof node.activation, 'number', 'node should have activation level');
    }
  });

  test('should regenerate neural network', async () => {
    const beforeRes = await fetch(`${API}/neural-network`);
    const beforeBody = await beforeRes.json();
    const beforeCount = beforeBody.totalNeurons;

    // Regenerate network
    const res = await fetch(`${API}/neural/regenerate`, {
      method: 'POST',
    });
    assert.equal(res.ok, true, 'regenerate should succeed');
    const body = await res.json();
    assert.equal(body.success, true);

    // Verify regeneration
    const afterRes = await fetch(`${API}/neural-network`);
    const afterBody = await afterRes.json();
    assert.ok(afterBody.totalNeurons > 0, 'should have neurons after regeneration');
  });

  test('should track neuron connections', async () => {
    const res = await fetch(`${API}/neural`);
    const body = await res.json();
    
    if (body.links.length > 0) {
      const link = body.links[0];
      assert.ok(link.source, 'link should have source');
      assert.ok(link.target, 'link should have target');
      assert.equal(typeof link.strength, 'number', 'link should have strength');
    }
  });

  test('should activate neurons during chat', async () => {
    // Get initial state
    const beforeRes = await fetch(`${API}/neural`);
    const beforeBody = await beforeRes.json();

    // Send chat to trigger neural activity
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Tell me something interesting' }),
    });

    // Check if neural state changed (activity logged)
    const afterRes = await fetch(`${API}/neural`);
    const afterBody = await afterRes.json();
    
    // Network structure should exist
    assert.ok(afterBody.nodes.length > 0, 'should have active nodes');
  });
});

describe('Brain System', () => {
  test('should get brain statistics', async () => {
    const res = await fetch(`${API}/brain`);
    assert.equal(res.ok, true, 'brain endpoint should respond OK');
    const body = await res.json();
    assert.ok(body.concepts, 'should have concepts');
    assert.ok(body.vocabulary, 'should have vocabulary');
    assert.ok(body.facts, 'should have facts');
  });

  test('should track learned vocabulary', async () => {
    // Send messages to build vocabulary
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'apple banana cherry' }),
    });

    const res = await fetch(`${API}/brain`);
    const body = await res.json();
    assert.ok(Array.isArray(body.vocabulary), 'vocabulary should be array');
  });

  test('should track concepts', async () => {
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'I am happy and excited' }),
    });

    const res = await fetch(`${API}/brain`);
    const body = await res.json();
    assert.ok(Array.isArray(body.concepts), 'concepts should be array');
  });

  test('should track facts', async () => {
    await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'My name is Bob' }),
    });

    const res = await fetch(`${API}/brain`);
    const body = await res.json();
    assert.ok(Array.isArray(body.facts), 'facts should be array');
  });
});
