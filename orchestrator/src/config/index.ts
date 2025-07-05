import dotenv from "dotenv";
import { z } from "zod";
import { privateKeyToAddress } from "@stacks/transactions";

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().transform(Number).default("3000"),
  HOST: z.string().default("localhost"),
  USE_HTTPS: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  APP_URL: z.string().min(1, "APP_URL is required"),
  FRONTEND_URL: z.string().optional(),
  // Database Configuration
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  // Redis Configuration
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  // Authentication Configuration
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  // Telegram Configuration
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  // Stacks Network Configuration
  STACKS_NETWORK: z.enum(["mainnet", "testnet", "devnet"]).default("devnet"),

  // Smart Contract Configuration
  POOLMIND_CONTRACT_ADDRESS: z
    .string()
    .min(1, "POOLMIND_CONTRACT_ADDRESS is required"),
  POOLMIND_CONTRACT_NAME: z
    .string()
    .min(1, "POOLMIND_CONTRACT_NAME is required"),
  POOLMIND_ADMIN_PRIVATE_KEY: z
    .string()
    .min(1, "POOLMIND_ADMIN_PRIVATE_KEY is required"),

  // Logging Configuration
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_FILE_ERROR: z.string().default("logs/error.log"),
  LOG_FILE_COMBINED: z.string().default("logs/combined.log"),
  LOG_FILE_AUTH: z.string().default("logs/auth-combined.log"),

  // Security Configuration
  BCRYPT_SALT_ROUNDS: z.string().transform(Number).default("12"),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default("900000"), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default("100"),
  HMAC_SECRET: z
    .string()
    .min(32, "HMAC_SECRET must be at least 32 characters long"),

  // CORS Configuration
  CORS_ORIGIN: z.string().default(""),
  CORS_CREDENTIALS: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  // API Configuration
  API_VERSION: z.string().default("v1"),
  API_PREFIX: z.string().default("/api"),

  // Queue Configuration (Bull)
  QUEUE_REDIS_URL: z.string().optional(),
  QUEUE_CONCURRENCY: z.string().transform(Number).default("5"),

  // Contract Call Configuration
  CONTRACT_CALL_RETRY_COUNT: z.string().transform(Number).default("3"),
  CONTRACT_CALL_RETRY_DELAY_MS: z.string().transform(Number).default("1000"), // 1 second
});

// Validate environment variables
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error("❌ Invalid environment configuration:");
  parseResult.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

const env = parseResult.data;

// Application configuration object
export const config = {
  // Server settings
  server: {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    host: env.HOST,
    useHttps: env.USE_HTTPS,
    appUrl: env.APP_URL,
    isProduction: env.NODE_ENV === "production",
    isDevelopment: env.NODE_ENV === "development",
    isTest: env.NODE_ENV === "test",
    frontendUrl: env.NODE_ENV === "production" ? env.FRONTEND_URL : undefined,
  },

  // Database settings
  database: {
    mongoUri: env.MONGODB_URI,
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  // Redis settings
  redis: {
    url: env.REDIS_URL,
  },

  // Authentication settings
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
  },

  // Telegram settings
  telegram: {
    botToken: env.TELEGRAM_BOT_TOKEN,
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET,
  },

  // Stacks blockchain settings
  stacks: {
    network: env.STACKS_NETWORK,
  },

  // Smart contract settings
  contracts: {
    poolmind: {
      address: env.POOLMIND_CONTRACT_ADDRESS,
      name: env.POOLMIND_CONTRACT_NAME,
      adminPrivateKey: env.POOLMIND_ADMIN_PRIVATE_KEY,
      adminAddress: privateKeyToAddress(env.POOLMIND_ADMIN_PRIVATE_KEY),
    },
  },

  // Logging settings
  logging: {
    level: env.LOG_LEVEL,
    files: {
      error: env.LOG_FILE_ERROR,
      combined: env.LOG_FILE_COMBINED,
      auth: env.LOG_FILE_AUTH,
    },
  },

  // Security settings
  security: {
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },
    cors: {
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
      credentials: env.CORS_CREDENTIALS,
    },
    hmacSecret: env.HMAC_SECRET,
  },

  // API settings
  api: {
    version: env.API_VERSION,
    prefix: env.API_PREFIX,
    baseUrl: `${env.API_PREFIX}/${env.API_VERSION}`,
  },

  // Queue settings
  queue: {
    redisUrl: env.QUEUE_REDIS_URL || env.REDIS_URL,
    concurrency: env.QUEUE_CONCURRENCY,
  },

  // Contract call settings
  contractCall: {
    retryCount: env.CONTRACT_CALL_RETRY_COUNT,
    retryDelayMs: env.CONTRACT_CALL_RETRY_DELAY_MS,
  },
} as const;

// Export individual config sections for convenience
export const {
  server,
  database,
  redis,
  auth,
  telegram,
  stacks,
  logging,
  security,
  api,
  queue,
  contractCall,
} = config;

// Export environment validation schema for testing
export { envSchema };

export default config;
