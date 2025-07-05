import { request, getLocalStorage } from "@stacks/connect";
import { Cl } from "@stacks/transactions";
import config from "../config";

export interface DepositResult {
  txid: string;
  sharesMinted?: string;
}

export interface WithdrawResult {
  txid: string;
  stxReceived?: string;
}

/**
 * Get the current user's STX address
 */
const getCurrentUserAddress = (): string => {
  const userData = getLocalStorage();
  const address = userData?.addresses?.stx?.[0]?.address;
  if (!address) {
    throw new Error("No wallet address found. Please connect your wallet.");
  }
  return address;
};

/**
 * Deposit STX to the pool and receive PoolMind tokens
 */
export const depositToPool = async (
  amountStx: string,
): Promise<DepositResult> => {
  try {
    const userAddress = getCurrentUserAddress();
    console.log("userAddress", userAddress);

    // Create post conditions for safety
    const postConditions = [
      // STX post condition - user sends at least the specified amount
      {
        type: "stx-postcondition" as const,
        address: userAddress,
        condition: "gte" as const,
        amount: amountStx,
      },
    ];

    const response = await request("stx_callContract", {
      contract: `${config.poolmindContractAddress}.${config.poolmindContractName}`,
      functionName: "deposit",
      functionArgs: [Cl.uint(amountStx)],
      network: config.stacksNetwork,
      postConditions,
      postConditionMode: "deny",
    });

    return {
      txid: response.txid || "",
    };
  } catch (error) {
    console.error("Deposit failed:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to deposit",
    );
  }
};

/**
 * Withdraw STX from the pool by burning PoolMind tokens
 */
export const withdrawFromPool = async (
  amountShares: string,
): Promise<WithdrawResult> => {
  try {
    const userAddress = getCurrentUserAddress();

    // Create post conditions for safety
    const postConditions = [
      // Fungible token post condition - user sends PLMD tokens
      {
        type: "ft-postcondition" as const,
        address: userAddress,
        condition: "gte" as const,
        amount: amountShares,
        asset:
          `${config.poolmindContractAddress}.${config.poolmindContractName}::PoolMind` as const,
      },
    ];

    const response = await request("stx_callContract", {
      contract: `${config.poolmindContractAddress}.${config.poolmindContractName}`,
      functionName: "withdraw",
      functionArgs: [Cl.uint(amountShares)],
      network: config.stacksNetwork,
      postConditions,
      postConditionMode: "allow",
    });

    return {
      txid: response.txid || "",
    };
  } catch (error) {
    console.error("Withdraw failed:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to withdraw",
    );
  }
};
