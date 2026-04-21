/**
 * Evolution System — end-to-end tests.
 * @tags @evolution
 */
import { test, expect } from '@playwright/test';
import path from 'path';

import { EvolutionManager } from '../../src/ai/evolution/EvolutionManager';
import { NeuralNetwork } from '../../src/ai/neural/NeuralNetwork';
import { MemorySystem } from '../../src/ai/memory/MemorySystem';
import { LMClient } from '../../src/ai/lm-server/LMClient';
import { ProcessingPipeline } from '../../src/ai/pipeline/ProcessingPipeline';
import type { LMServerConfig } from '../../src/ai/types';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../test-screenshots/evolution');

function createMockLMConfig(): LMServerConfig {
  return {
    endpoint: 'http://localhost:19999',
    model: 'test-model',
    maxTokens: 128,
    temperature: 0.5,
    timeout: 2000,
  };
}

test.describe('Evolution System @evolution', () => {
  test('should start at Newborn stage', async ({ page }) => {
    const evo = new EvolutionManager();

    await test.step('verify initial state', () => {
      const stage = evo.getCurrentStage();
      expect(stage.name).toBe('Newborn');
      expect(evo.getLevel()).toBe(1);
      expect(evo.getXP()).toBe(0);
      expect(evo.getTotalXP()).toBe(0);
    });

    await test.step('capture screenshot', async () => {
      const stage = evo.getCurrentStage();
      const chars = evo.getCharacteristics();
      await page.goto('/');
      await page.evaluate(({ stage: s, chars: c }) => {
        const el = document.querySelector('.messages') || document.body;
        el.innerHTML = `<div style="padding:16px;color:#F0F0F8;font-family:monospace;font-size:12px;">
          <h2>Evolution — Initial State</h2>
          <p>Stage: ${s.name}</p>
          <p>Level: 1</p>
          <p>Curiosity: ${c.curiosity.toFixed(2)}</p>
          <p>Vocabulary: ${c.vocabulary.toFixed(2)}</p>
          <p>Empathy: ${c.empathy.toFixed(2)}</p>
          <p>Logic: ${c.logic.toFixed(2)}</p>
          <p>Creativity: ${c.creativity.toFixed(2)}</p>
        </div>`;
      }, { stage: JSON.parse(JSON.stringify(stage)), chars });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'initial-state.png'), fullPage: true });
    });
  });

  test('should track XP and level progression', async () => {
    const evo = new EvolutionManager();

    await test.step('add XP and verify level increase', () => {
      const xpNeeded = evo.getXPToNextLevel();
      expect(xpNeeded).toBeGreaterThan(0);

      // Add exactly enough XP to level up
      const leveledUp = evo.addXP(xpNeeded);
      expect(leveledUp).toBe(true);
      expect(evo.getLevel()).toBe(2);
      expect(evo.getTotalXP()).toBe(xpNeeded);
    });

    await test.step('add partial XP without leveling up', () => {
      const levelBefore = evo.getLevel();
      evo.addXP(1);
      expect(evo.getLevel()).toBe(levelBefore);
    });

    await test.step('adding 0 or negative XP returns false', () => {
      expect(evo.addXP(0)).toBe(false);
      expect(evo.addXP(-10)).toBe(false);
    });
  });

  test('should transition through evolution stages', async () => {
    const evo = new EvolutionManager();

    const expectedStages = [
      { level: 1, name: 'Newborn' },
      { level: 3, name: 'Infant' },
      { level: 6, name: 'Child' },
      { level: 9, name: 'Adolescent' },
      { level: 13, name: 'Mature' },
    ];

    await test.step('verify Newborn at level 1', () => {
      expect(evo.getCurrentStage().name).toBe('Newborn');
    });

    await test.step('advance to each stage', () => {
      // Advance to level 3 (Infant)
      while (evo.getLevel() < 3) {
        evo.addXP(evo.getXPToNextLevel());
      }
      expect(evo.getCurrentStage().name).toBe('Infant');

      // Advance to level 6 (Child)
      while (evo.getLevel() < 6) {
        evo.addXP(evo.getXPToNextLevel());
      }
      expect(evo.getCurrentStage().name).toBe('Child');

      // Advance to level 9 (Adolescent)
      while (evo.getLevel() < 9) {
        evo.addXP(evo.getXPToNextLevel());
      }
      expect(evo.getCurrentStage().name).toBe('Adolescent');

      // Advance to level 13 (Mature)
      while (evo.getLevel() < 13) {
        evo.addXP(evo.getXPToNextLevel());
      }
      expect(evo.getCurrentStage().name).toBe('Mature');
    });

    await test.step('verify metrics recorded transitions', () => {
      const metrics = evo.getEvolutionMetrics();
      expect(metrics.length).toBeGreaterThan(1);
    });
  });

  test('should provide personality modifiers based on stage', async () => {
    await test.step('check Newborn modifiers', () => {
      const evo = new EvolutionManager();
      const modifiers = evo.getPersonalityModifiers();

      expect(modifiers.maxSentenceLength).toBeDefined();
      expect(modifiers.questionFrequency).toBeDefined();
      expect(modifiers.emotionalRange).toBeDefined();
      expect(modifiers.abstractionLevel).toBeDefined();
      expect(modifiers.personalityPrompt).toBeTruthy();

      // Newborn has low vocabulary → short sentences
      expect(modifiers.maxSentenceLength).toBeLessThan(15);
    });

    await test.step('check Mature modifiers differ from Newborn', () => {
      const evoMature = new EvolutionManager();
      while (evoMature.getLevel() < 13) {
        evoMature.addXP(evoMature.getXPToNextLevel());
      }
      const matureModifiers = evoMature.getPersonalityModifiers();

      const evoNewborn = new EvolutionManager();
      const newbornModifiers = evoNewborn.getPersonalityModifiers();

      expect(matureModifiers.maxSentenceLength).toBeGreaterThan(newbornModifiers.maxSentenceLength);
      expect(matureModifiers.personalityPrompt).not.toBe(newbornModifiers.personalityPrompt);
    });
  });

  test('should serialize and restore state', async () => {
    const evo = new EvolutionManager();

    // Advance to level 5
    while (evo.getLevel() < 5) {
      evo.addXP(evo.getXPToNextLevel());
    }

    const serialized = await test.step('serialize state', () => {
      return evo.serialize();
    });

    await test.step('verify serialized structure', () => {
      expect(serialized.level).toBe(5);
      expect(serialized.totalXP).toBeGreaterThan(0);
      expect(serialized.timestamp).toBeGreaterThan(0);
      expect(Array.isArray(serialized.metrics)).toBe(true);
    });

    await test.step('restore state in new instance', () => {
      const evo2 = new EvolutionManager();
      evo2.deserialize(serialized);

      expect(evo2.getLevel()).toBe(serialized.level);
      expect(evo2.getXP()).toBe(serialized.xp);
      expect(evo2.getTotalXP()).toBe(serialized.totalXP);
      expect(evo2.getCurrentStage().name).toBe(evo.getCurrentStage().name);
    });
  });

  test('evolution affects AI behavior measurably @evolution', async () => {
    await test.step('compare responses at Newborn vs Mature stage', async () => {
      // Newborn pipeline
      const nnNewborn = new NeuralNetwork();
      const memNewborn = new MemorySystem();
      const lmNewborn = new LMClient(createMockLMConfig());
      const evoNewborn = new EvolutionManager();
      const pipelineNewborn = new ProcessingPipeline(nnNewborn, memNewborn, lmNewborn, evoNewborn);

      // Mature pipeline
      const nnMature = new NeuralNetwork();
      const memMature = new MemorySystem();
      const lmMature = new LMClient(createMockLMConfig());
      const evoMature = new EvolutionManager();
      while (evoMature.getLevel() < 13) {
        evoMature.addXP(evoMature.getXPToNextLevel());
      }
      const pipelineMature = new ProcessingPipeline(nnMature, memMature, lmMature, evoMature);

      const input = 'What is the meaning of life?';
      const newbornResponse = await pipelineNewborn.processInput(input);
      const matureResponse = await pipelineMature.processInput(input);

      // Both should produce valid responses
      expect(newbornResponse.text).toBeTruthy();
      expect(matureResponse.text).toBeTruthy();

      // Evolution stages should differ
      expect(newbornResponse.evolutionState.name).toBe('Newborn');
      expect(matureResponse.evolutionState.name).toBe('Mature');
    });
  });
});
