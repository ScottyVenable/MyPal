/**
 * AI Model Adapter - Unified interface for multiple AI providers
 * Supports: Ollama (local), OpenAI, Azure OpenAI, Google Gemini, and local-only fallback
 */

import http from 'http';
import https from 'https';

class ModelAdapter {
  constructor(config = {}) {
    this.provider = config.provider || 'local'; // 'local', 'ollama', 'openai', 'azure', 'gemini'
    this.apiKey = config.apiKey || null;
    this.endpoint = config.endpoint || this.getDefaultEndpoint();
    this.model = config.model || this.getDefaultModel();
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens || 150;
  }

  getDefaultEndpoint() {
    switch (this.provider) {
      case 'ollama':
        return 'http://localhost:11434';
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'azure':
        return process.env.AZURE_OPENAI_ENDPOINT || '';
      case 'gemini':
        return 'https://generativelanguage.googleapis.com/v1';
      default:
        return null;
    }
  }

  getDefaultModel() {
    switch (this.provider) {
      case 'ollama':
        return 'llama3.2:3b'; // 4-bit quantized, perfect for RTX 4050 4GB VRAM
      case 'openai':
        return 'gpt-3.5-turbo';
      case 'azure':
        return 'gpt-35-turbo';
      case 'gemini':
        return 'gemini-1.5-flash';
      default:
        return null;
    }
  }

  /**
   * Generate a response from the AI model
   * @param {string} prompt - The formatted prompt
   * @param {object} options - Generation options
   * @returns {Promise<string>} - Generated response
   */
  async generate(prompt, options = {}) {
    const temp = options.temperature ?? this.temperature;
    const maxTok = options.maxTokens ?? this.maxTokens;

    switch (this.provider) {
      case 'ollama':
        return this.generateOllama(prompt, temp, maxTok, options);
      case 'openai':
        return this.generateOpenAI(prompt, temp, maxTok, options);
      case 'azure':
        return this.generateAzure(prompt, temp, maxTok, options);
      case 'gemini':
        return this.generateGemini(prompt, temp, maxTok, options);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  /**
   * Ollama generation (local)
   */
  async generateOllama(prompt, temperature, maxTokens, options = {}) {
    const payload = {
      model: options.model || this.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: temperature,
        num_predict: maxTokens,
        stop: options.stop || ['\n\n', 'User:', 'Human:'],
      }
    };

    const response = await this.httpRequest('POST', `${this.endpoint}/api/generate`, payload);
    return response.response || '';
  }

  /**
   * OpenAI generation
   */
  async generateOpenAI(prompt, temperature, maxTokens, options = {}) {
    if (!this.apiKey) throw new Error('OpenAI API key required');

    const payload = {
      model: options.model || this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: temperature,
      max_tokens: maxTokens,
      stop: options.stop || null,
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    const response = await this.httpRequest('POST', `${this.endpoint}/chat/completions`, payload, headers);
    return response.choices?.[0]?.message?.content || '';
  }

  /**
   * Azure OpenAI generation
   */
  async generateAzure(prompt, temperature, maxTokens, options = {}) {
    if (!this.apiKey) throw new Error('Azure OpenAI API key required');
    if (!this.endpoint) throw new Error('Azure OpenAI endpoint required');

    const payload = {
      messages: [{ role: 'user', content: prompt }],
      temperature: temperature,
      max_tokens: maxTokens,
    };

    const headers = {
      'Content-Type': 'application/json',
      'api-key': this.apiKey
    };

    const url = `${this.endpoint}/openai/deployments/${this.model}/chat/completions?api-version=2023-05-15`;
    const response = await this.httpRequest('POST', url, payload, headers);
    return response.choices?.[0]?.message?.content || '';
  }

  /**
   * Google Gemini generation
   */
  async generateGemini(prompt, temperature, maxTokens, options = {}) {
    if (!this.apiKey) throw new Error('Gemini API key required');

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: maxTokens,
        stopSequences: options.stop || [],
      }
    };

    const url = `${this.endpoint}/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await this.httpRequest('POST', url, payload);
    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Check if the provider is available and healthy
   */
  async healthCheck() {
    try {
      switch (this.provider) {
        case 'ollama':
          const response = await this.httpRequest('GET', `${this.endpoint}/api/tags`);
          return { healthy: true, models: response.models || [] };
        case 'openai':
        case 'azure':
        case 'gemini':
          // For cloud providers, just check if API key exists
          return { healthy: !!this.apiKey, requiresKey: !this.apiKey };
        default:
          return { healthy: false, error: 'Unknown provider' };
      }
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * List available models (Ollama only for now)
   */
  async listModels() {
    if (this.provider !== 'ollama') {
      return { models: [this.model] }; // Return configured model for cloud providers
    }

    try {
      const response = await this.httpRequest('GET', `${this.endpoint}/api/tags`);
      return { models: response.models || [] };
    } catch (error) {
      return { models: [], error: error.message };
    }
  }

  /**
   * HTTP request helper
   */
  httpRequest(method, url, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (data && method !== 'GET') {
        const payload = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = client.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error?.message || `HTTP ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${body.substring(0, 100)}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data && method !== 'GET') {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }
}

export default ModelAdapter;

