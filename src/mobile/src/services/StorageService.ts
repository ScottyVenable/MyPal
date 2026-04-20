import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = '@mypal:';

export class StorageService {
  static async save<T>(key: string, data: T): Promise<void> {
    try {
      const json = JSON.stringify(data);
      await AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, json);
    } catch (error) {
      console.error(`[StorageService] Failed to save key "${key}":`, error);
    }
  }

  static async load<T>(key: string): Promise<T | null> {
    try {
      const json = await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (json === null) return null;
      return JSON.parse(json) as T;
    } catch (error) {
      console.error(`[StorageService] Failed to load key "${key}":`, error);
      return null;
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch (error) {
      console.error(`[StorageService] Failed to remove key "${key}":`, error);
    }
  }

  static async clear(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const myPalKeys = allKeys.filter((k) => k.startsWith(STORAGE_PREFIX));
      await AsyncStorage.multiRemove(myPalKeys);
    } catch (error) {
      console.error('[StorageService] Failed to clear storage:', error);
    }
  }

  static async getAllKeys(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys
        .filter((k) => k.startsWith(STORAGE_PREFIX))
        .map((k) => k.replace(STORAGE_PREFIX, ''));
    } catch (error) {
      console.error('[StorageService] Failed to get keys:', error);
      return [];
    }
  }
}

export const STORAGE_KEYS = {
  NEURAL_STATE: 'neural_state',
  MEMORY_STATE: 'memory_state',
  EVOLUTION_STATE: 'evolution_state',
  CHAT_HISTORY: 'chat_history',
  SETTINGS: 'settings',
  LM_CONFIG: 'lm_config',
} as const;
