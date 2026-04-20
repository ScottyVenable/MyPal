export type {
  Neuron,
  NeuronConnection,
  NeuralRegion,
  NeuralConnection,
  Memory,
  StageCharacteristics,
  EvolutionStage,
  ProcessedInput,
  LMServerConfig,
  NeuralEvent,
  AIResponse,
  NeuralNetworkState,
  NeuralEventCallback,
  MemorySystemState,
  GenerateOptions,
  LMServerStatus,
  EvolutionManagerState,
  EvolutionMetric,
  PersonalityModifiers,
} from '@ai/index';

export { MemoryType } from '@ai/index';

export type RootTabParamList = {
  Chat: undefined;
  Brain: undefined;
  Stats: undefined;
  Settings: undefined;
};

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
  memoryClassification?: string;
  sentiment?: number;
}

export interface ScreenProps {
  navigation: unknown;
}
