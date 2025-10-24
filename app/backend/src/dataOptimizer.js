/**
 * Data Structure Optimizer
 * Reduces redundancy in chat logs, memories, and vocabulary data
 */

class DataOptimizer {
  /**
   * Create a context index from vocabulary entries
   * Removes duplicate contexts and creates a reference system
   */
  static optimizeVocabulary(vocabulary) {
    const contextIndex = new Map();
    let contextIdCounter = 0;

    const optimized = vocabulary.map(entry => {
      // Process contexts to create references
      const contextRefs = entry.contexts?.map(ctx => {
        // Check if this context already exists
        if (contextIndex.has(ctx)) {
          return contextIndex.get(ctx);
        }
        
        // Create new context reference
        const contextId = `ctx_${contextIdCounter++}`;
        contextIndex.set(ctx, contextId);
        return contextId;
      }) || [];

      return {
        id: entry.id,
        word: entry.word,
        count: entry.count,
        knownBy: entry.knownBy,
        lastSeen: entry.lastSeen,
        contexts: contextRefs // Now stores IDs instead of full text
      };
    });

    // Convert context index to array format for storage
    const contexts = Array.from(contextIndex.entries()).map(([text, id]) => ({
      id,
      text
    }));

    return { vocabulary: optimized, contexts };
  }

  /**
   * Restore vocabulary with full context text from index
   */
  static restoreVocabulary(optimizedVocabulary, contexts) {
    const contextMap = new Map(contexts.map(c => [c.id, c.text]));

    return optimizedVocabulary.map(entry => ({
      ...entry,
      contexts: entry.contexts?.map(ctxId => contextMap.get(ctxId) || ctxId) || []
    }));
  }

  /**
   * Optimize memories by referencing chat log entries instead of duplicating text
   */
  static optimizeMemories(memories, chatLog) {
    // Create a map of chat messages by timestamp (roughly)
    const chatMap = new Map();
    
    for (let i = 0; i < chatLog.length - 1; i += 2) {
      const userMsg = chatLog[i];
      const palMsg = chatLog[i + 1];
      
      if (userMsg?.role === 'user' && palMsg?.role === 'pal') {
        const key = `${userMsg.ts}_${palMsg.ts}`;
        chatMap.set(key, { userMsgId: userMsg.id, palMsgId: palMsg.id });
      }
    }

    const optimized = memories.map(memory => {
      // Try to find matching chat entry
      let chatRef = null;
      
      for (const [key, value] of chatMap.entries()) {
        const [userTs] = key.split('_').map(Number);
        // Allow 1 second tolerance for timestamp matching
        if (Math.abs(userTs - memory.ts) < 1000) {
          chatRef = value;
          break;
        }
      }

      if (chatRef) {
        // Use chat reference instead of storing full text
        const optimizedMemory = {
          id: memory.id,
          ts: memory.ts,
          chatRef, // Reference to chat log entries
          summary: memory.summary,
          sentiment: memory.sentiment,
          keywords: memory.keywords,
          xp: memory.xp,
          importance: {
            score: memory.importance.score,
            level: memory.importance.level,
            shouldRemember: memory.importance.shouldRemember,
            reasons: memory.importance.reasons,
            tags: memory.importance.tags // Keep only one tags array
          },
          subjectiveNarrative: memory.subjectiveNarrative
        };
        
        return optimizedMemory;
      }

      // Fallback: keep original if no chat reference found
      return memory;
    });

    return optimized;
  }

  /**
   * Restore memories with full text from chat log
   */
  static restoreMemories(optimizedMemories, chatLog) {
    const chatMap = new Map(chatLog.map(msg => [msg.id, msg]));

    return optimizedMemories.map(memory => {
      if (memory.chatRef) {
        const userMsg = chatMap.get(memory.chatRef.userMsgId);
        const palMsg = chatMap.get(memory.chatRef.palMsgId);

        return {
          ...memory,
          userText: userMsg?.text || '',
          palText: palMsg?.text || '',
          tags: memory.importance?.tags || memory.tags || []
        };
      }

      // Already has full text
      return memory;
    });
  }

  /**
   * Calculate space savings from optimization
   */
  static calculateSavings(original, optimized) {
    const originalSize = JSON.stringify(original).length;
    const optimizedSize = JSON.stringify(optimized).length;
    const savings = originalSize - optimizedSize;
    const percent = ((savings / originalSize) * 100).toFixed(2);

    return {
      originalSize,
      optimizedSize,
      savings,
      percent
    };
  }

  /**
   * Optimize all profile data structures
   */
  static optimizeProfile(profileData) {
    const { vocabulary, memories, chatLog } = profileData;
    const optimizations = {};

    // Optimize vocabulary
    if (vocabulary && vocabulary.length > 0) {
      const vocabOpt = this.optimizeVocabulary(vocabulary);
      optimizations.vocabulary = vocabOpt.vocabulary;
      optimizations.vocabularyContexts = vocabOpt.contexts;
      optimizations.vocabularySavings = this.calculateSavings(vocabulary, vocabOpt.vocabulary);
    }

    // Optimize memories
    if (memories && memories.length > 0 && chatLog) {
      const memoriesOpt = this.optimizeMemories(memories, chatLog);
      optimizations.memories = memoriesOpt;
      optimizations.memoriesSavings = this.calculateSavings(memories, memoriesOpt);
    }

    return optimizations;
  }

  /**
   * Restore all profile data structures
   */
  static restoreProfile(optimizedData) {
    const restored = {};

    if (optimizedData.vocabulary && optimizedData.vocabularyContexts) {
      restored.vocabulary = this.restoreVocabulary(
        optimizedData.vocabulary,
        optimizedData.vocabularyContexts
      );
    }

    if (optimizedData.memories && optimizedData.chatLog) {
      restored.memories = this.restoreMemories(
        optimizedData.memories,
        optimizedData.chatLog
      );
    }

    return restored;
  }
}

export default DataOptimizer;
