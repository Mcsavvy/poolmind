'use client';

import {
  StacksNetwork,
  STACKS_MAINNET,
  STACKS_TESTNET,
  STACKS_DEVNET,
} from "@stacks/network";
import {
  fetchCallReadOnlyFunction,
  cvToValue,
  standardPrincipalCV,
  uintCV,
} from "@stacks/transactions";
import { config } from "@/lib/config";

export interface ContractState {
  admin: string;
  paused: boolean;
  transferable: boolean;
  nav: number;
  entryFee: number;
  exitFee: number;
  stxBalance: number;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  tokenUri?: string;
}

export interface BalanceResult {
  balance: number;
}

export interface NavResult {
  nav: number;
}

export interface TotalSupplyResult {
  totalSupply: number;
}

export interface NavHistoryEntry {
  nav: number;
  timestamp: number;
}

/**
 * Enhanced contract service for PoolMind smart contract interactions
 * Handles read-only functions, state queries, and utility calculations
 */
export class PoolMindContractService {
  private network: StacksNetwork;
  private contractAddress: string;
  private contractName: string;

  constructor() {
    this.network = this.getNetwork();
    this.contractAddress = config.poolmindContractAddress;
    this.contractName = config.poolmindContractName;
  }

  /**
   * Get the appropriate Stacks network instance based on configuration
   */
  private getNetwork(): StacksNetwork {
    const networkType = config.stacksNetwork;

    switch (networkType) {
      case "mainnet":
        return STACKS_MAINNET;
      case "testnet":
        return STACKS_TESTNET;
      case "devnet":
        return STACKS_DEVNET;
      default:
        return STACKS_TESTNET;
    }
  }

  /**
   * Call a read-only contract function with retry logic
   */
  private async callReadOnlyFunction(
    functionName: string,
    functionArgs: any[] = [],
    senderAddress?: string,
    retries: number = 3
  ): Promise<any> {
    const readOnlyCall = async () => {
      const result = await fetchCallReadOnlyFunction({
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName,
        functionArgs,
        network: this.network,
        senderAddress: senderAddress || this.contractAddress,
      });

      return cvToValue(result);
    };

    let lastError: Error | undefined;
    for (let i = 0; i < retries; i++) {
      try {
        return await readOnlyCall();
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          console.warn(
            `Retry attempt ${i + 1} for ${functionName} after error: ${
              lastError.message
            }. Retrying in 1s...`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
    throw lastError;
  }

  // ============================
  // TOKEN INFORMATION
  // ============================

  /**
   * Get token name
   */
  async getName(): Promise<string> {
    try {
      const result = await this.callReadOnlyFunction("get-name");
      return result?.value || "";
    } catch (error) {
      console.error("Error getting token name:", error);
      return "PoolMind";
    }
  }

  /**
   * Get token symbol
   */
  async getSymbol(): Promise<string> {
    try {
      const result = await this.callReadOnlyFunction("get-symbol");
      return result?.value || "";
    } catch (error) {
      console.error("Error getting token symbol:", error);
      return "PLMD";
    }
  }

  /**
   * Get token decimals
   */
  async getDecimals(): Promise<number> {
    try {
      const result = await this.callReadOnlyFunction("get-decimals");
      return result?.value || 6;
    } catch (error) {
      console.error("Error getting token decimals:", error);
      return 6;
    }
  }

  /**
   * Get token balance for an address
   */
  async getBalance(address: string): Promise<BalanceResult> {
    try {
      const functionArgs = [standardPrincipalCV(address)];
      const result = await this.callReadOnlyFunction("get-balance", functionArgs);

      return {
        balance: result?.value || 0,
      };
    } catch (error) {
      console.error("Error getting balance:", error);
      return { balance: 0 };
    }
  }

  /**
   * Get total token supply
   */
  async getTotalSupply(): Promise<TotalSupplyResult> {
    try {
      const result = await this.callReadOnlyFunction("get-total-supply");
      return {
        totalSupply: result?.value || 0,
      };
    } catch (error) {
      console.error("Error getting total supply:", error);
      return { totalSupply: 0 };
    }
  }

  /**
   * Get token URI
   */
  async getTokenUri(): Promise<string | null> {
    try {
      const result = await this.callReadOnlyFunction("get-token-uri");
      return result?.value || null;
    } catch (error) {
      console.error("Error getting token URI:", error);
      return null;
    }
  }

  // ============================
  // POOL STATE & NAV
  // ============================

  /**
   * Get current Net Asset Value (NAV)
   */
  async getNav(): Promise<NavResult> {
    try {
      const result = await this.callReadOnlyFunction("get-nav");
      return {
        nav: result?.value || 1000000, // Default 1 STX per token
      };
    } catch (error) {
      console.error("Error getting NAV:", error);
      return { nav: 1000000 };
    }
  }

  /**
   * Get NAV history by ID
   */
  async getNavHistoryById(id: number): Promise<NavHistoryEntry | null> {
    try {
      const functionArgs = [uintCV(id)];
      const result = await this.callReadOnlyFunction("get-nav-history-by-id", functionArgs);

      if (result?.value) {
        return {
          nav: result.value.nav?.value || 0,
          timestamp: result.value.timestamp?.value || 0,
        };
      }

      return null;
    } catch (error) {
      console.error("Error getting NAV history:", error);
      return null;
    }
  }

  /**
   * Get complete contract state
   */
  async getContractState(): Promise<ContractState> {
    try {
      const result = await this.callReadOnlyFunction("get-contract-state");

      if (result?.value) {
        return {
          admin: result.value.admin?.value || "",
          paused: Boolean(result.value.paused?.value),
          transferable: Boolean(result.value.transferable?.value),
          nav: result.value.nav?.value || 1000000,
          entryFee: result.value["entry-fee"]?.value || 50, // 0.5%
          exitFee: result.value["exit-fee"]?.value || 50, // 0.5%
          stxBalance: result.value["stx-balance"]?.value || 0,
        };
      }

      // Return default state if contract call fails
      return {
        admin: "",
        paused: false,
        transferable: false,
        nav: 1000000, // 1 STX per token
        entryFee: 50, // 0.5%
        exitFee: 50, // 0.5%
        stxBalance: 0,
      };
    } catch (error) {
      console.error("Error getting contract state:", error);
      return {
        admin: "",
        paused: false,
        transferable: false,
        nav: 1000000,
        entryFee: 50,
        exitFee: 50,
        stxBalance: 0,
      };
    }
  }

  /**
   * Get comprehensive token information
   */
  async getTokenInfo(): Promise<TokenInfo> {
    try {
      const [name, symbol, decimals, totalSupply, tokenUri] = await Promise.all([
        this.getName(),
        this.getSymbol(),
        this.getDecimals(),
        this.getTotalSupply(),
        this.getTokenUri(),
      ]);

      return {
        name,
        symbol,
        decimals,
        totalSupply: totalSupply.totalSupply,
        tokenUri: tokenUri || undefined,
      };
    } catch (error) {
      console.error("Error getting token info:", error);
      return {
        name: "PoolMind",
        symbol: "PLMD",
        decimals: 6,
        totalSupply: 0,
      };
    }
  }

  // ============================
  // UTILITY FUNCTIONS
  // ============================

  /**
   * Calculate shares to mint for a given STX amount
   */
  async calculateSharesForDeposit(stxAmount: number): Promise<number> {
    try {
      const contractState = await this.getContractState();
      const nav = contractState.nav;
      const entryFeeRate = contractState.entryFee;

      if (nav === 0) {
        throw new Error("NAV is not set");
      }

      // Calculate entry fee (fee rate is in basis points, so divide by 1000)
      const fee = Math.floor((stxAmount * entryFeeRate) / 1000);
      const netAmount = stxAmount - fee;
      
      // Calculate shares (TOKEN_PRECISION = 1000000)
      const shares = Math.floor((netAmount * 1000000) / nav);

      return shares;
    } catch (error) {
      console.error("Error calculating shares for deposit:", error);
      // Fallback calculation assuming 1:1 ratio
      return stxAmount;
    }
  }

  /**
   * Calculate STX to receive for a given shares amount
   */
  async calculateStxForWithdraw(sharesAmount: number): Promise<number> {
    try {
      const contractState = await this.getContractState();
      const nav = contractState.nav;
      const exitFeeRate = contractState.exitFee;

      if (nav === 0) {
        throw new Error("NAV is not set");
      }

      // Calculate STX value (TOKEN_PRECISION = 1000000)
      const stxValue = Math.floor((sharesAmount * nav) / 1000000);
      
      // Calculate exit fee (fee rate is in basis points, so divide by 1000)
      const fee = Math.floor((stxValue * exitFeeRate) / 1000);
      const netStx = stxValue - fee;

      return netStx;
    } catch (error) {
      console.error("Error calculating STX for withdraw:", error);
      // Fallback calculation assuming 1:1 ratio
      return sharesAmount;
    }
  }

  /**
   * Get user's STX balance from the blockchain
   */
  async getStxBalance(address: string): Promise<number> {
    try {
      const response = await fetch(
        `${this.network.client.baseUrl}/extended/v1/address/${address}/stx`
      );
      const data = await response.json();
      return parseInt(data.balance) || 0;
    } catch (error) {
      console.error("Error fetching STX balance:", error);
      return 0;
    }
  }

  /**
   * Check if contract is paused
   */
  async isPaused(): Promise<boolean> {
    try {
      const contractState = await this.getContractState();
      return contractState.paused;
    } catch (error) {
      console.error("Error checking if contract is paused:", error);
      return false;
    }
  }

  /**
   * Get current network name
   */
  getNetworkName(): string {
    return config.stacksNetwork;
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return this.contractAddress;
  }

  /**
   * Get contract name
   */
  getContractName(): string {
    return this.contractName;
  }

  /**
   * Get full contract identifier
   */
  getContractIdentifier(): string {
    return `${this.contractAddress}.${this.contractName}`;
  }
}

// Export singleton instance
export const contractService = new PoolMindContractService();
