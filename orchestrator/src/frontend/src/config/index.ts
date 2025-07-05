import { z } from "zod";
import { STACKS_MAINNET, STACKS_TESTNET, STACKS_DEVNET } from "@stacks/network";

const envSchema = z.object({
  VITE_STACKS_NETWORK: z
    .enum(["mainnet", "testnet", "devnet"])
    .default("devnet"),
  VITE_POOLMIND_CONTRACT_ADDRESS: z
    .string()
    .min(1, "VITE_POOLMIND_CONTRACT_ADDRESS is required"),
  VITE_POOLMIND_CONTRACT_NAME: z
    .string()
    .min(1, "VITE_POOLMIND_CONTRACT_NAME is required"),
  VITE_API_URL: z.string().default(""),
  VITE_API_PREFIX: z.string().default("api/v1"),
});

const env = envSchema.parse(import.meta.env);

const config = {
  apiUrl: env.VITE_API_URL,
  apiPrefix: env.VITE_API_PREFIX,
  authTokenKey: "poolmind_auth_token",
  stacksNetwork: env.VITE_STACKS_NETWORK,
  poolmindContractAddress: env.VITE_POOLMIND_CONTRACT_ADDRESS,
  poolmindContractName: env.VITE_POOLMIND_CONTRACT_NAME,
  getApiUrl: (path: string) =>
    `${env.VITE_API_URL}/${env.VITE_API_PREFIX}/${path}`,
  getNetwork: () => {
    switch (env.VITE_STACKS_NETWORK) {
      case "mainnet":
        return STACKS_MAINNET;
      case "testnet":
        return STACKS_TESTNET;
      case "devnet":
        return STACKS_DEVNET;
      default:
        return STACKS_DEVNET;
    }
  },
  getStacksApiUrl: () => {
    let network;
    switch (env.VITE_STACKS_NETWORK) {
      case "mainnet":
        network = STACKS_MAINNET;
        break;
      case "testnet":
        network = STACKS_TESTNET;
        break;
      case "devnet":
        network = STACKS_DEVNET;
        break;
      default:
        network = STACKS_DEVNET;
    }
    return network.client.baseUrl;
  },
} as const;

export default config;
