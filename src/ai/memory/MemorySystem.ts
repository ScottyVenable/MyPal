/**
 * @module @mypal/ai-engine/memory
 * Memory management system with TF-IDF-like retrieval,
 * importance decay, and memory consolidation.
 */

import { Memory, MemoryType } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a random id without Node.js crypto dependency. */
function generateId(): string {
  const hex = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 24; i++) {
    id += hex[Math.floor(Math.random() * 16)];
  }
  return id;
}

/**
 * Extract lowercased, de-duplicated keywords from text.
 * Strips punctuation and filters out very short words.
 */
function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return Array.from(new Set(words));
}

// ---------------------------------------------------------------------------
// Serialization shape
// ---------------------------------------------------------------------------

/** Serializable snapshot of the memory system. */
export interface MemorySystemState {
  memories: Memory[];
  timestamp: number;
}

// ---------------------------------------------------------------------------
// MemorySystem class
// ---------------------------------------------------------------------------

/**
 * Manages ephemeral, short-term, long-term, and episodic memories.
 *
 * Provides TF-IDF-inspired keyword relevance scoring, time-based importance
 * decay, and automatic consolidation of short-term memories into long-term
 * storage once access thresholds are met.
 */
export class MemorySystem {
  private memories: Map<string, Memory> = new Map();

  /** Number of accesses required before a short-term memory may be consolidated. */
  private readonly CONSOLIDATION_ACCESS_THRESHOLD = 3;
  /** Minimum importance required for consolidation. */
  private readonly CONSOLIDATION_IMPORTANCE_THRESHOLD = 0.4;
  /** Per-tick importance decay applied during {@link decayMemories}. */
  private readonly DECAY_AMOUNT = 0.01;
  /** Maximum number of memories to retain (soft limit). */
  private readonly MAX_MEMORIES = 10_000;

  // -----------------------------------------------------------------------
  // Core operations
  // -----------------------------------------------------------------------

  /**
   * Store a new memory.
   * @param content Textual content.
   * @param type Memory classification.
   * @param metadata Optional overrides for sentiment, importance, summary, etc.
   * @returns The newly created memory.
   */
  storeMemory(
    content: string,
    type: MemoryType,
    metadata?: Partial<Pick<Memory, 'sentiment' | 'importance' | 'summary' | 'keywords'>>,
  ): Memory {
    const now = Date.now();
    const keywords = metadata?.keywords ?? extractKeywords(content);
    const memory: Memory = {
      id: generateId(),
      type,
      content,
      summary: metadata?.summary ?? content.slice(0, 120),
      sentiment: metadata?.sentiment ?? 0,
      keywords,
      importance: metadata?.importance ?? this.calculateBaseImportance(content, type),
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      relatedNeuronIds: [],
      relatedMemoryIds: [],
    };

    this.memories.set(memory.id, memory);
    this.enforceMemoryLimit();
    return memory;
  }

  /**
   * Retrieve the most relevant memories for a given query.
   * Uses TF-IDF-like keyword matching combined with importance and recency scoring.
   * @param query Search query string.
   * @param limit Maximum number of results.
   * @returns Matching memories ordered by relevance (descending).
   */
  retrieveRelevant(query: string, limit: number = 10): Memory[] {
    const queryKeywords = extractKeywords(query);
    if (queryKeywords.length === 0) return this.getContextWindow(limit);

    // Build document-frequency map across all memories
    const docFreq: Record<string, number> = {};
    for (const mem of this.memories.values()) {
      const unique = new Set(mem.keywords);
      for (const kw of unique) {
        docFreq[kw] = (docFreq[kw] ?? 0) + 1;
      }
    }

    const totalDocs = this.memories.size || 1;

    const scored: Array<{ memory: Memory; score: number }> = [];

    for (const memory of this.memories.values()) {
      let relevance = 0;

      // TF-IDF-like keyword relevance
      for (const qkw of queryKeywords) {
        const tf = memory.keywords.filter((k) => k === qkw).length / (memory.keywords.length || 1);
        const idf = Math.log(totalDocs / ((docFreq[qkw] ?? 0) + 1)) + 1;
        relevance += tf * idf;
      }

      // Boost by importance
      relevance *= 1 + memory.importance;

      // Recency boost (more recent → higher)
      const ageHours = (Date.now() - memory.lastAccessedAt) / (1000 * 60 * 60);
      const recencyBoost = 1 / (1 + ageHours * 0.1);
      relevance *= 1 + recencyBoost * 0.5;

      if (relevance > 0) {
        scored.push({ memory, score: relevance });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    const results = scored.slice(0, limit).map((s) => s.memory);

    // Touch retrieved memories
    const now = Date.now();
    for (const mem of results) {
      mem.lastAccessedAt = now;
      mem.accessCount += 1;
    }

    return results;
  }

  /**
   * Consolidate short-term memories into long-term storage.
   *
   * Memories that have been accessed often enough and exceed the importance
   * threshold are promoted. Related short-term memories with overlapping
   * keywords are merged into a single long-term memory.
   * @returns Number of memories consolidated.
   */
  consolidateMemories(): number {
    let consolidated = 0;
    const shortTermMemories: Memory[] = [];

    for (const mem of this.memories.values()) {
      if (mem.type === MemoryType.ShortTerm) {
        shortTermMemories.push(mem);
      }
    }

    // Group by keyword overlap
    const processed = new Set<string>();

    for (const mem of shortTermMemories) {
      if (processed.has(mem.id)) continue;

      if (
        mem.accessCount >= this.CONSOLIDATION_ACCESS_THRESHOLD &&
        mem.importance >= this.CONSOLIDATION_IMPORTANCE_THRESHOLD
      ) {
        // Find related short-term memories with overlapping keywords
        const related = shortTermMemories.filter((other) => {
          if (other.id === mem.id || processed.has(other.id)) return false;
          const overlap = mem.keywords.filter((k) => other.keywords.includes(k));
          return overlap.length >= 2;
        });

        if (related.length > 0) {
          // Merge into a combined long-term memory
          const allContent = [mem.content, ...related.map((r) => r.content)].join(' | ');
          const allKeywords = Array.from(
            new Set([...mem.keywords, ...related.flatMap((r) => r.keywords)]),
          );
          const avgSentiment =
            [mem, ...related].reduce((s, m) => s + m.sentiment, 0) / (related.length + 1);
          const maxImportance = Math.max(mem.importance, ...related.map((r) => r.importance));

          const merged = this.storeMemory(allContent, MemoryType.LongTerm, {
            keywords: allKeywords,
            sentiment: avgSentiment,
            importance: Math.min(maxImportance + 0.1, 1),
            summary: `Consolidated: ${mem.summary}`,
          });

          // Link related memory ids
          const sourceIds = [mem.id, ...related.map((r) => r.id)];
          merged.relatedMemoryIds = sourceIds;
          merged.relatedNeuronIds = Array.from(
            new Set([...mem.relatedNeuronIds, ...related.flatMap((r) => r.relatedNeuronIds)]),
          );

          for (const r of related) {
            processed.add(r.id);
            this.memories.delete(r.id);
          }
          processed.add(mem.id);
          this.memories.delete(mem.id);
          consolidated++;
        } else {
          // Promote the single memory
          this.promoteMemory(mem.id);
          processed.add(mem.id);
          consolidated++;
        }
      }
    }

    return consolidated;
  }

  /**
   * Return the most recent memories as context.
   * @param limit Maximum number of memories to return.
   */
  getContextWindow(limit: number = 20): Memory[] {
    const all = Array.from(this.memories.values());
    all.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    return all.slice(0, limit);
  }

  /**
   * Apply time-based importance decay to all memories.
   * Ephemeral memories that decay below a threshold are removed.
   */
  decayMemories(): void {
    const toRemove: string[] = [];

    for (const mem of this.memories.values()) {
      // Decay rate varies by type
      let rate = this.DECAY_AMOUNT;
      if (mem.type === MemoryType.Ephemeral) rate *= 5;
      else if (mem.type === MemoryType.ShortTerm) rate *= 2;
      else if (mem.type === MemoryType.LongTerm) rate *= 0.5;
      else if (mem.type === MemoryType.Episodic) rate *= 0.3;

      mem.importance = Math.max(0, mem.importance - rate);

      // Remove ephemeral memories that have fully decayed
      if (mem.type === MemoryType.Ephemeral && mem.importance <= 0.01) {
        toRemove.push(mem.id);
      }
    }

    for (const id of toRemove) {
      this.memories.delete(id);
    }
  }

  /**
   * Promote a short-term memory to long-term.
   * @param id Memory id.
   * @returns `true` if the memory was promoted.
   */
  promoteMemory(id: string): boolean {
    const mem = this.memories.get(id);
    if (!mem || mem.type !== MemoryType.ShortTerm) return false;
    mem.type = MemoryType.LongTerm;
    mem.importance = Math.min(mem.importance + 0.1, 1);
    return true;
  }

  // -----------------------------------------------------------------------
  // Statistics
  // -----------------------------------------------------------------------

  /** Return aggregate statistics about stored memories. */
  getMemoryStats(): {
    total: number;
    byType: Record<MemoryType, number>;
    averageImportance: number;
    oldestTimestamp: number;
    newestTimestamp: number;
  } {
    const byType: Record<MemoryType, number> = {
      [MemoryType.Ephemeral]: 0,
      [MemoryType.ShortTerm]: 0,
      [MemoryType.LongTerm]: 0,
      [MemoryType.Episodic]: 0,
    };
    let importanceSum = 0;
    let oldest = Infinity;
    let newest = 0;

    for (const mem of this.memories.values()) {
      byType[mem.type]++;
      importanceSum += mem.importance;
      if (mem.createdAt < oldest) oldest = mem.createdAt;
      if (mem.createdAt > newest) newest = mem.createdAt;
    }

    const total = this.memories.size;
    return {
      total,
      byType,
      averageImportance: total > 0 ? importanceSum / total : 0,
      oldestTimestamp: total > 0 ? oldest : 0,
      newestTimestamp: newest,
    };
  }

  // -----------------------------------------------------------------------
  // Neuron linkage
  // -----------------------------------------------------------------------

  /**
   * Associate a memory with a set of neurons.
   * @param memoryId Memory id.
   * @param neuronIds Array of neuron ids to link.
   */
  linkMemoryToNeurons(memoryId: string, neuronIds: string[]): void {
    const mem = this.memories.get(memoryId);
    if (!mem) return;
    const existing = new Set(mem.relatedNeuronIds);
    for (const nid of neuronIds) {
      if (!existing.has(nid)) {
        mem.relatedNeuronIds.push(nid);
        existing.add(nid);
      }
    }
  }

  /**
   * Get all memories linked to a specific neuron.
   * @param neuronId Neuron id to search for.
   */
  getMemoriesByNeuron(neuronId: string): Memory[] {
    const results: Memory[] = [];
    for (const mem of this.memories.values()) {
      if (mem.relatedNeuronIds.includes(neuronId)) {
        results.push(mem);
      }
    }
    return results;
  }

  /**
   * Retrieve a single memory by id.
   * @param id Memory id.
   */
  getMemory(id: string): Memory | undefined {
    return this.memories.get(id);
  }

  // -----------------------------------------------------------------------
  // Serialization
  // -----------------------------------------------------------------------

  /** Serialize all memories for persistence. */
  serialize(): MemorySystemState {
    return {
      memories: Array.from(this.memories.values()),
      timestamp: Date.now(),
    };
  }

  /**
   * Restore memory state from a previously serialized snapshot.
   * @param data Serialized state.
   */
  deserialize(data: MemorySystemState): void {
    this.memories.clear();
    for (const mem of data.memories) {
      this.memories.set(mem.id, mem);
    }
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** Calculate a baseline importance score based on content length and type. */
  private calculateBaseImportance(content: string, type: MemoryType): number {
    let base = 0.3;

    // Longer content → slightly more important
    if (content.length > 200) base += 0.1;
    if (content.length > 500) base += 0.1;

    // Type-based baseline
    switch (type) {
      case MemoryType.Ephemeral:
        base *= 0.5;
        break;
      case MemoryType.ShortTerm:
        break; // use base as-is
      case MemoryType.LongTerm:
        base += 0.2;
        break;
      case MemoryType.Episodic:
        base += 0.15;
        break;
    }

    // Question marks suggest curiosity / engagement
    if (content.includes('?')) base += 0.05;

    return Math.min(base, 1);
  }

  /** Drop lowest-importance ephemeral/short-term memories if over limit. */
  private enforceMemoryLimit(): void {
    if (this.memories.size <= this.MAX_MEMORIES) return;

    const sorted = Array.from(this.memories.values()).sort(
      (a, b) => a.importance - b.importance,
    );

    let toRemove = this.memories.size - this.MAX_MEMORIES;
    for (const mem of sorted) {
      if (toRemove <= 0) break;
      if (mem.type === MemoryType.Ephemeral || mem.type === MemoryType.ShortTerm) {
        this.memories.delete(mem.id);
        toRemove--;
      }
    }
  }
}
