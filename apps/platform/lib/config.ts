import z from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  NEXT_PUBLIC_STACKS_NETWORK: z.enum(['mainnet', 'testnet', 'devnet']),
  NEXT_PUBLIC_API_URL: z.string().min(1, 'API_URL is required'),
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z
    .string()
    .min(1, 'TELEGRAM_BOT_USERNAME is required'),
  NEXT_PUBLIC_TELEGRAM_GROUP_LINK: z
    .string()
    .min(1, 'TELEGRAM_GROUP_LINK is required'),
  NEXT_PUBLIC_TELEGRAM_CHANNEL_LINK: z
    .string()
    .min(1, 'TELEGRAM_CHANNEL_LINK is required'),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().min(1, 'SUPPORT_EMAIL is required'),
  NEXT_PUBLIC_SUPPORT_PHONE: z.string().min(1, 'SUPPORT_PHONE is required'),
  NEXT_PUBLIC_DEMO_LINK: z.string().min(1, 'DEMO_LINK is required'),
  NEXT_PUBLIC_POOLMIND_CONTRACT_ADDRESS: z
    .string()
    .min(1, 'POOLMIND_CONTRACT_ADDRESS is required'),
  NEXT_PUBLIC_POOLMIND_CONTRACT_NAME: z
    .string()
    .min(1, 'POOLMIND_CONTRACT_NAME is required'),
});

interface Config {
  nodeEnv: string;
  apiUrl: string;
  stacksNetwork: string;
  telegramBotUsername: string;
  telegramGroupLink: string;
  telegramChannelLink: string;
  supportEmail: string;
  supportPhone: string;
  demoLink: string;
  poolmindContractAddress: string;
  poolmindContractName: string;
}

// Build a literal object of env values using direct references so Next can inline on the client
const rawEnv = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_STACKS_NETWORK: process.env.NEXT_PUBLIC_STACKS_NETWORK,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME:
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  NEXT_PUBLIC_TELEGRAM_GROUP_LINK: process.env.NEXT_PUBLIC_TELEGRAM_GROUP_LINK,
  NEXT_PUBLIC_TELEGRAM_CHANNEL_LINK:
    process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_LINK,
  NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  NEXT_PUBLIC_SUPPORT_PHONE: process.env.NEXT_PUBLIC_SUPPORT_PHONE,
  NEXT_PUBLIC_DEMO_LINK: process.env.NEXT_PUBLIC_DEMO_LINK,
  NEXT_PUBLIC_POOLMIND_CONTRACT_ADDRESS:
    process.env.NEXT_PUBLIC_POOLMIND_CONTRACT_ADDRESS,
  NEXT_PUBLIC_POOLMIND_CONTRACT_NAME:
    process.env.NEXT_PUBLIC_POOLMIND_CONTRACT_NAME,
} as const;

// Parse and validate once at module load. In dev, HMR will re-evaluate on file change.
function parseEnv() {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    let errorMessage = '❌ Invalid client environment configuration:\n';
    result.error.issues.forEach(issue => {
      errorMessage += `  - ${issue.path.join('.')}: ${issue.message}\n`;
    });
    throw new Error(errorMessage);
  }
  return result.data;
}

const env = parseEnv();

export const config: Config = {
  nodeEnv: env.NODE_ENV,
  apiUrl: env.NEXT_PUBLIC_API_URL,
  stacksNetwork: env.NEXT_PUBLIC_STACKS_NETWORK,
  telegramBotUsername: env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  telegramGroupLink: env.NEXT_PUBLIC_TELEGRAM_GROUP_LINK,
  telegramChannelLink: env.NEXT_PUBLIC_TELEGRAM_CHANNEL_LINK,
  supportEmail: env.NEXT_PUBLIC_SUPPORT_EMAIL,
  supportPhone: env.NEXT_PUBLIC_SUPPORT_PHONE,
  demoLink: env.NEXT_PUBLIC_DEMO_LINK,
  poolmindContractAddress: env.NEXT_PUBLIC_POOLMIND_CONTRACT_ADDRESS,
  poolmindContractName: env.NEXT_PUBLIC_POOLMIND_CONTRACT_NAME,
};

export default config;
