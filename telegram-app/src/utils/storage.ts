import { createClient, RedisClientType } from 'redis';
import { config } from '../config/env';
import { logger } from './logger';

export interface StorageInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
  close(): Promise<void>;
}

export type StorageType = 'redis' | 'memory';

class MemoryStorage implements StorageInterface {
  private store = new Map<string, { value: string; expires?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);

    if (!item) {
      return null;
    }

    // Check if expired
    if (item.expires && Date.now() > item.expires) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const item: { value: string; expires?: number } = { value };

    if (ttl) {
      item.expires = Date.now() + ttl * 1000; // Convert seconds to milliseconds
    }

    this.store.set(key, item);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.store.keys());

    if (!pattern) {
      return keys;
    }

    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  async close(): Promise<void> {
    // Nothing to close for memory storage
  }

  // Cleanup expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (item.expires && now > item.expires) {
        this.store.delete(key);
      }
    }
  }
}

class RedisStorage implements StorageInterface {
  private client: any;
  private connected = false;

  constructor(client: any) {
    this.client = client;
  }

  async connect(): Promise<boolean> {
    try {
      if (!this.connected) {
        await this.client.connect();
        this.connected = true;
        logger.info('Redis storage connected');
      }
      return true;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.connected) {
        throw new Error('Redis not connected');
      }
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis get error:', error);
      throw error;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (!this.connected) {
        throw new Error('Redis not connected');
      }

      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis set error:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (!this.connected) {
        throw new Error('Redis not connected');
      }
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis delete error:', error);
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      if (!this.connected) {
        throw new Error('Redis not connected');
      }
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Redis has error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      if (!this.connected) {
        throw new Error('Redis not connected');
      }
      await this.client.flushDb();
    } catch (error) {
      logger.error('Redis clear error:', error);
      throw error;
    }
  }

  async keys(pattern = '*'): Promise<string[]> {
    try {
      if (!this.connected) {
        throw new Error('Redis not connected');
      }
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Redis keys error:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.connected) {
        await this.client.quit();
        this.connected = false;
        logger.info('Redis storage disconnected');
      }
    } catch (error) {
      logger.error('Redis close error:', error);
    }
  }
}

export class Storage implements StorageInterface {
  private primaryStorage: StorageInterface;
  private fallbackStorage: MemoryStorage;
  private storageType: StorageType;

  constructor(preferredType: StorageType = 'redis') {
    this.storageType = preferredType;
    this.fallbackStorage = new MemoryStorage();
    this.primaryStorage = this.fallbackStorage; // Default to fallback

    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.storageType === 'redis') {
      try {
        const redisClient = createClient({
          url: config.redis.url,
        });

        redisClient.on('error', err => {
          logger.error('Redis Client Error:', err);
          this.switchToFallback();
        });

        redisClient.on('connect', () => {
          logger.info('Storage connected to Redis');
        });

        redisClient.on('disconnect', () => {
          logger.warn('Storage disconnected from Redis, switching to memory');
          this.switchToFallback();
        });

        const redisStorage = new RedisStorage(redisClient);
        const connected = await redisStorage.connect();

        if (connected) {
          this.primaryStorage = redisStorage;
          logger.info('Storage initialized with Redis');
        } else {
          this.switchToFallback();
        }
      } catch (error) {
        logger.error('Failed to initialize Redis storage:', error);
        this.switchToFallback();
      }
    } else {
      logger.info('Storage initialized with memory');
    }

    // Start cleanup interval for memory storage
    setInterval(() => {
      this.fallbackStorage.cleanup();
    }, 60000); // Cleanup every minute
  }

  private switchToFallback(): void {
    if (this.primaryStorage !== this.fallbackStorage) {
      logger.warn('Switching to memory storage fallback');
      this.primaryStorage = this.fallbackStorage;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.primaryStorage.get(key);
    } catch (error) {
      logger.error('Storage get error, attempting fallback:', error);
      this.switchToFallback();
      return await this.fallbackStorage.get(key);
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      await this.primaryStorage.set(key, value, ttl);
    } catch (error) {
      logger.error('Storage set error, attempting fallback:', error);
      this.switchToFallback();
      await this.fallbackStorage.set(key, value, ttl);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.primaryStorage.delete(key);
    } catch (error) {
      logger.error('Storage delete error, attempting fallback:', error);
      this.switchToFallback();
      await this.fallbackStorage.delete(key);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      return await this.primaryStorage.has(key);
    } catch (error) {
      logger.error('Storage has error, attempting fallback:', error);
      this.switchToFallback();
      return await this.fallbackStorage.has(key);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.primaryStorage.clear();
    } catch (error) {
      logger.error('Storage clear error, attempting fallback:', error);
      this.switchToFallback();
      await this.fallbackStorage.clear();
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      return await this.primaryStorage.keys(pattern);
    } catch (error) {
      logger.error('Storage keys error, attempting fallback:', error);
      this.switchToFallback();
      return await this.fallbackStorage.keys(pattern);
    }
  }

  async close(): Promise<void> {
    await this.primaryStorage.close();
    await this.fallbackStorage.close();
  }

  // Utility methods
  async setObject(key: string, obj: any, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(obj), ttl);
  }

  async getObject<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Error parsing stored object:', error);
      return null;
    }
  }

  getCurrentStorageType(): string {
    return this.primaryStorage === this.fallbackStorage ? 'memory' : 'redis';
  }
}

// Create and export singleton instance
export const storage = new Storage(config.storage.type as StorageType);

// Export for testing or custom instances
export { MemoryStorage, RedisStorage };
