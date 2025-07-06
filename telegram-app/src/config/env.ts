import dotenv from 'dotenv';
import { AppConfig } from '../types';

dotenv.config();

const requiredEnvVars: (string | (() => string[]))[] = [
  'BOT_TOKEN',
  'API_BASE_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'STORAGE_TYPE',
  'REDIS_URL',
  'STACKS_NETWORK',
  'RATE_LIMIT_WINDOW',
  'RATE_LIMIT_MAX',
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (typeof envVar === 'string') {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  } else {
    const requiredVars = envVar();
    for (const requiredVar of requiredVars) {
      if (!process.env[requiredVar]) {
        throw new Error(
          `Missing required environment variable: ${requiredVar}`
        );
      }
    }
  }
}

export const config: AppConfig = {
  bot: {
    token: process.env.BOT_TOKEN!,
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
  },
  api: {
    baseUrl: process.env.API_BASE_URL!,
    apiKey: process.env.API_KEY!,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  storage: {
    type: (process.env.STORAGE_TYPE as 'memory' | 'redis') || 'memory',
  },
  stacks: {
    network: (process.env.STACKS_NETWORK as 'mainnet' | 'testnet') || 'testnet',
  },
  security: {
    jwtSecret: process.env.JWT_SECRET!,
    encryptionKey: process.env.ENCRYPTION_KEY!,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
};

export const isDevelopment = config.server.env === 'development';
export const isProduction = config.server.env === 'production';
