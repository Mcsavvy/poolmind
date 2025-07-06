import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import {
  User,
  ApiResponse,
  TelegramAuthRequest,
  AuthResponse,
  UpdateProfileRequest,
} from '../types';

class ApiService {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: config.api.baseUrl,
      timeout: 30000, // Increased timeout for authentication requests
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PoolMind-Telegram-Bot/1.0.0',
      },
    });

    this.setupInterceptors();
  }

  // Set authentication token for API requests
  setAuthToken(token: string): void {
    this.authToken = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Clear authentication token
  clearAuthToken(): void {
    this.authToken = null;
    delete this.client.defaults.headers.common['Authorization'];
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        logger.debug(
          `API Request: ${config.method?.toUpperCase()} ${config.url}`
        );
        return config;
      },
      error => {
        logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.debug(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      error => {
        logger.error('API Response Error:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.response?.data?.message || error.message,
        });

        // Handle 401 unauthorized - clear token
        if (error.response?.status === 401) {
          this.clearAuthToken();
        }

        return Promise.reject(error);
      }
    );
  }

  // Authentication Methods
  async authenticateTelegram(
    authData: TelegramAuthRequest
  ): Promise<AuthResponse> {
    try {
      const response = await this.client.post(
        '/api/v1/auth/telegram',
        authData
      );
      const authResponse: AuthResponse = response.data;

      // Store the JWT token for future requests
      if (authResponse.success && authResponse.data?.token) {
        this.setAuthToken(authResponse.data.token);
      }

      return authResponse;
    } catch (error) {
      logger.error('Failed to authenticate with Telegram:', error);
      throw this.handleError(error);
    }
  }

  async getUserProfile(): Promise<ApiResponse<User>> {
    try {
      const response = await this.client.get('/api/v1/auth/profile');
      return response.data;
    } catch (error) {
      logger.error('Failed to get user profile:', error);
      throw this.handleError(error);
    }
  }

  async updateUserProfile(
    profileData: UpdateProfileRequest
  ): Promise<ApiResponse<User>> {
    try {
      logger.info(
        'Sending profile update to API:',
        JSON.stringify(profileData, null, 2)
      );
      logger.info('API endpoint: PUT /api/v1/auth/profile');
      logger.info('Auth token present:', !!this.authToken);

      const response = await this.client.put(
        '/api/v1/auth/profile',
        profileData
      );

      logger.info('Profile update API response status:', response.status);
      logger.info(
        'Profile update API response data:',
        JSON.stringify(response.data, null, 2)
      );

      return response.data;
    } catch (error: any) {
      logger.error('Failed to update user profile:', error);
      if (error.response) {
        logger.error('Response status:', error.response.status);
        logger.error(
          'Response data:',
          JSON.stringify(error.response.data, null, 2)
        );
      }
      throw this.handleError(error);
    }
  }

  async getWalletConnectUrl(redirectUrl?: string): Promise<{
    url: string;
    accessToken: string;
  }> {
    try {
      const params = redirectUrl ? { redirectUrl } : {};
      const response = await this.client.get(
        '/api/v1/auth/wallet/connect-url',
        {
          params,
        }
      );
      logger.info(
        `Wallet connect URL: ${JSON.stringify(response.data, null, 2)}`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to get wallet connect URL:', error);
      throw this.handleError(error);
    }
  }

  async unlinkWallet(): Promise<ApiResponse<User>> {
    try {
      const response = await this.client.delete('/api/v1/auth/wallet');
      return response.data;
    } catch (error) {
      logger.error('Failed to unlink wallet:', error);
      throw this.handleError(error);
    }
  }

  async createUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await this.client.post('/user/profile', userData);
      return response.data;
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw this.handleError(error);
    }
  }

  async updateUserPreferences(
    userId: number,
    preferences: any
  ): Promise<ApiResponse<User>> {
    try {
      const response = await this.client.put(`/user/preferences`, {
        userId,
        preferences,
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to update user preferences:', error);
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || 'API request failed';
      return new Error(`${message} (${error.response.status})`);
    } else if (error.request) {
      // Request was made but no response received
      return new Error('Network error: Unable to reach API server');
    } else {
      // Something happened in setting up the request
      return new Error(`Request error: ${error.message}`);
    }
  }
}

export const apiService = new ApiService();
