/**
 * @module @mypal/ai-engine/neural
 * Simulated neural network engine with region-based architecture,
 * Hebbian learning, and event-driven signal propagation.
 */

import {
  Neuron,
  NeuronConnection,
  NeuralRegion,
  NeuralConnection,
  NeuralEvent,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a random id without relying on Node.js `crypto`. */
function generateId(): string {
  const hex = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 24; i++) {
    id += hex[Math.floor(Math.random() * 16)];
  }
  return id;
}

/** Clamp a number between `min` and `max`. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ---------------------------------------------------------------------------
// Region Definitions
// ---------------------------------------------------------------------------

/** Blueprint for the seven canonical brain regions. */
interface RegionBlueprint {
  id: string;
  name: string;
  description: string;
  defaultNeuronCount: number;
}

const REGION_BLUEPRINTS: RegionBlueprint[] = [
  {
    id: 'sensory-input',
    name: 'Sensory Input',
    description: 'Receives and preprocesses incoming stimuli from the environment.',
    defaultNeuronCount: 12,
  },
  {
    id: 'language-center',
    name: 'Language Center',
    description: 'Processes linguistic input and output, handles grammar and semantics.',
    defaultNeuronCount: 15,
  },
  {
    id: 'association-cortex',
    name: 'Association Cortex',
    description: 'Forms associations between concepts, memories, and experiences.',
    defaultNeuronCount: 20,
  },
  {
    id: 'frontal-lobe',
    name: 'Frontal Lobe',
    description: 'Executive function, planning, decision-making, and personality expression.',
    defaultNeuronCount: 18,
  },
  {
    id: 'amygdala',
    name: 'Amygdala',
    description: 'Emotional processing, sentiment evaluation, and affective responses.',
    defaultNeuronCount: 10,
  },
  {
    id: 'memory-systems',
    name: 'Memory Systems',
    description: 'Encoding, storage, and retrieval of short-term and long-term memories.',
    defaultNeuronCount: 15,
  },
  {
    id: 'motor-output',
    name: 'Motor Output',
    description: 'Generates final responses and actions based on processed information.',
    defaultNeuronCount: 10,
  },
];

// ---------------------------------------------------------------------------
// Predefined neural firing patterns
// ---------------------------------------------------------------------------

interface PatternStep {
  regionId: string;
  neuronCount: number;
  activationRange: [number, number];
}

const PATTERNS: Record<string, PatternStep[]> = {
  'receive-message': [
    { regionId: 'sensory-input', neuronCount: 5, activationRange: [0.6, 0.9] },
    { regionId: 'language-center', neuronCount: 3, activationRange: [0.4, 0.7] },
  ],
  'process-language': [
    { regionId: 'language-center', neuronCount: 8, activationRange: [0.7, 1.0] },
    { regionId: 'association-cortex', neuronCount: 5, activationRange: [0.5, 0.8] },
  ],
  'emotional-response': [
    { regionId: 'amygdala', neuronCount: 6, activationRange: [0.6, 1.0] },
    { regionId: 'frontal-lobe', neuronCount: 3, activationRange: [0.3, 0.6] },
  ],
  'memory-recall': [
    { regionId: 'memory-systems', neuronCount: 7, activationRange: [0.5, 0.9] },
    { regionId: 'association-cortex', neuronCount: 4, activationRange: [0.4, 0.7] },
  ],
  'generate-response': [
    { regionId: 'frontal-lobe', neuronCount: 6, activationRange: [0.6, 0.9] },
    { regionId: 'language-center', neuronCount: 5, activationRange: [0.5, 0.8] },
    { regionId: 'motor-output', neuronCount: 4, activationRange: [0.7, 1.0] },
  ],
  learning: [
    { regionId: 'association-cortex', neuronCount: 8, activationRange: [0.6, 1.0] },
    { regionId: 'memory-systems', neuronCount: 6, activationRange: [0.5, 0.9] },
    { regionId: 'frontal-lobe', neuronCount: 4, activationRange: [0.4, 0.7] },
  ],
};

// ---------------------------------------------------------------------------
// Serialization shape
// ---------------------------------------------------------------------------

/** Serializable snapshot of the entire neural network. */
export interface NeuralNetworkState {
  regions: NeuralRegion[];
  connections: NeuralConnection[];
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Neural event callback type
// ---------------------------------------------------------------------------

/** Callback signature for neural event listeners. */
export type NeuralEventCallback = (event: NeuralEvent) => void;

// ---------------------------------------------------------------------------
// NeuralNetwork class
// ---------------------------------------------------------------------------

/**
 * Simulated neural network with region-based architecture.
 *
 * The network contains seven brain regions, each populated with configurable
 * numbers of excitatory and inhibitory neurons. Signal propagation follows
 * weighted connections with Hebbian-style plasticity.
 */
export class NeuralNetwork {
  private regions: Map<string, NeuralRegion> = new Map();
  private connections: Map<string, NeuralConnection> = new Map();
  private neuronIndex: Map<string, { neuron: Neuron; regionId: string }> = new Map();
  private eventListeners: NeuralEventCallback[] = [];

  /** Activation decay applied each processing tick. */
  private readonly DECAY_RATE = 0.05;
  /** Maximum number of firing-history entries retained per neuron. */
  private readonly MAX_HISTORY = 100;
  /** Maximum propagation depth to prevent runaway cascades. */
  private readonly MAX_PROPAGATION_DEPTH = 10;

  /**
   * Create a new NeuralNetwork.
   * @param regionNeuronCounts Optional map of regionId → neuron count overrides.
   */
  constructor(regionNeuronCounts?: Record<string, number>) {
    this.initializeRegions(regionNeuronCounts);
    this.createDefaultConnections();
  }

  // -----------------------------------------------------------------------
  // Initialisation helpers
  // -----------------------------------------------------------------------

  private initializeRegions(overrides?: Record<string, number>): void {
    for (const bp of REGION_BLUEPRINTS) {
      const count = overrides?.[bp.id] ?? bp.defaultNeuronCount;
      const neurons: Neuron[] = [];
      for (let i = 0; i < count; i++) {
        const neuron = this.createNeuron(bp.id, i < count * 0.8 ? 'excitatory' : 'inhibitory');
        neurons.push(neuron);
        this.neuronIndex.set(neuron.id, { neuron, regionId: bp.id });
      }
      this.regions.set(bp.id, {
        id: bp.id,
        name: bp.name,
        description: bp.description,
        neurons,
      });
    }
  }

  private createNeuron(
    regionId: string,
    type: 'excitatory' | 'inhibitory',
  ): Neuron {
    return {
      id: generateId(),
      regionId,
      type,
      activationThreshold: 0.3 + Math.random() * 0.4, // 0.3–0.7
      currentActivation: 0,
      restingPotential: 0.05 + Math.random() * 0.1,
      connections: [],
      firingHistory: [],
      metadata: {},
    };
  }

  /** Wire up a sparse set of intra- and inter-region connections. */
  private createDefaultConnections(): void {
    const allRegions = Array.from(this.regions.values());
    for (const region of allRegions) {
      // Intra-region: connect ~30% of pairs
      for (let i = 0; i < region.neurons.length; i++) {
        for (let j = i + 1; j < region.neurons.length; j++) {
          if (Math.random() < 0.3) {
            this.createConnection(
              region.neurons[i].id,
              region.neurons[j].id,
              0.1 + Math.random() * 0.3,
            );
          }
        }
      }
    }

    // Inter-region: connect a handful of neurons between adjacent regions
    const adjacency: [string, string][] = [
      ['sensory-input', 'language-center'],
      ['sensory-input', 'amygdala'],
      ['language-center', 'association-cortex'],
      ['association-cortex', 'frontal-lobe'],
      ['association-cortex', 'memory-systems'],
      ['amygdala', 'frontal-lobe'],
      ['frontal-lobe', 'motor-output'],
      ['memory-systems', 'association-cortex'],
      ['language-center', 'motor-output'],
    ];

    for (const [srcRegId, tgtRegId] of adjacency) {
      const srcRegion = this.regions.get(srcRegId);
      const tgtRegion = this.regions.get(tgtRegId);
      if (!srcRegion || !tgtRegion) continue;
      const pairCount = Math.min(3, srcRegion.neurons.length, tgtRegion.neurons.length);
      for (let k = 0; k < pairCount; k++) {
        const src = srcRegion.neurons[Math.floor(Math.random() * srcRegion.neurons.length)];
        const tgt = tgtRegion.neurons[Math.floor(Math.random() * tgtRegion.neurons.length)];
        this.createConnection(src.id, tgt.id, 0.2 + Math.random() * 0.3);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Public API – neuron operations
  // -----------------------------------------------------------------------

  /**
   * Stimulate a neuron with an external signal, potentially causing it to fire.
   * @param neuronId Target neuron id.
   * @param stimulus Activation value to add (0–1).
   */
  triggerNeuron(neuronId: string, stimulus: number): void {
    const entry = this.neuronIndex.get(neuronId);
    if (!entry) return;
    const { neuron, regionId } = entry;
    neuron.currentActivation = clamp(neuron.currentActivation + stimulus, 0, 1);
    if (neuron.currentActivation >= neuron.activationThreshold) {
      this.fireNeuron(neuron, regionId);
    }
  }

  /**
   * Execute a neuron firing: record the event, propagate signal, then decay.
   * @param neuron The neuron that is firing.
   * @param regionId Region that owns the neuron.
   * @param depth Current propagation depth to prevent infinite recursion.
   */
  fireNeuron(neuron: Neuron, regionId: string, depth: number = 0): void {
    const now = Date.now();
    neuron.firingHistory.push(now);
    if (neuron.firingHistory.length > this.MAX_HISTORY) {
      neuron.firingHistory.shift();
    }

    this.emitEvent({
      type: 'fire',
      neuronId: neuron.id,
      regionId,
      activation: neuron.currentActivation,
      timestamp: now,
      metadata: { neuronType: neuron.type },
    });

    this.propagateSignal(neuron, depth + 1);

    // Post-fire decay: reset toward resting potential
    neuron.currentActivation = neuron.restingPotential;
  }

  /**
   * Propagate a fired neuron's signal along its outgoing connections.
   * @param neuron The neuron whose signal to propagate.
   * @param depth Current recursion depth (guards against runaway cascades).
   */
  propagateSignal(neuron: Neuron, depth: number = 0): void {
    if (depth >= this.MAX_PROPAGATION_DEPTH) return;

    for (const conn of neuron.connections) {
      const targetEntry = this.neuronIndex.get(conn.targetId);
      if (!targetEntry) continue;

      const signal =
        neuron.type === 'excitatory'
          ? neuron.currentActivation * conn.weight
          : -(neuron.currentActivation * conn.weight);

      const target = targetEntry.neuron;
      target.currentActivation = clamp(target.currentActivation + signal, 0, 1);

      if (target.currentActivation >= target.activationThreshold) {
        this.fireNeuron(target, targetEntry.regionId, depth);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Public API – connection management (plasticity)
  // -----------------------------------------------------------------------

  /**
   * Strengthen the connection between two neurons (Hebbian learning).
   * @param sourceId Source neuron id.
   * @param targetId Target neuron id.
   * @param amount Amount to increase the weight.
   */
  strengthenConnection(sourceId: string, targetId: string, amount: number): void {
    const key = `${sourceId}->${targetId}`;
    const conn = this.connections.get(key);
    if (!conn) return;
    conn.weight = clamp(conn.weight + amount, 0, 1);
    conn.strengthHistory.push({ timestamp: Date.now(), weight: conn.weight });

    // Also update the inline connection on the source neuron
    const srcEntry = this.neuronIndex.get(sourceId);
    if (srcEntry) {
      const inline = srcEntry.neuron.connections.find((c) => c.targetId === targetId);
      if (inline) inline.weight = conn.weight;
    }
  }

  /**
   * Weaken the connection between two neurons.
   * @param sourceId Source neuron id.
   * @param targetId Target neuron id.
   * @param amount Amount to decrease the weight.
   */
  weakenConnection(sourceId: string, targetId: string, amount: number): void {
    const key = `${sourceId}->${targetId}`;
    const conn = this.connections.get(key);
    if (!conn) return;
    conn.weight = clamp(conn.weight - amount, 0, 1);
    conn.strengthHistory.push({ timestamp: Date.now(), weight: conn.weight });

    const srcEntry = this.neuronIndex.get(sourceId);
    if (srcEntry) {
      const inline = srcEntry.neuron.connections.find((c) => c.targetId === targetId);
      if (inline) inline.weight = conn.weight;
    }
  }

  /**
   * Create a new directed connection between two neurons.
   * @param sourceId Source neuron id.
   * @param targetId Target neuron id.
   * @param weight Initial connection weight (0–1).
   * @returns The created {@link NeuralConnection}, or `undefined` if either neuron is missing.
   */
  createConnection(
    sourceId: string,
    targetId: string,
    weight: number,
  ): NeuralConnection | undefined {
    const srcEntry = this.neuronIndex.get(sourceId);
    const tgtEntry = this.neuronIndex.get(targetId);
    if (!srcEntry || !tgtEntry) return undefined;

    const key = `${sourceId}->${targetId}`;
    if (this.connections.has(key)) return this.connections.get(key);

    const latency = 5 + Math.random() * 20; // 5–25 ms
    const conn: NeuralConnection = {
      sourceId,
      targetId,
      weight: clamp(weight, 0, 1),
      latency,
      strengthHistory: [{ timestamp: Date.now(), weight: clamp(weight, 0, 1) }],
    };
    this.connections.set(key, conn);

    // Also keep an inline reference on the source neuron for fast propagation
    srcEntry.neuron.connections.push({ targetId, weight: conn.weight, latency });

    return conn;
  }

  /**
   * Add a new neuron to the specified region.
   * @param regionId Target region id.
   * @param type Neuron type.
   * @returns The newly created neuron, or `undefined` if the region doesn't exist.
   */
  addNeuron(
    regionId: string,
    type: 'excitatory' | 'inhibitory' = 'excitatory',
  ): Neuron | undefined {
    const region = this.regions.get(regionId);
    if (!region) return undefined;

    const neuron = this.createNeuron(regionId, type);
    region.neurons.push(neuron);
    this.neuronIndex.set(neuron.id, { neuron, regionId });

    this.emitEvent({
      type: 'neuron-added',
      neuronId: neuron.id,
      regionId,
      activation: 0,
      timestamp: Date.now(),
      metadata: { neuronType: type },
    });

    return neuron;
  }

  // -----------------------------------------------------------------------
  // Public API – queries
  // -----------------------------------------------------------------------

  /** Return all neurons whose current activation exceeds their threshold. */
  getActiveNeurons(): Neuron[] {
    const active: Neuron[] = [];
    for (const { neuron } of this.neuronIndex.values()) {
      if (neuron.currentActivation >= neuron.activationThreshold) {
        active.push(neuron);
      }
    }
    return active;
  }

  /**
   * Calculate the average activation level for a region.
   * @param regionId The region to query.
   * @returns A number between 0 and 1, or 0 if the region doesn't exist.
   */
  getRegionActivity(regionId: string): number {
    const region = this.regions.get(regionId);
    if (!region || region.neurons.length === 0) return 0;
    const sum = region.neurons.reduce((acc, n) => acc + n.currentActivation, 0);
    return sum / region.neurons.length;
  }

  /** Return a read-only snapshot of the full network state. */
  getNetworkState(): { regions: NeuralRegion[]; connections: NeuralConnection[] } {
    return {
      regions: Array.from(this.regions.values()),
      connections: Array.from(this.connections.values()),
    };
  }

  /**
   * Look up a neuron by id.
   * @param neuronId The id to find.
   * @returns The neuron and its region id, or `undefined`.
   */
  getNeuron(neuronId: string): { neuron: Neuron; regionId: string } | undefined {
    return this.neuronIndex.get(neuronId);
  }

  /**
   * Look up a region by id.
   * @param regionId The region id.
   */
  getRegion(regionId: string): NeuralRegion | undefined {
    return this.regions.get(regionId);
  }

  /** Return all region ids. */
  getRegionIds(): string[] {
    return Array.from(this.regions.keys());
  }

  // -----------------------------------------------------------------------
  // Public API – pattern triggering
  // -----------------------------------------------------------------------

  /**
   * Trigger a predefined neural activation pattern.
   * @param patternName One of the registered pattern names.
   * @returns The neural events generated, or an empty array for unknown patterns.
   */
  triggerPattern(patternName: string): NeuralEvent[] {
    const steps = PATTERNS[patternName];
    if (!steps) return [];

    const events: NeuralEvent[] = [];

    for (const step of steps) {
      const region = this.regions.get(step.regionId);
      if (!region) continue;

      // Pick `neuronCount` random neurons from the region
      const shuffled = [...region.neurons].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(step.neuronCount, shuffled.length));

      for (const neuron of selected) {
        const activation =
          step.activationRange[0] +
          Math.random() * (step.activationRange[1] - step.activationRange[0]);
        neuron.currentActivation = clamp(neuron.currentActivation + activation, 0, 1);

        if (neuron.currentActivation >= neuron.activationThreshold) {
          const event: NeuralEvent = {
            type: `pattern:${patternName}`,
            neuronId: neuron.id,
            regionId: step.regionId,
            activation: neuron.currentActivation,
            timestamp: Date.now(),
            metadata: { pattern: patternName },
          };
          events.push(event);
          this.emitEvent(event);
          this.fireNeuron(neuron, step.regionId);
        }
      }
    }

    return events;
  }

  // -----------------------------------------------------------------------
  // Public API – event system
  // -----------------------------------------------------------------------

  /**
   * Register a callback that will be invoked for every neural event.
   * @param callback The listener function.
   * @returns An unsubscribe function.
   */
  onNeuralEvent(callback: NeuralEventCallback): () => void {
    this.eventListeners.push(callback);
    return () => {
      this.eventListeners = this.eventListeners.filter((cb) => cb !== callback);
    };
  }

  private emitEvent(event: NeuralEvent): void {
    for (const cb of this.eventListeners) {
      try {
        cb(event);
      } catch {
        // Swallow listener errors to prevent cascade failures
      }
    }
  }

  // -----------------------------------------------------------------------
  // Serialization
  // -----------------------------------------------------------------------

  /** Serialize the entire network state for persistence. */
  serialize(): NeuralNetworkState {
    return {
      regions: Array.from(this.regions.values()),
      connections: Array.from(this.connections.values()),
      timestamp: Date.now(),
    };
  }

  /**
   * Restore network state from a previously serialized snapshot.
   * @param data Serialized state.
   */
  deserialize(data: NeuralNetworkState): void {
    this.regions.clear();
    this.connections.clear();
    this.neuronIndex.clear();

    for (const region of data.regions) {
      this.regions.set(region.id, region);
      for (const neuron of region.neurons) {
        this.neuronIndex.set(neuron.id, { neuron, regionId: region.id });
      }
    }

    for (const conn of data.connections) {
      this.connections.set(`${conn.sourceId}->${conn.targetId}`, conn);
    }
  }
}
