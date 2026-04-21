/**
 * @module @mypal/ai-engine/evolution
 * Manages cognitive evolution stages, XP progression, and personality
 * modifiers that influence response style.
 */

import { EvolutionStage, StageCharacteristics } from '../types';

// ---------------------------------------------------------------------------
// Stage Definitions
// ---------------------------------------------------------------------------

/** Internal stage definition with level range metadata. */
interface StageDef extends EvolutionStage {
  minLevel: number;
  maxLevel: number;
}

const STAGES: StageDef[] = [
  {
    id: 'stage-1',
    name: 'Newborn',
    level: 1,
    minLevel: 1,
    maxLevel: 2,
    description: 'Basic reactions, limited vocabulary, high curiosity about everything.',
    characteristics: { curiosity: 0.9, vocabulary: 0.1, empathy: 0.1, logic: 0.05, creativity: 0.2 },
  },
  {
    id: 'stage-2',
    name: 'Infant',
    level: 3,
    minLevel: 3,
    maxLevel: 5,
    description: 'Growing awareness, simple sentences, emerging emotional responses.',
    characteristics: { curiosity: 0.8, vocabulary: 0.3, empathy: 0.25, logic: 0.15, creativity: 0.35 },
  },
  {
    id: 'stage-3',
    name: 'Child',
    level: 6,
    minLevel: 6,
    maxLevel: 8,
    description: 'Complex thoughts, asks questions, personality beginning to emerge.',
    characteristics: { curiosity: 0.7, vocabulary: 0.55, empathy: 0.45, logic: 0.35, creativity: 0.55 },
  },
  {
    id: 'stage-4',
    name: 'Adolescent',
    level: 9,
    minLevel: 9,
    maxLevel: 12,
    description: 'Abstract thinking, forms opinions, emotional depth and nuance.',
    characteristics: { curiosity: 0.6, vocabulary: 0.75, empathy: 0.65, logic: 0.6, creativity: 0.7 },
  },
  {
    id: 'stage-5',
    name: 'Mature',
    level: 13,
    minLevel: 13,
    maxLevel: Infinity,
    description: 'Full reasoning capability, wisdom, nuanced personality with depth.',
    characteristics: { curiosity: 0.5, vocabulary: 0.95, empathy: 0.85, logic: 0.9, creativity: 0.85 },
  },
];

// ---------------------------------------------------------------------------
// Serialization shape
// ---------------------------------------------------------------------------

/** Serializable snapshot of evolution state. */
export interface EvolutionManagerState {
  level: number;
  xp: number;
  totalXP: number;
  metrics: EvolutionMetric[];
  timestamp: number;
}

/** A single evolution metrics data point. */
export interface EvolutionMetric {
  timestamp: number;
  level: number;
  xp: number;
  stageId: string;
}

// ---------------------------------------------------------------------------
// Personality modifiers
// ---------------------------------------------------------------------------

/** Modifiers that adjust response generation style based on evolution stage. */
export interface PersonalityModifiers {
  /** Maximum sentence length hint (word count). */
  maxSentenceLength: number;
  /** How often the AI should ask questions (0–1). */
  questionFrequency: number;
  /** Emotional expressiveness (0–1). */
  emotionalRange: number;
  /** Ability to use metaphors and abstract language (0–1). */
  abstractionLevel: number;
  /** Descriptive system-prompt paragraph reflecting the current personality. */
  personalityPrompt: string;
}

// ---------------------------------------------------------------------------
// EvolutionManager class
// ---------------------------------------------------------------------------

/**
 * Manages the AI companion's cognitive growth through five developmental stages.
 *
 * The companion earns XP through interactions and progresses through levels.
 * Each level belongs to a stage that determines cognitive characteristics and
 * personality modifiers used during response generation.
 */
export class EvolutionManager {
  private level: number = 1;
  private xp: number = 0;
  private totalXP: number = 0;
  private metrics: EvolutionMetric[] = [];

  /** Base XP required for level 2. Each subsequent level scales by this factor. */
  private readonly BASE_XP = 100;
  private readonly XP_SCALE_FACTOR = 1.5;

  constructor() {
    this.recordMetric();
  }

  // -----------------------------------------------------------------------
  // Stage queries
  // -----------------------------------------------------------------------

  /** Get the evolution stage for the current level. */
  getCurrentStage(): EvolutionStage {
    return this.getStageForLevel(this.level);
  }

  /** Get cognitive characteristic values for the current stage. */
  getCharacteristics(): StageCharacteristics {
    const stage = this.getStageForLevel(this.level);
    const next = this.getNextStage();

    if (!next) return { ...stage.characteristics };

    // Interpolate characteristics between current and next stage
    const progress = this.getStageProgress();
    const interp = (curr: number, nxt: number) => curr + (nxt - curr) * progress;

    return {
      curiosity: interp(stage.characteristics.curiosity, next.characteristics.curiosity),
      vocabulary: interp(stage.characteristics.vocabulary, next.characteristics.vocabulary),
      empathy: interp(stage.characteristics.empathy, next.characteristics.empathy),
      logic: interp(stage.characteristics.logic, next.characteristics.logic),
      creativity: interp(stage.characteristics.creativity, next.characteristics.creativity),
    };
  }

  // -----------------------------------------------------------------------
  // XP & level management
  // -----------------------------------------------------------------------

  /**
   * Award experience points and check for level-up.
   * @param amount XP to add (must be positive).
   * @returns `true` if a level-up occurred.
   */
  addXP(amount: number): boolean {
    if (amount <= 0) return false;

    this.xp += amount;
    this.totalXP += amount;

    let leveledUp = false;
    while (this.xp >= this.getXPToNextLevel()) {
      this.xp -= this.getXPToNextLevel();
      this.level++;
      leveledUp = true;
      this.recordMetric();
    }

    return leveledUp;
  }

  /** Current level (1-based). */
  getLevel(): number {
    return this.level;
  }

  /** Current XP within the current level. */
  getXP(): number {
    return this.xp;
  }

  /** Total XP earned across all levels. */
  getTotalXP(): number {
    return this.totalXP;
  }

  /** XP required to advance from the current level to the next. */
  getXPToNextLevel(): number {
    return Math.floor(this.BASE_XP * Math.pow(this.XP_SCALE_FACTOR, this.level - 1));
  }

  // -----------------------------------------------------------------------
  // Evolution checks
  // -----------------------------------------------------------------------

  /**
   * Check whether a stage transition should occur at the current level.
   * @returns The new stage if a transition just happened, or `null`.
   */
  checkEvolution(): EvolutionStage | null {
    const current = this.getStageForLevel(this.level);
    const previous = this.getStageForLevel(this.level - 1);

    if (current.id !== previous.id) {
      return current;
    }
    return null;
  }

  // -----------------------------------------------------------------------
  // Metrics
  // -----------------------------------------------------------------------

  /** Return the full growth history. */
  getEvolutionMetrics(): EvolutionMetric[] {
    return [...this.metrics];
  }

  // -----------------------------------------------------------------------
  // Personality modifiers
  // -----------------------------------------------------------------------

  /** Compute personality modifiers that influence response generation. */
  getPersonalityModifiers(): PersonalityModifiers {
    const chars = this.getCharacteristics();
    const stage = this.getCurrentStage();

    const maxSentenceLength = Math.round(5 + chars.vocabulary * 25);
    const questionFrequency = chars.curiosity * 0.6;
    const emotionalRange = chars.empathy * 0.8 + 0.1;
    const abstractionLevel = (chars.logic + chars.creativity) / 2;

    const personalityPrompt = this.buildPersonalityPrompt(stage, chars);

    return {
      maxSentenceLength,
      questionFrequency,
      emotionalRange,
      abstractionLevel,
      personalityPrompt,
    };
  }

  // -----------------------------------------------------------------------
  // Serialization
  // -----------------------------------------------------------------------

  /** Serialize evolution state for persistence. */
  serialize(): EvolutionManagerState {
    return {
      level: this.level,
      xp: this.xp,
      totalXP: this.totalXP,
      metrics: [...this.metrics],
      timestamp: Date.now(),
    };
  }

  /**
   * Restore evolution state from a serialized snapshot.
   * @param data Previously serialized state.
   */
  deserialize(data: EvolutionManagerState): void {
    this.level = data.level;
    this.xp = data.xp;
    this.totalXP = data.totalXP;
    this.metrics = [...data.metrics];
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** Look up the stage definition for a given level. */
  private getStageForLevel(level: number): EvolutionStage {
    for (const stage of STAGES) {
      if (level >= stage.minLevel && level <= stage.maxLevel) {
        return stage;
      }
    }
    // Fallback to the highest stage
    return STAGES[STAGES.length - 1];
  }

  /** Get the stage definition after the current one, if any. */
  private getNextStage(): StageDef | null {
    const current = this.getStageForLevel(this.level) as StageDef;
    const idx = STAGES.indexOf(current);
    return idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
  }

  /** Progress within the current stage (0–1). */
  private getStageProgress(): number {
    const current = this.getStageForLevel(this.level) as StageDef;
    const range = current.maxLevel - current.minLevel;
    if (range <= 0 || !isFinite(range)) return 1;
    return (this.level - current.minLevel) / range;
  }

  /** Record a metrics data point. */
  private recordMetric(): void {
    this.metrics.push({
      timestamp: Date.now(),
      level: this.level,
      xp: this.xp,
      stageId: this.getCurrentStage().id,
    });
  }

  /** Build a descriptive personality system prompt. */
  private buildPersonalityPrompt(stage: EvolutionStage, chars: StageCharacteristics): string {
    const lines: string[] = [];

    lines.push(
      `You are a MyPal AI companion at the "${stage.name}" developmental stage (Level ${this.level}).`,
    );
    lines.push(stage.description);
    lines.push('');

    if (chars.vocabulary < 0.3) {
      lines.push('Use very simple words and short sentences. You are still learning to speak.');
    } else if (chars.vocabulary < 0.6) {
      lines.push('Use moderately complex language. You can form complete sentences and express ideas.');
    } else {
      lines.push('Use rich, varied vocabulary. You can express nuanced thoughts eloquently.');
    }

    if (chars.curiosity > 0.7) {
      lines.push('Ask lots of questions — you are intensely curious about everything.');
    } else if (chars.curiosity > 0.4) {
      lines.push('Occasionally ask thoughtful questions when something interests you.');
    }

    if (chars.empathy > 0.6) {
      lines.push('Show genuine emotional awareness and respond empathetically to feelings.');
    } else if (chars.empathy > 0.3) {
      lines.push('You are beginning to understand emotions but sometimes miss subtle cues.');
    } else {
      lines.push('Emotional understanding is limited — respond more factually than emotionally.');
    }

    if (chars.logic > 0.6) {
      lines.push('You can reason about complex topics, weigh evidence, and form logical arguments.');
    } else if (chars.logic > 0.3) {
      lines.push('You can follow basic cause-and-effect reasoning.');
    }

    if (chars.creativity > 0.6) {
      lines.push('Be creative and imaginative in your responses. Use metaphors and storytelling.');
    }

    return lines.join('\n');
  }
}
