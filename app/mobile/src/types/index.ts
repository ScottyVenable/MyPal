// Type definitions for MyPal Mobile

export interface Profile {
  id: string;
  name: string;
  level: number;
  xp: number;
  created: string;
  lastActive: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'pal';
  content: string;
  timestamp: string;
  reinforced?: boolean;
}

export interface Stats {
  level: number;
  xp: number;
  nextLevelXP: number;
  totalMessages: number;
  wordsLearned: number;
  personality: {
    curious: number;
    logical: number;
    social: number;
    agreeable: number;
    cautious: number;
  };
  cognitivePoints: number;
  lobes: {
    language: number;
    logic: number;
    emotion: number;
    memory: number;
  };
}

export interface NeuralNode {
  id: string;
  label: string;
  group: string;
  level?: number;
  color?: string;
}

export interface NeuralEdge {
  from: string;
  to: string;
  value?: number;
}

export interface NeuralNetwork {
  nodes: NeuralNode[];
  edges: NeuralEdge[];
}

export interface Settings {
  learningSpeed: number;
  notifications: boolean;
  darkMode: boolean;
  telemetryEnabled: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ChatRequest {
  message: string;
  profileId: string;
}

export interface ChatResponse {
  reply: string;
  xpGained: number;
  leveledUp: boolean;
  newLevel?: number;
}
