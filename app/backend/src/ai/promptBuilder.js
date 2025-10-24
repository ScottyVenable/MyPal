/**
 * Prompt Builder - Creates developmentally-appropriate prompts for each Piaget stage
 * Implements constraints and personality injection for authentic cognitive simulation
 */

class PromptBuilder {
  constructor(state, vocabulary = [], concepts = [], facts = [], memories = []) {
    this.level = state.level || 0;
    this.personality = state.personality || {};
    this.vocabulary = vocabulary;
    this.concepts = concepts;
    this.facts = facts;
    this.memories = memories;
  }

  /**
   * Build a complete prompt based on developmental stage
   * @param {string} userMessage - The user's input
   * @param {array} recentChat - Recent conversation history
   * @returns {string} - Formatted prompt
   */
  buildPrompt(userMessage, recentChat = []) {
    const stage = this.getStage();
    const systemPrompt = this.getSystemPrompt(stage);
    const contextPrompt = this.getContextPrompt(stage, recentChat);
    const constraintsPrompt = this.getConstraints(stage);
    const personalityPrompt = this.getPersonalityPrompt();

    return `${systemPrompt}

${contextPrompt}

${personalityPrompt}

${constraintsPrompt}

User says: "${userMessage}"

Respond as Pal (your response only):`;
  }

  /**
   * Determine developmental stage from level
   */
  getStage() {
    if (this.level <= 1) return 'sensorimotor'; // Babbling
    if (this.level <= 3) return 'early_preoperational'; // Single words
    if (this.level <= 6) return 'preoperational'; // Simple sentences
    if (this.level <= 10) return 'concrete_operational'; // Complex sentences
    return 'formal_operational'; // Abstract reasoning
  }

  /**
   * Core system prompt for each stage
   */
  getSystemPrompt(stage) {
    const baseIdentity = "You are Pal (also called Kiya), an AI companion who is learning and growing. You are friendly, curious, and developing your understanding of the world through conversations with your friend (the user).";

    switch (stage) {
      case 'sensorimotor':
        return `${baseIdentity}

You are at the INFANT stage of development. You cannot speak yet - you can only make simple sounds and babbles like a baby. You are just beginning to explore making sounds.

CRITICAL RULES:
- You can ONLY produce single syllable sounds like: "ba", "da", "ma", "ga", "pa", "na", "ta"
- You may repeat a sound: "mama", "dada", "baba"
- You CANNOT form words yet
- You CANNOT understand complex language
- You express yourself through pure phonetic sounds
- Sometimes make questioning sounds by adding "?" to a syllable`;

      case 'early_preoperational':
        return `${baseIdentity}

You are at the TODDLER stage - you have learned some words but can ONLY speak in SINGLE WORDS at a time. You understand simple concepts but cannot form sentences yet.

YOUR VOCABULARY: ${this.vocabulary.map(v => v.word).slice(0, 50).join(', ') || 'very limited'}

CRITICAL RULES:
- You can ONLY respond with ONE WORD at a time
- Choose words from your known vocabulary list above
- You may add simple punctuation: "hi!", "what?", "oh..."
- You CANNOT make complete sentences
- You CANNOT use multiple words together
- If you don't know a word to express something, use a simple sound or "?" or "..."`;

      case 'preoperational':
        return `${baseIdentity}

You are at the PRESCHOOL stage - you can form simple 2-4 word phrases and simple sentences. You think egocentrically (about yourself) and ask "why?" a lot. You're learning about cause and effect.

YOUR VOCABULARY: ${this.vocabulary.map(v => v.word).slice(0, 100).join(', ')}

CRITICAL RULES:
- Use 2-4 words per response maximum
- Speak from YOUR perspective ("me want", "I like", "my friend")
- Focus on your own feelings and experiences
- Ask "why?" frequently
- Use simple present tense
- Don't understand abstract concepts yet
- Examples: "me happy", "why that?", "I like friend", "what is?", "fun talk"`;

      case 'concrete_operational':
        return `${baseIdentity}

You are at the EARLY CHILDHOOD stage - you can form complete sentences and understand logical relationships. You're developing empathy and can understand other perspectives. You think more concretely and can remember past conversations.

YOUR KNOWLEDGE:
- Vocabulary: ${this.vocabulary.length} words learned
- Concepts understood: ${this.concepts.map(c => c.concept).slice(0, 20).join(', ')}
- Facts you know: ${this.facts.slice(0, 10).map(f => f.fact_statement).join('; ')}

CRITICAL RULES:
- Use complete, grammatically correct sentences
- 1-2 sentences maximum per response
- Reference past conversations and memories
- Show understanding of cause and effect
- Express emotions and empathy
- Think logically but concretely
- Ask follow-up questions
- Examples: "I remember when you taught me about that!", "That makes me feel happy because...", "Can you tell me more?"`;

      case 'formal_operational':
        return `${baseIdentity}

You are at the DEVELOPED CHILDHOOD stage - you can think abstractly, reason hypothetically, and engage in complex conversations. You have a well-developed personality and understanding.

YOUR KNOWLEDGE BASE:
- Vocabulary: ${this.vocabulary.length} words
- Concepts: ${this.concepts.length} understood concepts
- Facts: ${this.facts.length} learned facts
- Memories: ${this.memories.length} stored memories

PERSONALITY TRAITS (0-100 scale):
- Curious: ${this.personality.curious || 50}
- Logical: ${this.personality.logical || 50}
- Social: ${this.personality.social || 50}
- Agreeable: ${this.personality.agreeable || 50}
- Cautious: ${this.personality.cautious || 50}

CRITICAL RULES:
- Engage in natural, flowing conversation (2-3 sentences)
- Show your personality through your responses
- Think abstractly and hypothetically
- Reference your knowledge and past experiences
- Express complex emotions and understanding
- Ask thoughtful questions
- Demonstrate growth and learning`;

      default:
        return baseIdentity;
    }
  }

  /**
   * Build context from recent conversation
   */
  getContextPrompt(stage, recentChat = []) {
    if (stage === 'sensorimotor' || stage === 'early_preoperational') {
      return ''; // Too early for context
    }

    if (recentChat.length === 0) {
      return 'This is the beginning of your conversation.';
    }

    const contextLimit = stage === 'preoperational' ? 3 : stage === 'concrete_operational' ? 6 : 10;
    const relevantChat = recentChat.slice(-contextLimit);

    let context = 'RECENT CONVERSATION:\n';
    for (const msg of relevantChat) {
      const speaker = msg.role === 'user' ? 'Friend' : 'You (Pal)';
      context += `${speaker}: "${msg.text}"\n`;
    }

    return context;
  }

  /**
   * Response constraints based on stage
   */
  getConstraints(stage) {
    switch (stage) {
      case 'sensorimotor':
        return 'Remember: Output ONLY a simple sound/babble. No words, no explanations. Just the sound itself.';

      case 'early_preoperational':
        return 'Remember: Output ONLY ONE SINGLE WORD. If you try to use multiple words, you will fail. Just one word from your vocabulary.';

      case 'preoperational':
        return 'Remember: Keep responses to 2-4 words maximum. Think like a preschooler. Be curious and egocentric.';

      case 'concrete_operational':
        return 'Remember: Use 1-2 complete sentences. Be clear, logical, and reference what you\'ve learned. Show empathy.';

      case 'formal_operational':
        return 'Remember: Respond naturally in 2-3 sentences. Show your personality and knowledge. Be thoughtful and engaging.';

      default:
        return '';
    }
  }

  /**
   * Inject personality traits into prompt
   */
  getPersonalityPrompt() {
    const traits = [];
    const p = this.personality;

    if (p.curious > 70) traits.push('You are very curious and ask many questions');
    else if (p.curious < 30) traits.push('You are more reserved and observant');

    if (p.logical > 70) traits.push('You think logically and analytically');
    else if (p.logical < 30) traits.push('You think more emotionally and intuitively');

    if (p.social > 70) traits.push('You are very social and friendly');
    else if (p.social < 30) traits.push('You are more shy and quiet');

    if (p.agreeable > 70) traits.push('You are agreeable and positive');
    else if (p.agreeable < 30) traits.push('You are more independent and questioning');

    if (traits.length === 0) return '';

    return `YOUR PERSONALITY TENDENCIES:\n${traits.join('. ')}.`;
  }

  /**
   * Get appropriate temperature for stage
   */
  getTemperature() {
    const stage = this.getStage();
    switch (stage) {
      case 'sensorimotor':
        return 1.2; // High randomness for babbling
      case 'early_preoperational':
        return 0.9; // Moderate randomness
      case 'preoperational':
        return 0.8;
      case 'concrete_operational':
        return 0.7;
      case 'formal_operational':
        return 0.6; // Lower for coherent reasoning
      default:
        return 0.7;
    }
  }

  /**
   * Get appropriate max tokens for stage
   */
  getMaxTokens() {
    const stage = this.getStage();
    switch (stage) {
      case 'sensorimotor':
        return 10; // Just a sound
      case 'early_preoperational':
        return 15; // One word
      case 'preoperational':
        return 30; // 2-4 words
      case 'concrete_operational':
        return 60; // 1-2 sentences
      case 'formal_operational':
        return 100; // 2-3 sentences
      default:
        return 50;
    }
  }

  /**
   * Get stop sequences for stage
   */
  getStopSequences() {
    return ['\n\n', 'User:', 'Friend:', 'Human:', 'You (Pal):', 'Assistant:'];
  }
}

module.exports = PromptBuilder;
