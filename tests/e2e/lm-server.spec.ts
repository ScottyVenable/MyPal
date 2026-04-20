/**
 * LM Server Client — end-to-end tests.
 * @tags @lm
 */
import { test, expect } from '@playwright/test';
import path from 'path';

import { LMClient } from '../../src/ai/lm-server/LMClient';
import type { LMServerConfig } from '../../src/ai/types';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../test-screenshots/lm-server');

function createConfig(overrides?: Partial<LMServerConfig>): LMServerConfig {
  return {
    endpoint: 'http://localhost:19999',
    model: 'test-model',
    maxTokens: 128,
    temperature: 0.7,
    timeout: 2000,
    ...overrides,
  };
}

test.describe('LM Server Client @lm', () => {
  test('should detect connection failure gracefully', async ({ page }) => {
    const lm = new LMClient(createConfig());

    await test.step('attempt connection to non-existent server', async () => {
      const connected = await lm.connect();
      expect(connected).toBe(false);
      expect(lm.isConnected()).toBe(false);
    });

    await test.step('get status with error details', async () => {
      const status = await lm.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBeTruthy();
      expect(status.model).toBe('test-model');
      expect(status.endpoint).toBe('http://localhost:19999');
    });

    await test.step('capture screenshot', async () => {
      const status = await lm.getStatus();
      await page.goto('/');
      await page.evaluate((s) => {
        const el = document.querySelector('.messages') || document.body;
        el.innerHTML = `<div style="padding:16px;color:#F0F0F8;font-family:monospace;font-size:12px;">
          <h2>LM Server — Connection Failure Test</h2>
          <p>Connected: ${s.connected}</p>
          <p>Model: ${s.model}</p>
          <p>Endpoint: ${s.endpoint}</p>
          <p>Latency: ${s.latencyMs ?? 'N/A'} ms</p>
          <p style="color:#F87171;">Error: ${s.error}</p>
        </div>`;
      }, JSON.parse(JSON.stringify(status)));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'connection-failure.png'), fullPage: true });
    });
  });

  test('should retry on connection timeout', async () => {
    // Use a very short timeout to guarantee failure
    const lm = new LMClient(createConfig({ timeout: 500 }));

    await test.step('generate should throw after retries', async () => {
      let didThrow = false;
      try {
        await lm.generate('Hello, world!');
      } catch (err: unknown) {
        didThrow = true;
        expect(err).toBeInstanceOf(Error);
      }
      expect(didThrow).toBe(true);
    });

    await test.step('analyzeInput should fallback on failure', async () => {
      const result = await lm.analyzeInput('Testing the fallback system');
      expect(result).toBeDefined();
      expect(result.originalText).toBe('Testing the fallback system');
      expect(result.sentiment).toBeDefined();
    });
  });

  test('should update configuration dynamically', async () => {
    const lm = new LMClient(createConfig());

    await test.step('verify initial config', () => {
      const cfg = lm.getConfig();
      expect(cfg.model).toBe('test-model');
      expect(cfg.temperature).toBe(0.7);
      expect(cfg.maxTokens).toBe(128);
    });

    await test.step('update config', () => {
      lm.updateConfig({
        model: 'new-model',
        temperature: 0.9,
        maxTokens: 256,
      });

      const cfg = lm.getConfig();
      expect(cfg.model).toBe('new-model');
      expect(cfg.temperature).toBe(0.9);
      expect(cfg.maxTokens).toBe(256);
      // Endpoint should remain unchanged
      expect(cfg.endpoint).toBe('http://localhost:19999');
    });

    await test.step('update resets connection state', () => {
      expect(lm.isConnected()).toBe(false);
    });
  });

  test('should report server status', async () => {
    const lm = new LMClient(createConfig());

    await test.step('get status from offline server', async () => {
      const status = await lm.getStatus();

      expect(status).toBeDefined();
      expect(typeof status.connected).toBe('boolean');
      expect(status.model).toBe('test-model');
      expect(status.endpoint).toBe('http://localhost:19999');

      // Since server is not running, connection should fail
      expect(status.connected).toBe(false);
      expect(status.error).toBeTruthy();
    });

    await test.step('disconnect should update state', () => {
      lm.disconnect();
      expect(lm.isConnected()).toBe(false);
    });
  });
});
