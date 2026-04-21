import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  NeuralNetwork,
  MemorySystem,
  LMClient,
  ProcessingPipeline,
  EvolutionManager,
} from '@ai/index';
import type {
  AIResponse,
  LMServerConfig,
  Memory,
  NeuralNetworkState,
  EvolutionStage,
  NeuralEventCallback,
  MemorySystemState,
  EvolutionManagerState,
} from '@ai/index';
import { StorageService, STORAGE_KEYS } from '@/services/StorageService';

const DEFAULT_LM_CONFIG: LMServerConfig = {
  endpoint: 'http://localhost:11434',
  model: 'llama2',
  maxTokens: 512,
  temperature: 0.7,
  timeout: 30000,
};

interface AIContextState {
  isInitialized: boolean;
  isProcessing: boolean;
  processMessage: (text: string) => Promise<AIResponse>;
  getMemories: () => Memory[];
  getNeuralState: () => NeuralNetworkState;
  getEvolution: () => EvolutionStage;
  getLevel: () => number;
  getXP: () => number;
  getXPToNextLevel: () => number;
  getMemoryStats: () => ReturnType<MemorySystem['getMemoryStats']>;
  updateLMConfig: (config: Partial<LMServerConfig>) => void;
  getLMConfig: () => LMServerConfig;
  testConnection: () => Promise<boolean>;
  onNeuralEvent: (callback: NeuralEventCallback) => () => void;
  neuralNetwork: NeuralNetwork | null;
  memorySystem: MemorySystem | null;
  evolutionManager: EvolutionManager | null;
}

const AIContext = createContext<AIContextState | null>(null);

export function useAI(): AIContextState {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

interface AIProviderProps {
  children: ReactNode;
}

export function AIProvider({ children }: AIProviderProps): React.JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const neuralNetworkRef = useRef<NeuralNetwork | null>(null);
  const memorySystemRef = useRef<MemorySystem | null>(null);
  const lmClientRef = useRef<LMClient | null>(null);
  const pipelineRef = useRef<ProcessingPipeline | null>(null);
  const evolutionManagerRef = useRef<EvolutionManager | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const nn = new NeuralNetwork();
        const mem = new MemorySystem();
        const evo = new EvolutionManager();

        // Restore persisted state
        const [savedNeural, savedMemory, savedEvolution, savedConfig] =
          await Promise.all([
            StorageService.load<NeuralNetworkState>(STORAGE_KEYS.NEURAL_STATE),
            StorageService.load(STORAGE_KEYS.MEMORY_STATE),
            StorageService.load(STORAGE_KEYS.EVOLUTION_STATE),
            StorageService.load<LMServerConfig>(STORAGE_KEYS.LM_CONFIG),
          ]);

        if (savedNeural) nn.deserialize(savedNeural);
        if (savedMemory) mem.deserialize(savedMemory as MemorySystemState);
        if (savedEvolution) evo.deserialize(savedEvolution as EvolutionManagerState);

        const config = savedConfig ?? DEFAULT_LM_CONFIG;
        const lm = new LMClient(config);
        const pipeline = new ProcessingPipeline(nn, mem, lm, evo);

        neuralNetworkRef.current = nn;
        memorySystemRef.current = mem;
        lmClientRef.current = lm;
        pipelineRef.current = pipeline;
        evolutionManagerRef.current = evo;

        if (mounted) setIsInitialized(true);
      } catch (error) {
        console.error('[AIProvider] Initialization failed:', error);
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // Persist state periodically and on unmount
  const persistState = useCallback(async () => {
    try {
      const nn = neuralNetworkRef.current;
      const mem = memorySystemRef.current;
      const evo = evolutionManagerRef.current;
      if (nn && mem && evo) {
        await Promise.all([
          StorageService.save(STORAGE_KEYS.NEURAL_STATE, nn.serialize()),
          StorageService.save(STORAGE_KEYS.MEMORY_STATE, mem.serialize()),
          StorageService.save(STORAGE_KEYS.EVOLUTION_STATE, evo.serialize()),
        ]);
      }
    } catch (error) {
      console.error('[AIProvider] Failed to persist state:', error);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    const interval = setInterval(persistState, 60_000);
    return () => {
      clearInterval(interval);
      persistState();
    };
  }, [isInitialized, persistState]);

  const processMessage = useCallback(
    async (text: string): Promise<AIResponse> => {
      const pipeline = pipelineRef.current;
      if (!pipeline) {
        throw new Error('AI engine not initialized');
      }
      setIsProcessing(true);
      try {
        const response = await pipeline.processInput(text);
        const evo = evolutionManagerRef.current;
        if (evo) {
          evo.addXP(10);
          evo.checkEvolution();
        }
        await persistState();
        return response;
      } finally {
        setIsProcessing(false);
      }
    },
    [persistState],
  );

  const getMemories = useCallback((): Memory[] => {
    return memorySystemRef.current?.getContextWindow(50) ?? [];
  }, []);

  const getNeuralState = useCallback((): NeuralNetworkState => {
    return (
      neuralNetworkRef.current?.getNetworkState() ?? {
        regions: [],
        connections: [],
        timestamp: Date.now(),
      }
    );
  }, []);

  const getEvolution = useCallback((): EvolutionStage => {
    return (
      evolutionManagerRef.current?.getCurrentStage() ?? {
        id: 'unknown',
        name: 'Unknown',
        level: 0,
        characteristics: {
          curiosity: 0,
          vocabulary: 0,
          empathy: 0,
          logic: 0,
          creativity: 0,
        },
        description: 'Not initialized',
      }
    );
  }, []);

  const getLevel = useCallback((): number => {
    return evolutionManagerRef.current?.getLevel() ?? 1;
  }, []);

  const getXP = useCallback((): number => {
    return evolutionManagerRef.current?.getXP() ?? 0;
  }, []);

  const getXPToNextLevel = useCallback((): number => {
    return evolutionManagerRef.current?.getXPToNextLevel() ?? 100;
  }, []);

  const getMemoryStats = useCallback(() => {
    return (
      memorySystemRef.current?.getMemoryStats() ?? {
        total: 0,
        byType: { ephemeral: 0, 'short-term': 0, 'long-term': 0, episodic: 0 },
        averageImportance: 0,
        oldestTimestamp: 0,
        newestTimestamp: 0,
      }
    );
  }, []);

  const updateLMConfig = useCallback(
    (config: Partial<LMServerConfig>) => {
      lmClientRef.current?.updateConfig(config);
      const full = lmClientRef.current?.getConfig();
      if (full) {
        StorageService.save(STORAGE_KEYS.LM_CONFIG, full);
      }
    },
    [],
  );

  const getLMConfig = useCallback((): LMServerConfig => {
    return lmClientRef.current?.getConfig() ?? DEFAULT_LM_CONFIG;
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const connected = await lmClientRef.current?.connect();
      return connected ?? false;
    } catch {
      return false;
    }
  }, []);

  const onNeuralEvent = useCallback(
    (callback: NeuralEventCallback): (() => void) => {
      return neuralNetworkRef.current?.onNeuralEvent(callback) ?? (() => {});
    },
    [],
  );

  const value: AIContextState = {
    isInitialized,
    isProcessing,
    processMessage,
    getMemories,
    getNeuralState,
    getEvolution,
    getLevel,
    getXP,
    getXPToNextLevel,
    getMemoryStats,
    updateLMConfig,
    getLMConfig,
    testConnection,
    onNeuralEvent,
    neuralNetwork: neuralNetworkRef.current,
    memorySystem: memorySystemRef.current,
    evolutionManager: evolutionManagerRef.current,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}
