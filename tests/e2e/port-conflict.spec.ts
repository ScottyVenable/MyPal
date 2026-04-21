/**
 * Port conflict handling — end-to-end tests.
 *
 * Verifies that the backend server retries successive ports when the
 * preferred port is already occupied (EADDRINUSE), and binds normally
 * when the port is free.
 *
 * Requires:  app/backend/node_modules installed  (`cd app/backend && npm install`)
 *
 * @tags @port
 */
import { test, expect } from '@playwright/test';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, type ChildProcess } from 'child_process';

// ── Paths ──────────────────────────────────────────────────────────────────────
const ROOT_DIR      = path.resolve(__dirname, '../..');
const BACKEND_ENTRY = path.join(ROOT_DIR, 'app', 'backend', 'src', 'server.js');
const BACKEND_MODS  = path.join(ROOT_DIR, 'app', 'backend', 'node_modules');
const SKIP_REASON   = 'Backend node_modules not installed — run `npm install` in app/backend/';

/** Port range used only by these tests to avoid conflicts with any real server. */
const TEST_BASE_PORT = 19001;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Occupy a TCP port; returns a cleanup function. */
function blockPort(port: number): Promise<() => Promise<void>> {
  return new Promise((resolve, reject) => {
    const blocker = net.createServer();
    blocker.listen(port, '127.0.0.1', () => {
      resolve(() => new Promise<void>(r => blocker.close(() => r())));
    });
    blocker.once('error', reject);
  });
}

/**
 * Poll `portFile` until it contains a valid integer, or timeout.
 * Returns the port number.
 */
async function waitForPortFile(portFile: string, timeoutMs = 20_000): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(portFile)) {
      const raw = fs.readFileSync(portFile, 'utf8').trim();
      const port = parseInt(raw, 10);
      if (!isNaN(port) && port > 0) return port;
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Timed out (${timeoutMs} ms) waiting for port file: ${portFile}`);
}

/** Spawn the backend in an isolated temp environment. */
function spawnBackend(tmpData: string, tmpLogs: string, port: number): ChildProcess {
  return spawn('node', [BACKEND_ENTRY], {
    env: {
      ...process.env,
      PORT             : String(port),
      MYPAL_DATA_DIR   : tmpData,
      MYPAL_LOGS_DIR   : tmpLogs,
      MYPAL_LOG_LEVEL  : 'WARN',
      NODE_ENV         : 'test',
    },
    stdio: 'pipe',
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('Port conflict handling @port', () => {
  test.setTimeout(40_000);

  let proc: ChildProcess | null = null;
  let freeBlocker: (() => Promise<void>) | null = null;
  let tmpData = '';
  let tmpLogs = '';

  test.beforeEach(() => {
    const ts = Date.now();
    tmpData = path.join(os.tmpdir(), `mypal-data-${ts}`);
    tmpLogs = path.join(os.tmpdir(), `mypal-logs-${ts}`);
    fs.mkdirSync(tmpData, { recursive: true });
    fs.mkdirSync(tmpLogs, { recursive: true });
  });

  test.afterEach(async () => {
    if (proc) {
      proc.kill();
      await new Promise(r => setTimeout(r, 600));
      proc = null;
    }
    if (freeBlocker) {
      await freeBlocker();
      freeBlocker = null;
    }
    try { fs.rmSync(tmpData, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(tmpLogs, { recursive: true, force: true }); } catch {}
  });

  // ── Test 1 ─────────────────────────────────────────────────────────────────
  test('binds to next available port when preferred port is occupied @port', async () => {
    test.skip(!fs.existsSync(BACKEND_MODS), SKIP_REASON);

    // Block the preferred port so the server is forced to retry
    freeBlocker = await blockPort(TEST_BASE_PORT);

    proc = spawnBackend(tmpData, tmpLogs, TEST_BASE_PORT);

    const portFile = path.join(tmpLogs, 'server.port');
    const boundPort = await waitForPortFile(portFile);

    // Server must have retried to a higher port
    expect(boundPort).toBeGreaterThan(TEST_BASE_PORT);
    expect(boundPort).toBeLessThanOrEqual(TEST_BASE_PORT + 10);

    // Server must respond over HTTP at the new port
    const res = await fetch(`http://127.0.0.1:${boundPort}/api/health`).catch(() => null);
    expect(res, `Expected HTTP response on port ${boundPort}`).not.toBeNull();
    // 200 OK or 404 (route may not exist) both confirm the HTTP server is up
    expect([200, 404]).toContain(res!.status);
  });

  // ── Test 2 ─────────────────────────────────────────────────────────────────
  test('binds to preferred port when it is free @port', async () => {
    test.skip(!fs.existsSync(BACKEND_MODS), SKIP_REASON);

    const freePort = TEST_BASE_PORT + 50; // use a shifted port to avoid lingering bindings
    proc = spawnBackend(tmpData, tmpLogs, freePort);

    const portFile = path.join(tmpLogs, 'server.port');
    const boundPort = await waitForPortFile(portFile);

    expect(boundPort).toBe(freePort);

    const res = await fetch(`http://127.0.0.1:${boundPort}/api/health`).catch(() => null);
    expect(res).not.toBeNull();
    expect([200, 404]).toContain(res!.status);
  });
});
