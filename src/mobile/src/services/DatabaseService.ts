import { StorageService, STORAGE_KEYS } from './StorageService';
import type { ChatMessage } from '@/types';

interface MessageRow {
  id: string;
  text: string;
  is_user: boolean;
  timestamp: number;
  memory_classification: string | null;
  sentiment: number | null;
}

interface MemoryRow {
  id: string;
  type: string;
  content: string;
  summary: string;
  sentiment: number;
  importance: number;
  created_at: number;
  last_accessed_at: number;
  access_count: number;
}

interface NeuralStateRow {
  key: string;
  value: string;
  updated_at: number;
}

interface EvolutionMetricRow {
  id: string;
  timestamp: number;
  level: number;
  xp: number;
  stage_id: string;
}

/**
 * Database service that uses AsyncStorage as a fallback since SQLite
 * native module may not be available in all environments.
 * Provides structured CRUD operations with a relational-like API.
 */
export class DatabaseService {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure storage keys exist with default values
    const defaults: Array<[string, unknown]> = [
      [STORAGE_KEYS.CHAT_HISTORY, []],
      [STORAGE_KEYS.NEURAL_STATE, null],
      [STORAGE_KEYS.MEMORY_STATE, null],
      [STORAGE_KEYS.EVOLUTION_STATE, null],
    ];

    for (const [key, defaultValue] of defaults) {
      const existing = await StorageService.load(key);
      if (existing === null && defaultValue !== null) {
        await StorageService.save(key, defaultValue);
      }
    }

    this.initialized = true;
  }

  // --- Messages ---

  static async insertMessage(message: ChatMessage): Promise<void> {
    const messages = await this.getMessages();
    const row: MessageRow = {
      id: message.id,
      text: message.text,
      is_user: message.isUser,
      timestamp: message.timestamp,
      memory_classification: message.memoryClassification ?? null,
      sentiment: message.sentiment ?? null,
    };
    messages.push(row);
    await StorageService.save(STORAGE_KEYS.CHAT_HISTORY, messages);
  }

  static async getMessages(
    limit?: number,
    offset?: number,
  ): Promise<MessageRow[]> {
    const messages =
      (await StorageService.load<MessageRow[]>(STORAGE_KEYS.CHAT_HISTORY)) ??
      [];
    const sorted = messages.sort((a, b) => a.timestamp - b.timestamp);
    if (limit !== undefined) {
      const start = offset ?? 0;
      return sorted.slice(start, start + limit);
    }
    return sorted;
  }

  static async getMessageCount(): Promise<number> {
    const messages = await this.getMessages();
    return messages.length;
  }

  static async deleteMessage(id: string): Promise<void> {
    const messages = await this.getMessages();
    const filtered = messages.filter((m) => m.id !== id);
    await StorageService.save(STORAGE_KEYS.CHAT_HISTORY, filtered);
  }

  static async clearMessages(): Promise<void> {
    await StorageService.save(STORAGE_KEYS.CHAT_HISTORY, []);
  }

  // --- Memories ---

  static async insertMemory(memory: MemoryRow): Promise<void> {
    const memories = await this.getMemories();
    memories.push(memory);
    await StorageService.save('db_memories', memories);
  }

  static async getMemories(): Promise<MemoryRow[]> {
    return (await StorageService.load<MemoryRow[]>('db_memories')) ?? [];
  }

  static async deleteMemory(id: string): Promise<void> {
    const memories = await this.getMemories();
    const filtered = memories.filter((m) => m.id !== id);
    await StorageService.save('db_memories', filtered);
  }

  // --- Neural State ---

  static async saveNeuralState(key: string, value: string): Promise<void> {
    const states = await this.getNeuralStates();
    const existing = states.findIndex((s) => s.key === key);
    const row: NeuralStateRow = { key, value, updated_at: Date.now() };
    if (existing >= 0) {
      states[existing] = row;
    } else {
      states.push(row);
    }
    await StorageService.save('db_neural_states', states);
  }

  static async getNeuralState(key: string): Promise<string | null> {
    const states = await this.getNeuralStates();
    const found = states.find((s) => s.key === key);
    return found?.value ?? null;
  }

  private static async getNeuralStates(): Promise<NeuralStateRow[]> {
    return (
      (await StorageService.load<NeuralStateRow[]>('db_neural_states')) ?? []
    );
  }

  // --- Evolution Metrics ---

  static async insertEvolutionMetric(
    metric: EvolutionMetricRow,
  ): Promise<void> {
    const metrics = await this.getEvolutionMetrics();
    metrics.push(metric);
    await StorageService.save('db_evolution_metrics', metrics);
  }

  static async getEvolutionMetrics(): Promise<EvolutionMetricRow[]> {
    return (
      (await StorageService.load<EvolutionMetricRow[]>(
        'db_evolution_metrics',
      )) ?? []
    );
  }

  // --- Migration support ---

  static async runMigration(
    version: number,
    migrationFn: () => Promise<void>,
  ): Promise<void> {
    const currentVersion =
      (await StorageService.load<number>('db_version')) ?? 0;
    if (currentVersion < version) {
      await migrationFn();
      await StorageService.save('db_version', version);
    }
  }

  // --- Cleanup ---

  static async clearAll(): Promise<void> {
    await StorageService.clear();
    this.initialized = false;
  }
}
