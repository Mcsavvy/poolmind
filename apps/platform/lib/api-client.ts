import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  NonceRequest, 
  NonceResponse, 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenRequest, 
  RefreshTokenResponse,
  UserProfileResponse,
  UpdateProfileResponse,
  UpdateUserProfile,
  UpdateNotificationPreferences,
  UpdateSocialLinks,
  ErrorResponse 
} from '@poolmind/shared-types';

export class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear invalid token
          this.token = null;
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
          }
        }
        return Promise.reject(error);
      }
    );

    // Initialize token from localStorage if available
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        this.token = savedToken;
      }
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  // Authentication endpoints
  async generateNonce(data: NonceRequest): Promise<NonceResponse> {
    const response: AxiosResponse<NonceResponse> = await this.client.post('/auth/nonce', data);
    return response.data;
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.client.post('/auth/login', data);
    const { token } = response.data;
    this.setToken(token);
    return response.data;
  }

  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const response: AxiosResponse<RefreshTokenResponse> = await this.client.post('/auth/refresh', data);
    const { token } = response.data;
    this.setToken(token);
    return response.data;
  }

  async getCurrentUser(): Promise<UserProfileResponse> {
    const response: AxiosResponse<UserProfileResponse> = await this.client.get('/auth/me');
    return response.data;
  }

  async logout(): Promise<void> {
    this.setToken(null);
    // Note: NestJS API doesn't seem to have a logout endpoint, so we just clear the token
  }

  // User profile endpoints
  async getUserProfile(): Promise<UserProfileResponse> {
    const response: AxiosResponse<UserProfileResponse> = await this.client.get('/users/profile');
    return response.data;
  }

  async updateUserProfile(data: UpdateUserProfile): Promise<UpdateProfileResponse> {
    const response: AxiosResponse<UpdateProfileResponse> = await this.client.patch('/users/profile', data);
    return response.data;
  }

  async updateNotificationPreferences(data: UpdateNotificationPreferences): Promise<UpdateProfileResponse> {
    const response: AxiosResponse<UpdateProfileResponse> = await this.client.patch('/users/notifications', data);
    return response.data;
  }

  async updateSocialLinks(data: UpdateSocialLinks): Promise<UpdateProfileResponse> {
    const response: AxiosResponse<UpdateProfileResponse> = await this.client.patch('/users/social-links', data);
    return response.data;
  }

  // Generic request method for extensibility
  async request<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, data?: any): Promise<T> {
    const response = await this.client.request({
      method,
      url,
      data,
    });
    return response.data;
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

export default apiClient;

// Export instance methods for easier importing
export const {
  generateNonce,
  login,
  refreshToken,
  getCurrentUser,
  logout,
  getUserProfile,
  updateUserProfile,
  updateNotificationPreferences,
  updateSocialLinks,
} = apiClient;