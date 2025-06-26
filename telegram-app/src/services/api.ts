import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import {
  Pool,
  Portfolio,
  Trade,
  User,
  ApiResponse,
  PaginatedResponse,
  TradingActivity,
  PerformanceChart,
} from '../types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.api.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.api.apiKey}`,
        'User-Agent': 'PoolMind-Telegram-Bot/1.0.0',
      },
    });

    this.setupInterceptors();
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
        return Promise.reject(error);
      }
    );
  }

  // User Management
  async getUserProfile(telegramId: number): Promise<ApiResponse<User>> {
    try {
      const response = await this.client.get(`/user/profile`, {
        params: { telegramId },
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get user profile:', error);
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

  // Pool Operations
  async getPools(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Pool>> {
    try {
      const response = await this.client.get('/pools', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get pools:', error);
      throw this.handleError(error);
    }
  }

  async getPool(poolId: string): Promise<ApiResponse<Pool>> {
    try {
      const response = await this.client.get(`/pools/${poolId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get pool ${poolId}:`, error);
      throw this.handleError(error);
    }
  }

  async getPoolPerformance(
    poolId: string,
    timeframe: string = '30D'
  ): Promise<ApiResponse<PerformanceChart>> {
    try {
      const response = await this.client.get(`/pools/${poolId}/performance`, {
        params: { timeframe },
      });
      return response.data;
    } catch (error) {
      logger.error(`Failed to get pool performance for ${poolId}:`, error);
      throw this.handleError(error);
    }
  }

  async contributeToPool(
    poolId: string,
    userId: number,
    amount: number
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post(`/pools/${poolId}/contribute`, {
        userId,
        amount,
      });
      return response.data;
    } catch (error) {
      logger.error(`Failed to contribute to pool ${poolId}:`, error);
      throw this.handleError(error);
    }
  }

  async withdrawFromPool(
    poolId: string,
    userId: number,
    amount: number
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post(`/pools/${poolId}/withdraw`, {
        userId,
        amount,
      });
      return response.data;
    } catch (error) {
      logger.error(`Failed to withdraw from pool ${poolId}:`, error);
      throw this.handleError(error);
    }
  }

  // Portfolio
  async getUserPortfolio(userId: number): Promise<ApiResponse<Portfolio[]>> {
    try {
      const response = await this.client.get('/user/portfolio', {
        params: { userId },
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get user portfolio:', error);
      throw this.handleError(error);
    }
  }

  async getUserTransactions(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<any>> {
    try {
      const response = await this.client.get('/user/transactions', {
        params: { userId, page, limit },
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get user transactions:', error);
      throw this.handleError(error);
    }
  }

  async getUserPerformance(userId: number): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/user/performance', {
        params: { userId },
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get user performance:', error);
      throw this.handleError(error);
    }
  }

  // Trading
  async getRecentTrades(
    poolId?: string,
    limit: number = 50
  ): Promise<ApiResponse<Trade[]>> {
    try {
      const response = await this.client.get('/trading/recent', {
        params: { poolId, limit },
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get recent trades:', error);
      throw this.handleError(error);
    }
  }

  async getTradingActivity(
    poolId: string,
    period: string = '24h'
  ): Promise<ApiResponse<TradingActivity>> {
    try {
      const response = await this.client.get('/trading/activity', {
        params: { poolId, period },
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get trading activity:', error);
      throw this.handleError(error);
    }
  }

  // Admin Operations
  async createPool(poolData: Partial<Pool>): Promise<ApiResponse<Pool>> {
    try {
      const response = await this.client.post('/admin/pools', poolData);
      return response.data;
    } catch (error) {
      logger.error('Failed to create pool:', error);
      throw this.handleError(error);
    }
  }

  async updatePool(
    poolId: string,
    poolData: Partial<Pool>
  ): Promise<ApiResponse<Pool>> {
    try {
      const response = await this.client.put(
        `/admin/pools/${poolId}/configure`,
        poolData
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to update pool ${poolId}:`, error);
      throw this.handleError(error);
    }
  }

  async getPoolAnalytics(poolId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get(
        `/admin/pools/${poolId}/analytics`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to get pool analytics for ${poolId}:`, error);
      throw this.handleError(error);
    }
  }

  // System Status
  async getSystemStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/system/status');
      return response.data;
    } catch (error) {
      logger.error('Failed to get system status:', error);
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
