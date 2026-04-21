/**
 * LM Studio connection — end-to-end tests.
 *
 * Tests the connection to a locally running LM Studio instance using the
 * OpenAI-compatible API (default: http://localhost:1234/v1).
 *
 * These tests are designed to be skipped gracefully when LM Studio is not
 * running, making them safe to include in CI pipelines.
 *
 * To run LM Studio:  start LM Studio, load a model, and enable the local server.
 *
 * Run these tests:   npm run test:lmstudio   (from the tests/ directory)
 *
 * @tags @lmstudio
 */
import { test, expect } from '@playwright/test';

const LM_STUDIO_BASE = process.env.LM_STUDIO_URL ?? 'http://localhost:1234/v1';
const CONNECT_TIMEOUT_MS = 3_000;

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Attempt a GET request to the /v1/models endpoint.
 * Returns the response on success, or null if LM Studio is not reachable.
 */
async function probeModels(): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
    const res = await fetch(`${LM_STUDIO_BASE}/models`, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch {
    return null;
  }
}

/**
 * Skip the current test with a clear message if LM Studio is unreachable.
 * Must be called at the start of each test that depends on the connection.
 */
async function requireLMStudio() {
  const res = await probeModels();
  if (!res) {
    test.skip(true, `LM Studio not reachable at ${LM_STUDIO_BASE} — start LM Studio and enable its local server to run this test`);
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('LM Studio connection @lmstudio', () => {
  test.setTimeout(15_000);

  // ── Test 1: Server reachability ────────────────────────────────────────────
  test('LM Studio server is reachable and returns model list @lmstudio', async () => {
    const res = await probeModels();

    if (!res) {
      test.skip(true, `LM Studio not reachable at ${LM_STUDIO_BASE}`);
      return;
    }

    expect(res.status).toBe(200);

    const body = await res.json() as { data?: unknown[] };
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
  });

  // ── Test 2: Chat completions endpoint ─────────────────────────────────────
  test('chat completions endpoint accepts a simple prompt @lmstudio', async () => {
    await requireLMStudio();

    // Discover first available model
    const modelsRes = await fetch(`${LM_STUDIO_BASE}/models`);
    const modelsBody = await modelsRes.json() as { data?: Array<{ id: string }> };
    const models = modelsBody.data ?? [];

    if (models.length === 0) {
      test.skip(true, 'LM Studio is running but no model is loaded — load a model first');
      return;
    }

    const modelId = models[0].id;

    const payload = {
      model: modelId,
      messages: [{ role: 'user', content: 'Reply with the single word: hello' }],
      max_tokens: 16,
      temperature: 0,
      stream: false,
    };

    const res = await fetch(`${LM_STUDIO_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);

    const body = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    expect(body).toHaveProperty('choices');
    expect(Array.isArray(body.choices)).toBe(true);
    expect(body.choices!.length).toBeGreaterThan(0);

    const content = body.choices![0]?.message?.content;
    expect(typeof content).toBe('string');
    expect((content as string).length).toBeGreaterThan(0);
  });

  // ── Test 3: Connection failure is handled gracefully ───────────────────────
  test('gracefully handles connection failure to non-existent LM server @lmstudio', async () => {
    // Always runs — tests that fetch rejects cleanly when the server is absent
    const badUrl = 'http://127.0.0.1:19999/v1/models';
    let errorCaught = false;
    let response: Response | null = null;

    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 1_500);
      response = await fetch(badUrl, { signal: controller.signal });
    } catch {
      errorCaught = true;
    }

    // Expect either a network error or no response
    const failed = errorCaught || response === null;
    expect(failed).toBe(true);
  });
});
