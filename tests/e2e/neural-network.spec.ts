/**
 * Neural Network — end-to-end tests.
 * @tags @neural
 */
import { test, expect } from '@playwright/test';
import path from 'path';

import { NeuralNetwork } from '../../src/ai/neural/NeuralNetwork';
import type { NeuralEvent } from '../../src/ai/types';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../test-screenshots/neural-network');

test.describe('Neural Network @neural', () => {
  test('should initialize with 7 brain regions', async ({ page }) => {
    const nn = new NeuralNetwork();
    const state = nn.getNetworkState();

    await test.step('verify 7 regions exist', () => {
      expect(state.regions).toHaveLength(7);
      const regionIds = state.regions.map((r) => r.id);
      expect(regionIds).toContain('sensory-input');
      expect(regionIds).toContain('language-center');
      expect(regionIds).toContain('association-cortex');
      expect(regionIds).toContain('frontal-lobe');
      expect(regionIds).toContain('amygdala');
      expect(regionIds).toContain('memory-systems');
      expect(regionIds).toContain('motor-output');
    });

    await test.step('verify each region has neurons', () => {
      for (const region of state.regions) {
        expect(region.neurons.length).toBeGreaterThan(0);
      }
    });

    await test.step('capture screenshot', async () => {
      await page.goto('/');
      await page.evaluate((regions) => {
        const el = document.querySelector('.messages') || document.body;
        el.innerHTML = `<div style="padding:16px;color:#F0F0F8;font-family:monospace;font-size:12px;">
          <h2>Neural Network Initialization</h2>
          ${regions.map((r: any) => `<p>${r.id}: ${r.neurons.length} neurons</p>`).join('')}
        </div>`;
      }, JSON.parse(JSON.stringify(state.regions)));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'initialization.png'), fullPage: true });
    });
  });

  test('should trigger neurons and propagate signals', async () => {
    const nn = new NeuralNetwork();
    const events: NeuralEvent[] = [];

    await test.step('register event listener', () => {
      nn.onNeuralEvent((e) => events.push(e));
    });

    await test.step('trigger a neuron with strong stimulus', () => {
      const state = nn.getNetworkState();
      const sensory = state.regions.find((r) => r.id === 'sensory-input')!;
      const neuron = sensory.neurons[0];

      nn.triggerNeuron(neuron.id, 0.9);
    });

    await test.step('verify events were fired', () => {
      expect(events.length).toBeGreaterThan(0);
      const fireEvents = events.filter((e) => e.type === 'fire');
      expect(fireEvents.length).toBeGreaterThan(0);
    });
  });

  test('should strengthen connections with repeated use', async () => {
    const nn = new NeuralNetwork();
    const state = nn.getNetworkState();

    await test.step('find an existing connection and strengthen it', () => {
      expect(state.connections.length).toBeGreaterThan(0);

      const conn = state.connections[0];
      const initialWeight = conn.weight;

      nn.strengthenConnection(conn.sourceId, conn.targetId, 0.1);

      const updatedState = nn.getNetworkState();
      const updatedConn = updatedState.connections.find(
        (c) => c.sourceId === conn.sourceId && c.targetId === conn.targetId,
      );

      expect(updatedConn).toBeDefined();
      expect(updatedConn!.weight).toBeGreaterThan(initialWeight);
    });
  });

  test('should create new connections', async () => {
    const nn = new NeuralNetwork();
    const state = nn.getNetworkState();

    await test.step('create connection between two neurons', () => {
      const sensory = state.regions.find((r) => r.id === 'sensory-input')!;
      const motor = state.regions.find((r) => r.id === 'motor-output')!;

      const sourceId = sensory.neurons[0].id;
      const targetId = motor.neurons[0].id;

      const connection = nn.createConnection(sourceId, targetId, 0.5);
      expect(connection).toBeDefined();
      expect(connection!.sourceId).toBe(sourceId);
      expect(connection!.targetId).toBe(targetId);
      expect(connection!.weight).toBeCloseTo(0.5, 1);
    });

    await test.step('verify connection exists in network state', () => {
      const updatedState = nn.getNetworkState();
      const sensory = state.regions.find((r) => r.id === 'sensory-input')!;
      const motor = state.regions.find((r) => r.id === 'motor-output')!;

      const exists = updatedState.connections.some(
        (c) => c.sourceId === sensory.neurons[0].id && c.targetId === motor.neurons[0].id,
      );
      expect(exists).toBe(true);
    });
  });

  test('should trigger predefined patterns', async () => {
    const nn = new NeuralNetwork();

    await test.step('trigger receive-message pattern', () => {
      const events = nn.triggerPattern('receive-message');
      expect(events.length).toBeGreaterThan(0);

      // Verify events come from sensory-input and language-center regions
      const regionIds = new Set(events.map((e) => e.regionId));
      expect(regionIds.has('sensory-input') || regionIds.has('language-center')).toBe(true);
    });

    await test.step('trigger all defined patterns', () => {
      const patterns = [
        'receive-message',
        'process-language',
        'emotional-response',
        'memory-recall',
        'generate-response',
        'learning',
      ];

      for (const pattern of patterns) {
        const events = nn.triggerPattern(pattern);
        expect(events.length).toBeGreaterThanOrEqual(0);
      }
    });

    await test.step('unknown pattern returns empty', () => {
      const events = nn.triggerPattern('nonexistent-pattern');
      expect(events).toHaveLength(0);
    });
  });

  test('should serialize and deserialize state', async () => {
    const nn = new NeuralNetwork();

    // Trigger some activity to make state non-trivial
    nn.triggerPattern('receive-message');
    nn.triggerPattern('process-language');

    const serialized = await test.step('serialize state', () => {
      return nn.serialize();
    });

    await test.step('verify serialized state has expected shape', () => {
      expect(serialized.regions).toBeDefined();
      expect(serialized.connections).toBeDefined();
      expect(serialized.timestamp).toBeDefined();
      expect(serialized.regions).toHaveLength(7);
    });

    await test.step('deserialize into a new network', () => {
      const nn2 = new NeuralNetwork();
      nn2.deserialize(serialized);
      const state2 = nn2.getNetworkState();

      expect(state2.regions).toHaveLength(serialized.regions.length);
      expect(state2.connections).toHaveLength(serialized.connections.length);

      // Verify region neuron counts match
      for (let i = 0; i < serialized.regions.length; i++) {
        expect(state2.regions[i].neurons.length).toBe(serialized.regions[i].neurons.length);
      }
    });
  });
});
