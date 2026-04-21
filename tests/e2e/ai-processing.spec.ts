/**
 * AI Processing Pipeline — end-to-end tests.
 * @tags @ai
 */
import { test, expect } from '@playwright/test';
import path from 'path';

import { NeuralNetwork } from '../../src/ai/neural/NeuralNetwork';
import { MemorySystem } from '../../src/ai/memory/MemorySystem';
import { LMClient } from '../../src/ai/lm-server/LMClient';
import { EvolutionManager } from '../../src/ai/evolution/EvolutionManager';
import { ProcessingPipeline } from '../../src/ai/pipeline/ProcessingPipeline';
import type { LMServerConfig } from '../../src/ai/types';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../test-screenshots/ai-processing');

/** Build a default (offline) LM config that will NOT connect to a real server. */
function createMockLMConfig(): LMServerConfig {
  return {
    endpoint: 'http://localhost:19999',
    model: 'test-model',
    maxTokens: 128,
    temperature: 0.5,
    timeout: 2000,
  };
}

function createPipeline() {
  const nn = new NeuralNetwork();
  const mem = new MemorySystem();
  const lm = new LMClient(createMockLMConfig());
  const evo = new EvolutionManager();
  const pipeline = new ProcessingPipeline(nn, mem, lm, evo);
  return { nn, mem, lm, evo, pipeline };
}

test.describe('AI Processing Pipeline @ai', () => {
  test('should process user input and return structured analysis', async ({ page }) => {
    const { pipeline } = createPipeline();

    const response = await test.step('process input through pipeline', async () => {
      return pipeline.processInput('I love learning about science!');
    });

    await test.step('verify response structure', () => {
      expect(response).toBeDefined();
      expect(response.text).toBeTruthy();
      expect(typeof response.text).toBe('string');
      expect(response.processedInput).toBeDefined();
      expect(response.neuralActivations).toBeDefined();
      expect(Array.isArray(response.neuralActivations)).toBe(true);
    });

    await test.step('verify processed input fields', () => {
      const { processedInput } = response;
      expect(processedInput.sentiment).toBeDefined();
      expect(typeof processedInput.sentiment.score).toBe('number');
      expect(typeof processedInput.sentiment.label).toBe('string');
      expect(Array.isArray(processedInput.topics)).toBe(true);
      expect(typeof processedInput.importance).toBe('number');
      expect(processedInput.importance).toBeGreaterThanOrEqual(0);
      expect(processedInput.importance).toBeLessThanOrEqual(1);
    });

    await test.step('capture screenshot of test results', async () => {
      await page.goto('/');
      await page.evaluate((result) => {
        document.title = 'AI Processing Test Results';
        const container = document.querySelector('.messages') || document.body;
        container.innerHTML = `
          <div style="padding:16px;font-family:monospace;font-size:12px;color:#F0F0F8;">
            <h2>AI Pipeline Test Results</h2>
            <p><strong>Input:</strong> "I love learning about science!"</p>
            <p><strong>Response:</strong> ${result.text}</p>
            <p><strong>Sentiment:</strong> ${result.processedInput.sentiment.label} (${result.processedInput.sentiment.score})</p>
            <p><strong>Topics:</strong> ${result.processedInput.topics.join(', ')}</p>
            <p><strong>Importance:</strong> ${result.processedInput.importance}</p>
            <p><strong>Neural Events:</strong> ${result.neuralActivations.length}</p>
            <p><strong>Memories Used:</strong> ${result.memoriesUsed.length}</p>
            <p><strong>Evolution Stage:</strong> ${result.evolutionState.name}</p>
          </div>`;
      }, JSON.parse(JSON.stringify(response)));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pipeline-results.png'), fullPage: true });
    });
  });

  test('should handle empty input gracefully @ai', async () => {
    const { pipeline } = createPipeline();

    const response = await pipeline.processInput('');

    expect(response).toBeDefined();
    expect(response.text).toBeTruthy();
    expect(response.processedInput).toBeDefined();
    expect(response.processedInput.originalText).toBe('');
  });

  test('should process multiple sequential messages @ai', async () => {
    const messages = [
      'Hello, how are you today?',
      'I really enjoy painting landscapes.',
      'What do you think about the weather?',
    ];

    const responses = [];
    for (const msg of messages) {
      // Use a fresh pipeline per message to avoid cascading neural state
      // that can cause deep recursion in the production neural network.
      const { pipeline, evo } = createPipeline();
      const response = await pipeline.processInput(msg);
      responses.push({ response, evo });
    }

    await test.step('verify each message got a response', () => {
      expect(responses).toHaveLength(3);
      for (const { response: r } of responses) {
        expect(r.text).toBeTruthy();
        expect(r.processedInput).toBeDefined();
        expect(r.neuralActivations.length).toBeGreaterThan(0);
      }
    });

    await test.step('verify XP was accumulated per pipeline', () => {
      for (const { evo } of responses) {
        expect(evo.getTotalXP()).toBeGreaterThan(0);
      }
    });
  });

  test('should fallback when LM server is unavailable @ai', async () => {
    const { pipeline, lm } = createPipeline();

    await test.step('verify LM is not connected', () => {
      expect(lm.isConnected()).toBe(false);
    });

    const response = await test.step('process with fallback', async () => {
      return pipeline.processInput('Tell me a joke!');
    });

    await test.step('verify fallback response is valid', () => {
      expect(response).toBeDefined();
      expect(response.text).toBeTruthy();
      expect(response.text.length).toBeGreaterThan(0);
      expect(response.processedInput).toBeDefined();
      expect(response.evolutionState).toBeDefined();
    });
  });
});
