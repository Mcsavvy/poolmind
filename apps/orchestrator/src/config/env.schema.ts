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
});

export type AppConfig = {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  'database.uri': string;
  'database.name': string;
  corsOrigins?: string;
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
  };

  return config;
}
