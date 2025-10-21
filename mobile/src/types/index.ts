export interface Profile {
  id: string;
  name: string;
  createdAt: number;
  lastPlayedAt: number;
  level: number;
  xp: number;
  messageCount: number;
  memoryCount: number;
}

export interface Message {
  id: string;
  role: 'user' | 'pal';
  text: string;
  ts: number;
  kind?: string;
}

export interface Memory {
  id: string;
  ts: number;
  userText: string;
  palText: string;
  summary: string;
  sentiment: string;
  keywords: string[];
  xp: {
    gained: number;
    total: number;
    level: number;
  };
  importance: {
    score: number;
    level: string;
  };
}

export interface Stats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  messageCount: number;
  memoryCount: number;
  vocabularySize: number;
  personalityTraits: {
    curious: number;
    logical: number;
    social: number;
    agreeable: number;
    cautious: number;
  };
}

export interface NeuralEvent {
  type: string;
  neuronId: string;
  activation: number;
  timestamp: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
