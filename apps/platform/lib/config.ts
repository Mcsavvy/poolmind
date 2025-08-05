import z from "zod";
import ms from "ms";

// Server-side environment schema (only used on server)
const serverEnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters long'),
});

// Client-side environment schema (safe for frontend)
const clientEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_STACKS_NETWORK: z
    .enum(["mainnet", "testnet", "devnet"])
    .default("testnet"),
  NEXT_PUBLIC_NEXTAUTH_URL: z
    .string()
    .min(1, "NEXTAUTH_URL is required")
    .default("http://localhost:3000"),
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
});

// Server-side config (only used in API routes and server components)
export const serverConfig = (() => {
    if (typeof window !== 'undefined') {
        // We're on the client side, return a safe fallback
        return {
          nodeEnv: "development",
          nextAuthSecret: "...",
        };
    }

    const parseResult = serverEnvSchema.safeParse(process.env);
    
    if (!parseResult.success) {
        console.error("❌ Invalid server environment configuration:");
        parseResult.error.issues.forEach((issue) => {
            console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
        });
        // Don't exit process on client side
        if (typeof process !== 'undefined' && process.exit) {
            process.exit(1);
        }
        return {
          nodeEnv: "development",
          nextAuthSecret: "...",
        };
    }
    
    const env = parseResult.data;
    
    return {
        nodeEnv: env.NODE_ENV,
        nextAuthSecret: env.NEXTAUTH_SECRET,
    };
})();

// Client-side config (safe for frontend)
export const clientConfig = (() => {
    const parseResult = clientEnvSchema.safeParse(process.env);
    
    if (!parseResult.success) {
        console.error("❌ Invalid client environment configuration:");
        parseResult.error.issues.forEach((issue) => {
            console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
        });
        return {
            stacksNetwork: 'testnet' as const,
        };
    }
    
    const env = parseResult.data;
    
    return {
        nodeEnv: env.NODE_ENV,
        nextAuthUrl: env.NEXT_PUBLIC_NEXTAUTH_URL,
      stacksNetwork: env.NEXT_PUBLIC_STACKS_NETWORK,
      sessionMaxAge: env.NEXT_PUBLIC_SESSION_MAX_AGE,
      sessionUpdateAge: env.NEXT_PUBLIC_SESSION_UPDATE_AGE
    };
})();

// Default export for backward compatibility (client-safe)
export default clientConfig;