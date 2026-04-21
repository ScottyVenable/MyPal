/**
 * @module @mypal/ai-engine
 * Public API surface for the MyPal AI Processing Engine.
 *
 * @example
 * ```ts
 * import {
 *   NeuralNetwork,
 *   MemorySystem,
 *   LMClient,
 *   EvolutionManager,
 *   ProcessingPipeline,
 * } from '@mypal/ai-engine';
 *
 * const nn = new NeuralNetwork();
 * const mem = new MemorySystem();
 * const lm = new LMClient({ endpoint: 'http://localhost:11434', model: 'llama3', maxTokens: 512, temperature: 0.7, timeout: 30000 });
 * const evo = new EvolutionManager();
 * const pipeline = new ProcessingPipeline(nn, mem, lm, evo);
 *
 * const response = await pipeline.processInput('Hello!');
 * console.log(response.text);
 * ```
 */

// --- Core type definitions ---
export {
  Neuron,
  NeuronConnection,
  NeuralRegion,
  NeuralConnection,
  MemoryType,
  Memory,
  StageCharacteristics,
  EvolutionStage,
  ProcessedInput,
  LMServerConfig,
  NeuralEvent,
  AIResponse,
} from './types';

// --- Neural network ---
export { NeuralNetwork } from './neural/NeuralNetwork';
export type { NeuralNetworkState, NeuralEventCallback } from './neural/NeuralNetwork';

// --- Memory system ---
export { MemorySystem } from './memory/MemorySystem';
export type { MemorySystemState } from './memory/MemorySystem';

// --- Language model client ---
export { LMClient } from './lm-server/LMClient';
export type { GenerateOptions, LMServerStatus } from './lm-server/LMClient';

// --- Evolution manager ---
export { EvolutionManager } from './evolution/EvolutionManager';
export type {
  EvolutionManagerState,
  EvolutionMetric,
  PersonalityModifiers,
} from './evolution/EvolutionManager';

// --- Processing pipeline ---
export { ProcessingPipeline } from './pipeline/ProcessingPipeline';
