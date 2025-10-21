// XP and level progression utilities
export const LEVEL_THRESHOLDS = [
  100,   // Level 0 → 1
  400,   // Level 1 → 2
  1000,  // Level 2 → 3
  2000,  // Level 3 → 4
  3500,  // Level 4 → 5
  5500,  // Level 5 → 6
  8000,  // Level 6 → 7
  11000, // Level 7 → 8
  14500, // Level 8 → 9
  18500, // Level 9 → 10
  23000, // Level 10 → 11
  28000, // Level 11 → 12
  33500, // Level 12 → 13
  39500, // Level 13 → 14
  46000, // Level 14 → 15
];

export function thresholdsFor(level) {
  if (level < 0) return LEVEL_THRESHOLDS[0];
  if (level < LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[level];
  const base = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const extraLevels = level - (LEVEL_THRESHOLDS.length - 1);
  return base + extraLevels * 6000;
}

export function addXp(state, rawXp) {
  const mult = state?.settings?.xpMultiplier ?? 1;
  const gained = Math.floor(rawXp * mult);
  if (!Number.isFinite(state.xp)) state.xp = 0;
  if (!Number.isFinite(state.level) || state.level < 0) state.level = 0;
  state.xp += gained;
  state.cp = Math.floor(state.xp / 100);
  while (state.xp >= thresholdsFor(state.level)) {
    state.level += 1;
  }
  return gained;
}

export function normalizeProgress(state) {
  if (!state || typeof state !== 'object') return state;
  if (typeof state.xp !== 'number' || Number.isNaN(state.xp)) state.xp = 0;
  if (typeof state.level !== 'number' || Number.isNaN(state.level)) state.level = 0;
  if (state.level < 0) state.level = 0;
  while (state.level > 0 && state.xp < (state.level > 0 ? thresholdsFor(state.level - 1) : 0)) {
    state.level -= 1;
  }
  while (state.xp >= thresholdsFor(state.level)) {
    state.level += 1;
  }
  state.cp = Math.floor(state.xp / 100);
  return state;
}

export function progressToNextLevel(level, xp) {
  const nextThreshold = thresholdsFor(level);
  const previousThreshold = level > 0 ? thresholdsFor(level - 1) : 0;
  const xpForCurrentLevel = xp - previousThreshold;
  const xpNeededForNextLevel = nextThreshold - previousThreshold;
  const xpRemaining = Math.max(0, nextThreshold - xp);
  const progressPercent = Math.min(100, Math.max(0, (xpForCurrentLevel / xpNeededForNextLevel) * 100));

  return {
    nextThreshold,
    previousThreshold,
    xpForCurrentLevel,
    xpNeededForNextLevel,
    xpRemaining,
    progressPercent,
  };
}
