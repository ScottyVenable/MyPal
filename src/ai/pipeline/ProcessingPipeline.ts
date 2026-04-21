/**
 * @module @mypal/ai-engine/pipeline
 * Orchestrates the full AI processing flow: input analysis, neural activation,
 * memory retrieval, context assembly, and response generation.
 */

import {
  AIResponse,
  Memory,
  MemoryType,
  NeuralEvent,
  ProcessedInput,
} from '../types';
import { NeuralNetwork } from '../neural/NeuralNetwork';
import { MemorySystem } from '../memory/MemorySystem';
import { LMClient } from '../lm-server/LMClient';
import { EvolutionManager } from '../evolution/EvolutionManager';

// ---------------------------------------------------------------------------
// Fallback response templates used when the LM server is unavailable.
// ---------------------------------------------------------------------------

const FALLBACK_RESPONSES: Record<string, string[]> = {
  greeting: [
    "Hi there! I'm happy to see you.",
    "Hello! What's on your mind today?",
    'Hey! Nice to talk with you again.',
  ],
  question: [
    "That's an interesting question! Let me think about it…",
    "Hmm, I'm not sure, but I'd love to explore that with you.",
    'Great question — what do you think the answer might be?',
  ],
  emotional_positive: [
    "That's wonderful to hear! 😊",
    "I'm so glad! Tell me more.",
    "That makes me happy too!",
  ],
  emotional_negative: [
    "I'm sorry to hear that. I'm here for you.",
    "That sounds tough. Want to talk about it?",
    "I understand. Things can be hard sometimes.",
  ],
  default: [
    "That's interesting — tell me more!",
    "I see! What else would you like to talk about?",
    "Thanks for sharing that with me.",
    "I appreciate you telling me that.",
  ],
};

// ---------------------------------------------------------------------------
// XP rewards for various interaction types
// ---------------------------------------------------------------------------

const XP_REWARDS = {
  messageProcessed: 5,
  memoryCreated: 2,
  connectionFormed: 3,
  longConversation: 10,
};

// ---------------------------------------------------------------------------
// ProcessingPipeline class
// ---------------------------------------------------------------------------

/**
 * The main AI processing pipeline that coordinates all subsystems to
 * handle user input and produce responses.
 *
 * ## Processing steps
 * 1. Trigger 'receive-message' neural pattern
 * 2. Analyse input via the LM (or heuristic fallback)
 * 3. Store input as a memory
 * 4. Update neural connections based on detected topics/entities
 * 5. Trigger linguistic & emotional neural patterns
 * 6. Retrieve relevant memories
 * 7. Assemble enriched context
 * 8. Generate response via LM (or fallback)
 * 9. Trigger 'generate-response' pattern
 * 10. Return {@link AIResponse}
 */
export class ProcessingPipeline {
  private neuralNetwork: NeuralNetwork;
  private memorySystem: MemorySystem;
  private lmClient: LMClient;
  private evolutionManager: EvolutionManager;

  /** Running count of messages processed this session. */
  private messageCount: number = 0;

  constructor(
    neuralNetwork: NeuralNetwork,
    memorySystem: MemorySystem,
    lmClient: LMClient,
    evolutionManager: EvolutionManager,
  ) {
    this.neuralNetwork = neuralNetwork;
    this.memorySystem = memorySystem;
    this.lmClient = lmClient;
    this.evolutionManager = evolutionManager;
  }

  // -----------------------------------------------------------------------
  // Main entry point
  // -----------------------------------------------------------------------

  /**
   * Process raw user input through the full AI pipeline.
   * @param userText The user's message text.
   * @returns A complete {@link AIResponse}.
   */
  async processInput(userText: string): Promise<AIResponse> {
    this.messageCount++;
    const allEvents: NeuralEvent[] = [];

    // Step 1: Trigger receive-message neural pattern
    const receiveEvents = this.neuralNetwork.triggerPattern('receive-message');
    allEvents.push(...receiveEvents);

    // Step 2: Analyse input (LM or fallback)
    let processedInput: ProcessedInput;
    if (this.lmClient.isConnected()) {
      try {
        processedInput = await this.lmClient.analyzeInput(userText);
      } catch {
        processedInput = this.basicAnalysis(userText);
      }
    } else {
      processedInput = this.basicAnalysis(userText);
    }

    // Step 3: Store as memory
    const memory = this.memorySystem.storeMemory(
      userText,
      processedInput.memoryClassification,
      {
        sentiment: processedInput.sentiment.score,
        importance: processedInput.importance,
        keywords: processedInput.topics,
      },
    );
    this.evolutionManager.addXP(XP_REWARDS.memoryCreated);

    // Step 4: Update neural connections
    this.updateNeuralConnections(processedInput);
    this.evolutionManager.addXP(XP_REWARDS.connectionFormed);

    // Step 5: Trigger language / emotion patterns
    const langEvents = this.neuralNetwork.triggerPattern('process-language');
    allEvents.push(...langEvents);

    if (Math.abs(processedInput.sentiment.score) > 0.3) {
      const emoEvents = this.neuralNetwork.triggerPattern('emotional-response');
      allEvents.push(...emoEvents);
    }

    // Step 6: Retrieve relevant memories
    const relevantMemories = this.memorySystem.retrieveRelevant(userText, 10);
    if (relevantMemories.length > 0) {
      const recallEvents = this.neuralNetwork.triggerPattern('memory-recall');
      allEvents.push(...recallEvents);
    }

    // Link memory to active neurons
    const activeNeurons = this.neuralNetwork.getActiveNeurons();
    if (activeNeurons.length > 0) {
      this.memorySystem.linkMemoryToNeurons(
        memory.id,
        activeNeurons.slice(0, 5).map((n) => n.id),
      );
    }

    // Step 7 & 8: Assemble context and generate response
    const evolutionStage = this.evolutionManager.getCurrentStage();
    let responseText: string;

    if (this.lmClient.isConnected()) {
      try {
        const context = this.assembleContext(processedInput, relevantMemories);
        responseText = await this.lmClient.generateResponse({
          systemPrompt: context.systemPrompt,
          userMessage: userText,
          conversationHistory: context.conversationHistory,
        });
      } catch {
        responseText = this.generateFallbackResponse(processedInput);
      }
    } else {
      responseText = this.generateFallbackResponse(processedInput);
    }

    // Step 9: Trigger generate-response pattern
    const genEvents = this.neuralNetwork.triggerPattern('generate-response');
    allEvents.push(...genEvents);

    // Award XP
    this.evolutionManager.addXP(XP_REWARDS.messageProcessed);
    if (this.messageCount % 10 === 0) {
      this.evolutionManager.addXP(XP_REWARDS.longConversation);
    }

    // Periodic maintenance
    if (this.messageCount % 20 === 0) {
      this.memorySystem.decayMemories();
      this.memorySystem.consolidateMemories();
    }

    // Step 10: Build and return response
    return {
      text: responseText,
      processedInput,
      memoriesUsed: relevantMemories,
      neuralActivations: allEvents,
      evolutionState: evolutionStage,
    };
  }

  // -----------------------------------------------------------------------
  // Context assembly
  // -----------------------------------------------------------------------

  /**
   * Build an enriched prompt context from processed input, memories, and
   * the current evolution state.
   */
  assembleContext(
    processedInput: ProcessedInput,
    memories: Memory[],
  ): { systemPrompt: string; conversationHistory: string[] } {
    const personality = this.evolutionManager.getPersonalityModifiers();
    const characteristics = this.evolutionManager.getCharacteristics();

    // System prompt
    const systemParts: string[] = [personality.personalityPrompt];
    systemParts.push('');
    systemParts.push('## Current Cognitive State');
    systemParts.push(
      `Curiosity: ${(characteristics.curiosity * 100).toFixed(0)}% | ` +
        `Vocabulary: ${(characteristics.vocabulary * 100).toFixed(0)}% | ` +
        `Empathy: ${(characteristics.empathy * 100).toFixed(0)}% | ` +
        `Logic: ${(characteristics.logic * 100).toFixed(0)}% | ` +
        `Creativity: ${(characteristics.creativity * 100).toFixed(0)}%`,
    );

    // Input analysis
    systemParts.push('');
    systemParts.push('## Input Analysis');
    systemParts.push(`Sentiment: ${processedInput.sentiment.label} (${processedInput.sentiment.score.toFixed(2)})`);
    if (processedInput.topics.length > 0) {
      systemParts.push(`Topics: ${processedInput.topics.join(', ')}`);
    }

    // Relevant memories
    if (memories.length > 0) {
      systemParts.push('');
      systemParts.push('## Relevant Memories');
      for (const mem of memories.slice(0, 5)) {
        systemParts.push(`- [${mem.type}] ${mem.summary}`);
      }
    }

    // Neural activity summary
    const regionIds = this.neuralNetwork.getRegionIds();
    const activeRegions = regionIds
      .map((id) => ({ id, activity: this.neuralNetwork.getRegionActivity(id) }))
      .filter((r) => r.activity > 0.1)
      .sort((a, b) => b.activity - a.activity);

    if (activeRegions.length > 0) {
      systemParts.push('');
      systemParts.push('## Active Brain Regions');
      for (const r of activeRegions.slice(0, 4)) {
        systemParts.push(`- ${r.id}: ${(r.activity * 100).toFixed(0)}% activity`);
      }
    }

    // Personality guidelines
    systemParts.push('');
    systemParts.push('## Response Guidelines');
    systemParts.push(`Keep sentences under ~${personality.maxSentenceLength} words.`);
    if (personality.questionFrequency > 0.4) {
      systemParts.push('Feel free to ask the user questions — you are curious.');
    }
    if (personality.emotionalRange > 0.5) {
      systemParts.push('Respond with warmth and emotional awareness.');
    }

    // Conversation history from recent memories
    const conversationHistory: string[] = [];
    const recentContext = this.memorySystem.getContextWindow(6);
    for (const ctx of recentContext) {
      conversationHistory.push(`[${ctx.type}] ${ctx.summary}`);
    }

    return {
      systemPrompt: systemParts.join('\n'),
      conversationHistory,
    };
  }

  // -----------------------------------------------------------------------
  // Neural connection updates
  // -----------------------------------------------------------------------

  /**
   * Strengthen or create neural connections based on the topics and entities
   * found in the processed input.
   */
  updateNeuralConnections(processedInput: ProcessedInput): void {
    const topics = processedInput.topics;
    if (topics.length === 0) return;

    // Strengthen connections in the association cortex for related topics
    const assocRegion = this.neuralNetwork.getRegion('association-cortex');
    if (!assocRegion || assocRegion.neurons.length < 2) return;

    // Pick neurons deterministically based on topic hash
    const topicNeurons: string[] = [];
    for (const topic of topics) {
      const hash = this.simpleHash(topic);
      const idx = hash % assocRegion.neurons.length;
      topicNeurons.push(assocRegion.neurons[idx].id);
    }

    // Strengthen connections between topic neurons (Hebbian co-activation)
    for (let i = 0; i < topicNeurons.length; i++) {
      for (let j = i + 1; j < topicNeurons.length; j++) {
        const existing = this.neuralNetwork.getNetworkState().connections.find(
          (c) => c.sourceId === topicNeurons[i] && c.targetId === topicNeurons[j],
        );

        if (existing) {
          this.neuralNetwork.strengthenConnection(topicNeurons[i], topicNeurons[j], 0.05);
        } else {
          this.neuralNetwork.createConnection(topicNeurons[i], topicNeurons[j], 0.2);
        }
      }
    }

    // Trigger learning pattern
    this.neuralNetwork.triggerPattern('learning');

    // If emotional content, also activate amygdala connections
    if (Math.abs(processedInput.sentiment.score) > 0.3) {
      const amygdala = this.neuralNetwork.getRegion('amygdala');
      if (amygdala && amygdala.neurons.length > 0) {
        const amygNeuron = amygdala.neurons[0];
        for (const tn of topicNeurons) {
          this.neuralNetwork.createConnection(tn, amygNeuron.id, 0.15);
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Fallback processing (no LM server)
  // -----------------------------------------------------------------------

  /**
   * Process user input using only local heuristics (no LM server required).
   * @param userText Raw user text.
   * @returns A complete {@link AIResponse} using canned responses.
   */
  async fallbackProcess(userText: string): Promise<AIResponse> {
    const processedInput = this.basicAnalysis(userText);
    const events = this.neuralNetwork.triggerPattern('receive-message');
    const memories = this.memorySystem.retrieveRelevant(userText, 5);

    this.memorySystem.storeMemory(userText, processedInput.memoryClassification, {
      sentiment: processedInput.sentiment.score,
      importance: processedInput.importance,
    });

    const responseText = this.generateFallbackResponse(processedInput);

    const genEvents = this.neuralNetwork.triggerPattern('generate-response');
    events.push(...genEvents);

    this.evolutionManager.addXP(XP_REWARDS.messageProcessed);

    return {
      text: responseText,
      processedInput,
      memoriesUsed: memories,
      neuralActivations: events,
      evolutionState: this.evolutionManager.getCurrentStage(),
    };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** Basic heuristic input analysis when no LM is available. */
  private basicAnalysis(text: string): ProcessedInput {
    const lower = text.toLowerCase();
    const words = lower.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2);

    // Simple sentiment
    const positive = ['happy', 'good', 'great', 'love', 'like', 'awesome', 'wonderful', 'excited', 'thanks', 'amazing', 'joy', 'fun'];
    const negative = ['sad', 'bad', 'hate', 'angry', 'terrible', 'awful', 'upset', 'disappointed', 'worried', 'scared'];
    const posCount = words.filter((w) => positive.includes(w)).length;
    const negCount = words.filter((w) => negative.includes(w)).length;
    const score = (posCount - negCount) / Math.max(words.length, 1);
    const label = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral';

    // Filter stop words for topics
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
      'was', 'one', 'our', 'out', 'has', 'his', 'how', 'its', 'may', 'who',
      'did', 'get', 'him', 'let', 'say', 'she', 'too', 'use', 'way',
      'about', 'been', 'call', 'come', 'each', 'from', 'have', 'into', 'just',
      'know', 'like', 'make', 'many', 'more', 'much', 'only', 'over', 'some',
      'such', 'take', 'than', 'that', 'them', 'then', 'they', 'this', 'very',
      'what', 'when', 'will', 'with', 'your',
    ]);
    const topics = words.filter((w) => !stopWords.has(w) && w.length > 3).slice(0, 5);

    let importance = 0.4;
    if (text.includes('?')) importance += 0.15;
    if (text.length > 100) importance += 0.1;

    let memoryType = MemoryType.ShortTerm;
    if (importance > 0.6) memoryType = MemoryType.LongTerm;
    if (text.length < 15) memoryType = MemoryType.Ephemeral;

    return {
      originalText: text,
      sentiment: { score, label },
      topics,
      entities: [],
      importance: Math.min(importance, 1),
      memoryClassification: memoryType,
      connectionSuggestions: [],
    };
  }

  /** Pick a canned fallback response based on input analysis. */
  private generateFallbackResponse(input: ProcessedInput): string {
    let category: keyof typeof FALLBACK_RESPONSES = 'default';

    const lower = input.originalText.toLowerCase();
    if (/^(hi|hello|hey|greetings|howdy)\b/.test(lower)) {
      category = 'greeting';
    } else if (input.originalText.includes('?')) {
      category = 'question';
    } else if (input.sentiment.score > 0.2) {
      category = 'emotional_positive';
    } else if (input.sentiment.score < -0.2) {
      category = 'emotional_negative';
    }

    const options = FALLBACK_RESPONSES[category];
    return options[Math.floor(Math.random() * options.length)];
  }

  /** Simple non-cryptographic hash for deterministic neuron selection. */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash);
  }
}
