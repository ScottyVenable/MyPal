/**
 * @module @mypal/ai-engine/types
 * Core type definitions for the MyPal AI Processing Engine.
 */

// ---------------------------------------------------------------------------
// Neural Types
// ---------------------------------------------------------------------------

/** A single neuron within a neural region. */
export interface Neuron {
  /** Unique identifier for this neuron. */
  id: string;
  /** The region this neuron belongs to. */
  regionId: string;
  /** Whether this neuron excites or inhibits connected neurons. */
  type: 'excitatory' | 'inhibitory';
  /** Stimulus level required to fire (0–1). */
  activationThreshold: number;
  /** Current activation level (0–1). */
  currentActivation: number;
  /** Baseline activation when not stimulated. */
  restingPotential: number;
  /** Outgoing connections to other neurons. */
  connections: NeuronConnection[];
  /** Timestamps of recent firings. */
  firingHistory: number[];
  /** Arbitrary extra data. */
  metadata: Record<string, unknown>;
}

/** A lightweight outgoing connection stored on a {@link Neuron}. */
export interface NeuronConnection {
  /** Target neuron id. */
  targetId: string;
  /** Connection strength (0–1). */
  weight: number;
  /** Signal propagation delay in milliseconds. */
  latency: number;
}

/** A logical grouping of neurons (brain region). */
export interface NeuralRegion {
  /** Unique identifier for this region. */
  id: string;
  /** Human-readable region name. */
  name: string;
  /** Neurons belonging to this region. */
  neurons: Neuron[];
  /** Description of the region's purpose. */
  description: string;
}

/** A directed, weighted connection between two neurons. */
export interface NeuralConnection {
  /** Source neuron id. */
  sourceId: string;
  /** Target neuron id. */
  targetId: string;
  /** Connection strength (0–1). */
  weight: number;
  /** Signal propagation delay in milliseconds. */
  latency: number;
  /** Historical weight values for tracking plasticity. */
  strengthHistory: Array<{ timestamp: number; weight: number }>;
}

// ---------------------------------------------------------------------------
// Memory Types
// ---------------------------------------------------------------------------

/** Categories of memory based on duration and purpose. */
export enum MemoryType {
  Ephemeral = 'ephemeral',
  ShortTerm = 'short-term',
  LongTerm = 'long-term',
  Episodic = 'episodic',
}

/** A stored memory unit. */
export interface Memory {
  /** Unique identifier. */
  id: string;
  /** Memory category. */
  type: MemoryType;
  /** Full textual content. */
  content: string;
  /** Brief summary of the memory. */
  summary: string;
  /** Emotional valence (−1 negative … +1 positive). */
  sentiment: number;
  /** Relevant keywords for retrieval. */
  keywords: string[];
  /** How important this memory is (0–1). */
  importance: number;
  /** Creation timestamp (epoch ms). */
  createdAt: number;
  /** Last time this memory was retrieved (epoch ms). */
  lastAccessedAt: number;
  /** Number of times this memory has been retrieved. */
  accessCount: number;
  /** Neuron ids associated with this memory. */
  relatedNeuronIds: string[];
  /** Ids of other memories related to this one. */
  relatedMemoryIds: string[];
}

// ---------------------------------------------------------------------------
// Evolution Types
// ---------------------------------------------------------------------------

/** Trait values that define cognitive characteristics at a given stage. */
export interface StageCharacteristics {
  curiosity: number;
  vocabulary: number;
  empathy: number;
  logic: number;
  creativity: number;
}

/** A developmental evolution stage. */
export interface EvolutionStage {
  /** Unique identifier. */
  id: string;
  /** Human-readable stage name. */
  name: string;
  /** Numeric level of this stage. */
  level: number;
  /** Trait values for this stage. */
  characteristics: StageCharacteristics;
  /** Description of cognitive abilities at this stage. */
  description: string;
}

// ---------------------------------------------------------------------------
// Processing Types
// ---------------------------------------------------------------------------

/** The result of analysing raw user input. */
export interface ProcessedInput {
  /** The original user text. */
  originalText: string;
  /** Sentiment analysis result. */
  sentiment: { score: number; label: string };
  /** Detected topics. */
  topics: string[];
  /** Detected named entities. */
  entities: string[];
  /** Calculated importance (0–1). */
  importance: number;
  /** Suggested memory classification. */
  memoryClassification: MemoryType;
  /** Neurons that may be relevant. */
  connectionSuggestions: Array<{ neuronId: string; relevance: number }>;
}

// ---------------------------------------------------------------------------
// LM Server Types
// ---------------------------------------------------------------------------

/** Configuration for connecting to an external language model server. */
export interface LMServerConfig {
  /** Base URL of the LM server (e.g. "http://localhost:11434"). */
  endpoint: string;
  /** Optional API key for authenticated endpoints. */
  apiKey?: string;
  /** Model identifier to use. */
  model: string;
  /** Maximum tokens to generate. */
  maxTokens: number;
  /** Sampling temperature (0–2). */
  temperature: number;
  /** Request timeout in milliseconds. */
  timeout: number;
}

// ---------------------------------------------------------------------------
// Event Types
// ---------------------------------------------------------------------------

/** An event emitted by the neural network during processing. */
export interface NeuralEvent {
  /** Category of neural event. */
  type: string;
  /** The neuron that triggered the event. */
  neuronId: string;
  /** The region the neuron belongs to. */
  regionId: string;
  /** Activation level at the time of the event. */
  activation: number;
  /** Epoch ms timestamp. */
  timestamp: number;
  /** Additional event data. */
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Response Types
// ---------------------------------------------------------------------------

/** The full response returned by the AI processing pipeline. */
export interface AIResponse {
  /** Generated response text. */
  text: string;
  /** Analysis of the user's input. */
  processedInput: ProcessedInput;
  /** Memories that influenced the response. */
  memoriesUsed: Memory[];
  /** Neural events that occurred during processing. */
  neuralActivations: NeuralEvent[];
  /** Current evolution state snapshot. */
  evolutionState: EvolutionStage;
}
