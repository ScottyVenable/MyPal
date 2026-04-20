/**
 * @module @mypal/ai-engine/lm-server
 * Language model client that communicates with an external LM server
 * (e.g. Ollama, llama.cpp, or any OpenAI-compatible endpoint).
 *
 * Uses the `fetch` API so it works in both React Native and modern browsers.
 */

import { LMServerConfig, ProcessedInput, MemoryType } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for a generation request. */
export interface GenerateOptions {
  /** Override the configured temperature for this request. */
  temperature?: number;
  /** Override the configured max tokens for this request. */
  maxTokens?: number;
  /** System prompt prepended to the conversation. */
  systemPrompt?: string;
  /** Streaming callback invoked for each token/chunk. */
  onToken?: (token: string) => void;
  /** Stop sequences that terminate generation. */
  stopSequences?: string[];
}

/** Health check result. */
export interface LMServerStatus {
  connected: boolean;
  model: string;
  endpoint: string;
  latencyMs: number | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// LMClient class
// ---------------------------------------------------------------------------

/**
 * Client for communicating with an external language model server.
 *
 * Supports retry with exponential backoff, streaming via callback,
 * and structured input analysis.
 */
export class LMClient {
  private config: LMServerConfig;
  private connected: boolean = false;

  private readonly MAX_RETRIES = 3;
  private readonly BASE_RETRY_DELAY_MS = 500;

  constructor(config: LMServerConfig) {
    this.config = { ...config };
  }

  // -----------------------------------------------------------------------
  // Connection lifecycle
  // -----------------------------------------------------------------------

  /**
   * Test the connection to the LM server.
   * @returns `true` if the server responded successfully.
   */
  async connect(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      this.connected = status.connected;
      return this.connected;
    } catch {
      this.connected = false;
      return false;
    }
  }

  /** Mark the client as disconnected. */
  disconnect(): void {
    this.connected = false;
  }

  /** Whether the client believes it is connected. */
  isConnected(): boolean {
    return this.connected;
  }

  // -----------------------------------------------------------------------
  // Generation
  // -----------------------------------------------------------------------

  /**
   * Send a prompt to the language model and return the generated text.
   *
   * Supports streaming via `options.onToken` callback.
   * @param prompt The full prompt string.
   * @param options Generation options.
   * @returns The complete generated text.
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const body = this.buildRequestBody(prompt, options);
    const response = await this.fetchWithRetry('/api/generate', body);

    if (options?.onToken && response.body) {
      return this.handleStreamingResponse(response, options.onToken);
    }

    const json = await response.json();
    return this.extractResponseText(json);
  }

  /**
   * Analyse user input and return a structured {@link ProcessedInput}.
   *
   * Sends a specially crafted prompt that asks the model to return JSON.
   * Falls back to basic heuristic analysis if the model response cannot be parsed.
   * @param text Raw user text.
   */
  async analyzeInput(text: string): Promise<ProcessedInput> {
    const analysisPrompt = [
      'Analyze the following user message and return a JSON object with these fields:',
      '- sentiment: { score: number (-1 to 1), label: string }',
      '- topics: string[]',
      '- entities: string[]',
      '- importance: number (0 to 1)',
      '- memoryClassification: one of "ephemeral", "short-term", "long-term", "episodic"',
      '',
      'Respond ONLY with valid JSON, no markdown or explanation.',
      '',
      `User message: "${text}"`,
    ].join('\n');

    try {
      const raw = await this.generate(analysisPrompt, {
        temperature: 0.2,
        maxTokens: 512,
      });

      const parsed = this.parseAnalysisResponse(raw, text);
      return parsed;
    } catch {
      // Fall back to heuristic analysis when LM is unavailable
      return this.heuristicAnalysis(text);
    }
  }

  /**
   * Generate a conversational response given an assembled context object.
   * @param context Context object containing system prompt, memories, and user input.
   * @returns Generated response text.
   */
  async generateResponse(context: {
    systemPrompt: string;
    userMessage: string;
    conversationHistory?: string[];
  }): Promise<string> {
    const parts: string[] = [context.systemPrompt];

    if (context.conversationHistory && context.conversationHistory.length > 0) {
      parts.push('\n--- Conversation History ---');
      for (const msg of context.conversationHistory) {
        parts.push(msg);
      }
    }

    parts.push(`\nUser: ${context.userMessage}`);
    parts.push('\nAssistant:');

    const prompt = parts.join('\n');
    return this.generate(prompt, { temperature: this.config.temperature });
  }

  // -----------------------------------------------------------------------
  // Health check
  // -----------------------------------------------------------------------

  /** Perform a health check against the LM server. */
  async getStatus(): Promise<LMServerStatus> {
    const start = Date.now();
    try {
      const response = await this.timedFetch(`${this.config.endpoint}/api/tags`, {
        method: 'GET',
        headers: this.buildHeaders(),
      });

      const latency = Date.now() - start;

      if (response.ok) {
        this.connected = true;
        return {
          connected: true,
          model: this.config.model,
          endpoint: this.config.endpoint,
          latencyMs: latency,
        };
      }

      this.connected = false;
      return {
        connected: false,
        model: this.config.model,
        endpoint: this.config.endpoint,
        latencyMs: latency,
        error: `Server returned ${response.status}`,
      };
    } catch (err: unknown) {
      this.connected = false;
      const message = err instanceof Error ? err.message : String(err);
      return {
        connected: false,
        model: this.config.model,
        endpoint: this.config.endpoint,
        latencyMs: null,
        error: message,
      };
    }
  }

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  /** Update client configuration. Re-tests connection on next call. */
  updateConfig(config: Partial<LMServerConfig>): void {
    this.config = { ...this.config, ...config };
    this.connected = false;
  }

  /** Return a read-only copy of the current config. */
  getConfig(): Readonly<LMServerConfig> {
    return { ...this.config };
  }

  // -----------------------------------------------------------------------
  // Private – network helpers
  // -----------------------------------------------------------------------

  /**
   * Perform a POST request with retry and exponential backoff.
   * @param path URL path appended to the configured endpoint.
   * @param body JSON-serialisable request body.
   */
  private async fetchWithRetry(
    path: string,
    body: Record<string, unknown>,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const response = await this.timedFetch(`${this.config.endpoint}${path}`, {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify(body),
        });

        if (response.ok) {
          this.connected = true;
          return response;
        }

        // Non-retryable client errors
        if (response.status >= 400 && response.status < 500) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`LM server error ${response.status}: ${errorText}`);
        }

        lastError = new Error(`LM server returned ${response.status}`);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }

      // Exponential backoff before next attempt
      if (attempt < this.MAX_RETRIES - 1) {
        const delay = this.BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    this.connected = false;
    throw lastError ?? new Error('LM server request failed after retries');
  }

  /** `fetch` wrapper that enforces the configured timeout. */
  private async timedFetch(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  private buildRequestBody(
    prompt: string,
    options?: GenerateOptions,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.config.model,
      prompt,
      stream: !!options?.onToken,
      options: {
        temperature: options?.temperature ?? this.config.temperature,
        num_predict: options?.maxTokens ?? this.config.maxTokens,
      },
    };

    if (options?.systemPrompt) {
      body['system'] = options.systemPrompt;
    }

    if (options?.stopSequences && options.stopSequences.length > 0) {
      body['stop'] = options.stopSequences;
    }

    return body;
  }

  // -----------------------------------------------------------------------
  // Private – streaming
  // -----------------------------------------------------------------------

  /** Read a streaming response line-by-line, invoking the token callback. */
  private async handleStreamingResponse(
    response: Response,
    onToken: (token: string) => void,
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      const json = await response.json();
      return this.extractResponseText(json);
    }

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const chunk = JSON.parse(trimmed);
          const token = chunk.response ?? chunk.content ?? '';
          if (token) {
            fullText += token;
            onToken(token);
          }
        } catch {
          // skip malformed lines
        }
      }
    }

    return fullText;
  }

  // -----------------------------------------------------------------------
  // Private – response parsing helpers
  // -----------------------------------------------------------------------

  /** Extract the textual response from various JSON shapes. */
  private extractResponseText(json: Record<string, unknown>): string {
    if (typeof json['response'] === 'string') return json['response'];
    if (typeof json['content'] === 'string') return json['content'];
    if (
      Array.isArray(json['choices']) &&
      json['choices'].length > 0 &&
      typeof (json['choices'] as Array<Record<string, unknown>>)[0]?.['text'] === 'string'
    ) {
      return (json['choices'] as Array<Record<string, string>>)[0]['text'];
    }
    // OpenAI chat-style response
    if (
      Array.isArray(json['choices']) &&
      json['choices'].length > 0
    ) {
      const first = (json['choices'] as Array<Record<string, unknown>>)[0];
      const msg = first['message'] as Record<string, unknown> | undefined;
      if (msg && typeof msg['content'] === 'string') {
        return msg['content'];
      }
    }
    return JSON.stringify(json);
  }

  /** Parse the structured analysis JSON from the model response. */
  private parseAnalysisResponse(raw: string, originalText: string): ProcessedInput {
    // Try to find a JSON block in the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return this.heuristicAnalysis(originalText);

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        originalText,
        sentiment: {
          score: typeof parsed.sentiment?.score === 'number' ? parsed.sentiment.score : 0,
          label: typeof parsed.sentiment?.label === 'string' ? parsed.sentiment.label : 'neutral',
        },
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        importance: typeof parsed.importance === 'number' ? parsed.importance : 0.5,
        memoryClassification: this.parseMemoryType(parsed.memoryClassification),
        connectionSuggestions: [],
      };
    } catch {
      return this.heuristicAnalysis(originalText);
    }
  }

  /** Map a raw string to a valid MemoryType. */
  private parseMemoryType(raw: unknown): MemoryType {
    const str = String(raw).toLowerCase();
    if (str.includes('long')) return MemoryType.LongTerm;
    if (str.includes('episodic')) return MemoryType.Episodic;
    if (str.includes('ephemeral')) return MemoryType.Ephemeral;
    return MemoryType.ShortTerm;
  }

  // -----------------------------------------------------------------------
  // Private – heuristic fallback
  // -----------------------------------------------------------------------

  /** Produce a basic {@link ProcessedInput} using keyword heuristics. */
  private heuristicAnalysis(text: string): ProcessedInput {
    const lower = text.toLowerCase();
    const words = lower.split(/\s+/).filter((w) => w.length > 2);

    // Simple sentiment
    const positiveWords = ['happy', 'good', 'great', 'love', 'like', 'awesome', 'wonderful', 'excited', 'thanks', 'thank', 'amazing', 'joy', 'fun'];
    const negativeWords = ['sad', 'bad', 'hate', 'angry', 'annoyed', 'terrible', 'awful', 'upset', 'disappointed', 'worried', 'scared', 'hurt'];
    const posCount = words.filter((w) => positiveWords.includes(w)).length;
    const negCount = words.filter((w) => negativeWords.includes(w)).length;
    const sentimentScore = (posCount - negCount) / Math.max(words.length, 1);
    const sentimentLabel = sentimentScore > 0.1 ? 'positive' : sentimentScore < -0.1 ? 'negative' : 'neutral';

    // Topics = frequent non-stopword tokens
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
      'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
      'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
      'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
      'because', 'but', 'and', 'or', 'if', 'while', 'that', 'this', 'what',
      'which', 'who', 'whom', 'its', 'you', 'your', 'yours', 'him', 'his',
      'her', 'she', 'they', 'them', 'their', 'our', 'my', 'me', 'i',
    ]);
    const topics = words
      .filter((w) => !stopWords.has(w) && w.length > 3)
      .slice(0, 5);

    // Importance heuristic
    const hasQuestion = text.includes('?');
    const isLong = text.length > 100;
    let importance = 0.4;
    if (hasQuestion) importance += 0.15;
    if (isLong) importance += 0.1;
    if (Math.abs(sentimentScore) > 0.3) importance += 0.1;
    importance = Math.min(importance, 1);

    // Memory classification
    let memoryType = MemoryType.ShortTerm;
    if (importance > 0.7) memoryType = MemoryType.LongTerm;
    else if (text.length < 20) memoryType = MemoryType.Ephemeral;

    return {
      originalText: text,
      sentiment: { score: sentimentScore, label: sentimentLabel },
      topics,
      entities: [],
      importance,
      memoryClassification: memoryType,
      connectionSuggestions: [],
    };
  }

  // -----------------------------------------------------------------------
  // Private – utilities
  // -----------------------------------------------------------------------

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
