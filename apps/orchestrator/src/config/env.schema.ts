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
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'Telegram bot token is required'),
  TELEGRAM_BOT_USERNAME: z.string().min(1, 'Telegram bot username is required'),
});

export type AppConfig = {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  'database.uri': string;
  'database.name': string;
  corsOrigins?: string;

  // Authentication
  'auth.jwtSecret': string;
  'auth.jwtExpiresIn': string;
  'auth.stacksNetwork': 'mainnet' | 'testnet' | 'devnet';
  // Telegram
  'telegram.botToken': string;
  'telegram.botUsername': string;
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
    corsOrigins: parsedEnv.data.CORS_ORIGINS,

    // Authentication
    'auth.jwtSecret': parsedEnv.data.JWT_SECRET,
    'auth.jwtExpiresIn': parsedEnv.data.JWT_EXPIRES_IN,
    'auth.stacksNetwork': parsedEnv.data.STACKS_NETWORK,

    // Telegram
    'telegram.botToken': parsedEnv.data.TELEGRAM_BOT_TOKEN,
    'telegram.botUsername': parsedEnv.data.TELEGRAM_BOT_USERNAME,
  };

  return config;
}
