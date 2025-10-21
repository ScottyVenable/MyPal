import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string = 'http://localhost:3001';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests if available
    this.client.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Profile Management
  async getProfiles() {
    const response = await this.client.get('/api/profiles');
    return response.data;
  }

  async createProfile(name: string) {
    const response = await this.client.post('/api/profiles', { name });
    return response.data;
  }

  async loadProfile(profileId: string) {
    const response = await this.client.post(`/api/profiles/${profileId}/load`);
    return response.data;
  }

  async deleteProfile(profileId: string) {
    const response = await this.client.delete(`/api/profiles/${profileId}`);
    return response.data;
  }

  // Chat
  async sendMessage(message: string) {
    const response = await this.client.post('/api/chat', { message });
    return response.data;
  }

  async getChatHistory(limit: number = 50) {
    const response = await this.client.get(`/api/chat?limit=${limit}`);
    return response.data;
  }

  // Stats
  async getStats() {
    const response = await this.client.get('/api/state');
    return response.data;
  }

  // Memories
  async getMemories(limit: number = 20) {
    const response = await this.client.get(`/api/memories?limit=${limit}`);
    return response.data;
  }

  // Brain/Neural Network
  async getBrainData() {
    const response = await this.client.get('/api/brain');
    return response.data;
  }

  async getNeuralNetwork() {
    const response = await this.client.get('/api/neural');
    return response.data;
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      return { status: 'offline' };
    }
  }
}

export default new ApiClient();
