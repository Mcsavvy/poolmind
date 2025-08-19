import { z } from 'zod';

// Application configuration schema
const appConfigSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URI: z.string().min(1, 'Database URI is required'),
  DATABASE_NAME: z.string().min(1, 'Database name is required'),
  CORS_ORIGINS: z.string().optional(),

  // Authentication configuration
  JWT_SECRET: z
    .string()
    .min(32, 'JWT secret must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  STACKS_NETWORK: z.enum(['mainnet', 'testnet', 'devnet']).default('testnet'),
  POOLMIND_CONTRACT_ADDRESS: z.string().min(1, 'Stacks pool contract address is required'),
  POOLMIND_CONTRACT_NAME: z.string().min(1, 'Stacks pool contract name is required'),
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'Telegram bot token is required'),
  TELEGRAM_BOT_USERNAME: z.string().min(1, 'Telegram bot username is required'),
  TELEGRAM_CHANNEL_ID: z.string(),
  TELEGRAM_GROUP_LINK: z.url(),
  TELEGRAM_CHANNEL_LINK: z.string(),
  REDIS_URL: z.string(),
});

export type AppConfig = {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  'database.uri': string;
  'database.name': string;
  'cors.origins'?: string;

  // Authentication
  'auth.jwtSecret': string;
  'auth.jwtExpiresIn': string;
  'auth.stacksNetwork': 'mainnet' | 'testnet' | 'devnet';
  
  // Stacks configuration
  'stacks.network': 'mainnet' | 'testnet' | 'devnet';
  'stacks.poolContractAddress': string;
  'stacks.poolContractName': string;
  
  // Telegram
  'telegram.botToken': string;
  'telegram.botUsername': string;
  'telegram.channelId'?: string;
  'telegram.groupLink'?: string;
  'telegram.channelLink'?: string;
  'redis.url': string;
};

export function validateConfig(env: Record<string, string>): AppConfig {
  const parsedEnv = appConfigSchema.safeParse(env);
  let errorMessage = '';

  if (!parsedEnv.success) {
    parsedEnv.error.issues.forEach((issue) => {
      errorMessage += `${issue.path.join('.')}: ${issue.message}\n`;
    });
    throw new Error(`Invalid environment variables: ${errorMessage}`);
  }

  const config = {
    port: parsedEnv.data.PORT,
    nodeEnv: parsedEnv.data.NODE_ENV,
    'database.uri': parsedEnv.data.DATABASE_URI,
    'database.name': parsedEnv.data.DATABASE_NAME,
    'cors.origins': parsedEnv.data.CORS_ORIGINS,

    // Authentication
    'auth.jwtSecret': parsedEnv.data.JWT_SECRET,
    'auth.jwtExpiresIn': parsedEnv.data.JWT_EXPIRES_IN,
    'auth.stacksNetwork': parsedEnv.data.STACKS_NETWORK,

    // Stacks configuration
    'stacks.network': parsedEnv.data.STACKS_NETWORK,
    'stacks.poolContractAddress': parsedEnv.data.POOLMIND_CONTRACT_ADDRESS,
    'stacks.poolContractName': parsedEnv.data.POOLMIND_CONTRACT_NAME,

    // Telegram
    'telegram.botToken': parsedEnv.data.TELEGRAM_BOT_TOKEN,
    'telegram.botUsername': parsedEnv.data.TELEGRAM_BOT_USERNAME,
    'telegram.channelId': parsedEnv.data.TELEGRAM_CHANNEL_ID,
    'telegram.groupLink': parsedEnv.data.TELEGRAM_GROUP_LINK,
    'telegram.channelLink': parsedEnv.data.TELEGRAM_CHANNEL_LINK,
    'redis.url': parsedEnv.data.REDIS_URL,
  };

  return config;
}
