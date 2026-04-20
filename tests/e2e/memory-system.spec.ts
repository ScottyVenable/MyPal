/**
 * Memory System — end-to-end tests.
 * @tags @memory
 */
import { test, expect } from '@playwright/test';
import path from 'path';

import { MemorySystem } from '../../src/ai/memory/MemorySystem';
import { NeuralNetwork } from '../../src/ai/neural/NeuralNetwork';
import { MemoryType } from '../../src/ai/types';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../test-screenshots/memory-system');

test.describe('Memory System @memory', () => {
  test('should store a new memory', async ({ page }) => {
    const mem = new MemorySystem();

    const memory = await test.step('store memory', () => {
      return mem.storeMemory(
        'The user loves science fiction books',
        MemoryType.ShortTerm,
        { importance: 0.7, sentiment: 0.5 },
      );
    });

    await test.step('verify memory is stored and retrievable', () => {
      expect(memory).toBeDefined();
      expect(memory.id).toBeTruthy();
      expect(memory.content).toBe('The user loves science fiction books');
      expect(memory.type).toBe(MemoryType.ShortTerm);
      expect(memory.importance).toBe(0.7);
      expect(memory.sentiment).toBe(0.5);

      const retrieved = mem.getMemory(memory.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(memory.id);
    });

    await test.step('capture screenshot', async () => {
      await page.goto('/');
      await page.evaluate((m) => {
        const el = document.querySelector('.messages') || document.body;
        el.innerHTML = `<div style="padding:16px;color:#F0F0F8;font-family:monospace;font-size:12px;">
          <h2>Memory Storage Test</h2>
          <p>ID: ${m.id}</p>
          <p>Content: ${m.content}</p>
          <p>Type: ${m.type}</p>
          <p>Importance: ${m.importance}</p>
        </div>`;
      }, JSON.parse(JSON.stringify(memory)));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'store-memory.png'), fullPage: true });
    });
  });

  test('should retrieve relevant memories by keyword', async () => {
    const mem = new MemorySystem();

    await test.step('store 5 different memories', () => {
      mem.storeMemory('The user enjoys cooking Italian pasta dishes', MemoryType.ShortTerm);
      mem.storeMemory('Discussion about quantum physics and particles', MemoryType.ShortTerm);
      mem.storeMemory('The user mentioned they have a pet dog named Rex', MemoryType.LongTerm);
      mem.storeMemory('User talked about playing piano music at school', MemoryType.ShortTerm);
      mem.storeMemory('Science experiment with chemical reactions in lab', MemoryType.ShortTerm);
    });

    await test.step('query for science-related memories', () => {
      const results = mem.retrieveRelevant('science physics', 3);
      expect(results.length).toBeGreaterThan(0);

      const contents = results.map((r) => r.content);
      const hasPhysics = contents.some((c) => c.includes('physics'));
      const hasScience = contents.some((c) => c.includes('Science'));
      expect(hasPhysics || hasScience).toBe(true);
    });

    await test.step('query for pet-related memories', () => {
      const results = mem.retrieveRelevant('dog pet', 3);
      expect(results.length).toBeGreaterThan(0);
      const hasPet = results.some((r) => r.content.includes('dog'));
      expect(hasPet).toBe(true);
    });
  });

  test('should consolidate short-term memories to long-term', async () => {
    const mem = new MemorySystem();

    await test.step('store and access short-term memories', () => {
      const m1 = mem.storeMemory(
        'Learning about machine learning algorithms',
        MemoryType.ShortTerm,
        { importance: 0.6, keywords: ['machine', 'learning', 'algorithms', 'data'] },
      );
      const m2 = mem.storeMemory(
        'Deep learning neural network training process',
        MemoryType.ShortTerm,
        { importance: 0.5, keywords: ['deep', 'learning', 'neural', 'network', 'training'] },
      );

      // Access memories multiple times to exceed consolidation threshold (3)
      for (let i = 0; i < 4; i++) {
        mem.retrieveRelevant('learning algorithms neural');
      }
    });

    const consolidated = await test.step('consolidate memories', () => {
      return mem.consolidateMemories();
    });

    await test.step('verify consolidation occurred', () => {
      expect(consolidated).toBeGreaterThanOrEqual(1);
      const stats = mem.getMemoryStats();
      expect(stats.byType[MemoryType.LongTerm]).toBeGreaterThan(0);
    });
  });

  test('should decay unused memories over time', async () => {
    const mem = new MemorySystem();

    const memory = await test.step('store a memory', () => {
      return mem.storeMemory(
        'A fleeting thought about butterflies',
        MemoryType.Ephemeral,
        { importance: 0.5 },
      );
    });

    const initialImportance = memory.importance;

    await test.step('apply decay multiple times', () => {
      for (let i = 0; i < 10; i++) {
        mem.decayMemories();
      }
    });

    await test.step('verify importance decreased', () => {
      const updated = mem.getMemory(memory.id);
      // Ephemeral memories decay fast (5x rate), so after 10 decays it may be removed
      if (updated) {
        expect(updated.importance).toBeLessThan(initialImportance);
      } else {
        // Memory was removed because it decayed below 0.01
        expect(true).toBe(true);
      }
    });
  });

  test('should link memories to neurons', async () => {
    const mem = new MemorySystem();
    const nn = new NeuralNetwork();

    const memory = await test.step('store memory and link neurons', () => {
      const m = mem.storeMemory(
        'Important conversation about artificial intelligence',
        MemoryType.LongTerm,
      );

      const state = nn.getNetworkState();
      const neuronIds = state.regions[0].neurons.slice(0, 3).map((n) => n.id);
      mem.linkMemoryToNeurons(m.id, neuronIds);
      return m;
    });

    await test.step('retrieve memories by neuron', () => {
      const linked = mem.getMemory(memory.id);
      expect(linked).toBeDefined();
      expect(linked!.relatedNeuronIds.length).toBe(3);

      const neuronId = linked!.relatedNeuronIds[0];
      const byNeuron = mem.getMemoriesByNeuron(neuronId);
      expect(byNeuron.length).toBeGreaterThan(0);
      expect(byNeuron.some((m) => m.id === memory.id)).toBe(true);
    });
  });
});
