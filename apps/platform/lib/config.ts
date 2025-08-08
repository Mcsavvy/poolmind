import z from "zod";
import ms from "ms";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_STACKS_NETWORK: z
    .enum(["mainnet", "testnet", "devnet"]),
  NEXT_PUBLIC_NEXTAUTH_URL: z
    .string()
    .min(1, "NEXTAUTH_URL is required"),
  NEXT_PUBLIC_API_URL: z
    .string()
    .min(1, "API_URL is required"),
  NEXT_PUBLIC_SESSION_MAX_AGE: z
    .preprocess(
      (value) => (typeof value === "string" ? ms(value as any) : value),
      z
        .number()
        .int()
        .min(
          1,
          "NEXT_PUBLIC_SESSION_MAX_AGE must be a valid ms string or number"
        )
    )
    .default(ms("1h")),
  NEXT_PUBLIC_SESSION_UPDATE_AGE: z
    .preprocess(
      (value) => (typeof value === "string" ? ms(value as any) : value),
      z
        .number()
        .int()
        .min(
          1,
          "NEXT_PUBLIC_SESSION_UPDATE_AGE must be a valid ms string or number"
        )
    )
    .default(ms("30m")),
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z
    .string()
    .min(1, "TELEGRAM_BOT_USERNAME is required")
});

interface Config {
  nodeEnv: string;
  nextAuthUrl: string;
  apiUrl: string;
  stacksNetwork: string;
  sessionMaxAge: number;
  sessionUpdateAge: number;
  telegramBotUsername: string;
}

// Build a literal object of env values using direct references so Next can inline on the client
const rawEnv = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_STACKS_NETWORK: process.env.NEXT_PUBLIC_STACKS_NETWORK,
  NEXT_PUBLIC_NEXTAUTH_URL: process.env.NEXT_PUBLIC_NEXTAUTH_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SESSION_MAX_AGE: process.env.NEXT_PUBLIC_SESSION_MAX_AGE,
  NEXT_PUBLIC_SESSION_UPDATE_AGE: process.env.NEXT_PUBLIC_SESSION_UPDATE_AGE,
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
} as const;

// Parse and validate once at module load. In dev, HMR will re-evaluate on file change.
function parseEnv() {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    let errorMessage = "❌ Invalid client environment configuration:\n";
    result.error.issues.forEach((issue) => {
      errorMessage += `  - ${issue.path.join(".")}: ${issue.message}\n`;
    });
    throw new Error(errorMessage);
  }
  return result.data;
}

const env = parseEnv();

export const config: Config = {
  nodeEnv: env.NODE_ENV,
  nextAuthUrl: env.NEXT_PUBLIC_NEXTAUTH_URL,
  apiUrl: env.NEXT_PUBLIC_API_URL,
  stacksNetwork: env.NEXT_PUBLIC_STACKS_NETWORK,
  sessionMaxAge: env.NEXT_PUBLIC_SESSION_MAX_AGE,
  sessionUpdateAge: env.NEXT_PUBLIC_SESSION_UPDATE_AGE,
  telegramBotUsername: env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
};

export default config;