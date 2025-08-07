import z from "zod";
import ms from "ms";

const envSchema = z.object({
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
  NEXT_PUBLIC_API_URL: z
    .string()
    .min(1, "API_URL is required")
    .default("http://localhost:3001"),
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


export const config = (() => {
    const parseResult = envSchema.safeParse(process.env);
    
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
        apiUrl: env.NEXT_PUBLIC_API_URL,
        stacksNetwork: env.NEXT_PUBLIC_STACKS_NETWORK,
        sessionMaxAge: env.NEXT_PUBLIC_SESSION_MAX_AGE,
        sessionUpdateAge: env.NEXT_PUBLIC_SESSION_UPDATE_AGE
    };
})();

export default config;