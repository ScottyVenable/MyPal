// Backend Service for communicating with embedded Node.js server
import { ApiResponse, Profile, Stats, NeuralNetwork, ChatRequest, ChatResponse, Message } from '../types';

class BackendService {
  private baseURL: string = 'http://localhost:3001';
  private currentProfileId: string | null = null;

  setCurrentProfile(profileId: string) {
    this.currentProfileId = profileId;
  }

  getCurrentProfile(): string | null {
    return this.currentProfileId;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Request failed',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Backend service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Health check
  async checkHealth(): Promise<boolean> {
    const result = await this.fetch<{ status: string }>('/api/health');
    return result.success && result.data?.status === 'ok';
  }

  // Profile management
  async getProfiles(): Promise<ApiResponse<Profile[]>> {
    return this.fetch<Profile[]>('/api/profiles');
  }

  async createProfile(name: string): Promise<ApiResponse<Profile>> {
    return this.fetch<Profile>('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async loadProfile(id: string): Promise<ApiResponse<Profile>> {
    const result = await this.fetch<Profile>(`/api/profiles/${id}/load`, {
      method: 'POST',
    });
    if (result.success) {
      this.currentProfileId = id;
    }
    return result;
  }

  async deleteProfile(id: string): Promise<ApiResponse<void>> {
    return this.fetch<void>(`/api/profiles/${id}`, {
      method: 'DELETE',
    });
  }

  // Chat
  async sendMessage(message: string): Promise<ApiResponse<ChatResponse>> {
    if (!this.currentProfileId) {
      return {
        success: false,
        error: 'No profile loaded',
      };
    }

    return this.fetch<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        profileId: this.currentProfileId,
      }),
    });
  }

  async reinforceMessage(messageId: string): Promise<ApiResponse<void>> {
    return this.fetch<void>('/api/reinforce', {
      method: 'POST',
      body: JSON.stringify({ messageId }),
    });
  }

  async getChatLog(): Promise<ApiResponse<Message[]>> {
    return this.fetch<Message[]>('/api/chatlog');
  }

  // Stats
  async getStats(): Promise<ApiResponse<Stats>> {
    return this.fetch<Stats>('/api/stats');
  }

  // Neural Network
  async getNeuralNetwork(): Promise<ApiResponse<NeuralNetwork>> {
    return this.fetch<NeuralNetwork>('/api/neural-network');
  }

  async regenerateNeuralNetwork(): Promise<ApiResponse<NeuralNetwork>> {
    return this.fetch<NeuralNetwork>('/api/neural/regenerate', {
      method: 'POST',
    });
  }

  // Settings
  async updateSettings(settings: Partial<any>): Promise<ApiResponse<void>> {
    return this.fetch<void>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  // Export
  async exportData(): Promise<ApiResponse<any>> {
    return this.fetch<any>('/api/export');
  }

  // Reset
  async resetPal(): Promise<ApiResponse<void>> {
    return this.fetch<void>('/api/reset', {
      method: 'POST',
    });
  }
}

export default new BackendService();
