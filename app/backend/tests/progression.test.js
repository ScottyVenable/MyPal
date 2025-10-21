import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { addXp, normalizeProgress, progressToNextLevel, thresholdsFor } from '../src/progression.js';

describe('progression thresholds', () => {
  it('returns predefined thresholds for early levels', () => {
    assert.equal(thresholdsFor(0), 100);
    assert.equal(thresholdsFor(1), 400);
    assert.equal(thresholdsFor(2), 1000);
  });

  it('extends thresholds linearly after configured levels', () => {
    const base = thresholdsFor(14);
    assert.equal(base, 46000);
    assert.equal(thresholdsFor(15), base + 6000);
    assert.equal(thresholdsFor(17), base + 3 * 6000);
  });
});

describe('addXp', () => {
  it('increments xp and handles level ups', () => {
    const state = { xp: 95, level: 0, cp: 0, settings: { xpMultiplier: 1 } };
    const gained = addXp(state, 10);
    assert.equal(gained, 10);
    assert.equal(state.xp, 105);
    assert.equal(state.level, 1);
    assert.equal(state.cp, 1);
  });

  it('applies xp multipliers using floor semantics', () => {
    const state = { xp: 0, level: 0, cp: 0, settings: { xpMultiplier: 1.75 } };
    const gained = addXp(state, 8);
    assert.equal(gained, Math.floor(8 * 1.75));
    assert.equal(state.xp, gained);
    assert.equal(state.level, 0);
  });
});

describe('normalizeProgress', () => {
  it('resets invalid values and recalculates level and cp', () => {
    const state = { xp: NaN, level: -5, cp: 0 };
    normalizeProgress(state);
    assert.equal(state.xp, 0);
    assert.equal(state.level, 0);
    assert.equal(state.cp, 0);
  });

  it('reduces level when xp drops below threshold', () => {
    const state = { xp: 50, level: 2, cp: 0 };
    normalizeProgress(state);
    assert.equal(state.level, 0);
    assert.equal(state.cp, 0);
  });

  it('raises level when xp exceeds threshold', () => {
    const state = { xp: 2500, level: 1, cp: 0 };
    normalizeProgress(state);
    assert.equal(state.level, 4);
    assert.equal(state.cp, 25);
  });
});

describe('progressToNextLevel', () => {
  it('computes progress metrics for current level', () => {
    const result = progressToNextLevel(2, 750);
    assert.equal(result.previousThreshold, 400);
    assert.equal(result.nextThreshold, 1000);
    assert.equal(result.xpForCurrentLevel, 350);
    assert.equal(result.xpNeededForNextLevel, 600);
    assert.equal(result.xpRemaining, 250);
    assert.equal(Math.round(result.progressPercent), Math.round((350 / 600) * 100));
  });
});
