import {
  StacksNetwork,
  STACKS_MAINNET,
  STACKS_TESTNET,
  STACKS_DEVNET,
} from "@stacks/network";
import {
  makeContractCall,
  makeContractDeploy,
  broadcastTransaction,
  fetchCallReadOnlyFunction,
  cvToValue,
  contractPrincipalCV,
  standardPrincipalCV,
  uintCV,
  stringUtf8CV,
  bufferCV,
  someCV,
  noneCV,
} from "@stacks/transactions";
import { config, stacks, contractCall as contractCallConfig } from "../config";
import { ContractCallOptions, TransactionResult } from "../types/contract";

export class BaseContractService {
  protected network: StacksNetwork;

  constructor() {
    this.network = this.getNetwork();
  }

  /**
   * Get the appropriate Stacks network instance based on configuration
   */
  private getNetwork(): StacksNetwork {
    const { network: networkType } = config.stacks;

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
   * Get the current network name
   */
  public getNetworkName(): string {
    return config.stacks.network;
  }

  /**
   * Make a contract call transaction
   */
  protected async makeContractCall(
    contractAddress: string,
    contractName: string,
    functionName: string,
    functionArgs: any[],
    options: ContractCallOptions,
  ): Promise<TransactionResult> {
    const doCall = async (): Promise<TransactionResult> => {
      const txOptions = {
        contractAddress,
        contractName,
        functionName,
        functionArgs,
        senderKey: options.senderKey,
        network: this.network,
        fee: options.fee,
        nonce: options.nonce,
      };

      const transaction = await makeContractCall(txOptions);
      const broadcastResponse = await broadcastTransaction({
        transaction,
        network: this.network,
      });

      if ("error" in broadcastResponse) {
        return {
          txId: "",
          success: false,
          error: broadcastResponse.error,
        };
      }

      return {
        txId: broadcastResponse.txid || "",
        success: true,
        result: broadcastResponse,
      };
    };

    try {
      if (stacks.network !== "devnet") {
        return await this.retry(
          doCall,
          contractCallConfig.retryCount,
          contractCallConfig.retryDelayMs,
          functionName,
        );
      }
      return await doCall();
    } catch (error) {
      return {
        txId: "",
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Call a read-only contract function
   */
  protected async callReadOnlyFunction(
    contractAddress: string,
    contractName: string,
    functionName: string,
    functionArgs: any[] = [],
    senderAddress?: string,
  ): Promise<any> {
    const readOnlyCall = async () => {
      const result = await fetchCallReadOnlyFunction({
        contractAddress,
        contractName,
        functionName,
        functionArgs,
        network: this.network,
        senderAddress: senderAddress || contractAddress,
      });

      return cvToValue(result);
    };

    try {
      if (stacks.network !== "devnet") {
        return await this.retry(
          readOnlyCall,
          contractCallConfig.retryCount,
          contractCallConfig.retryDelayMs,
          functionName,
        );
      }
      return await readOnlyCall();
    } catch (error) {
      console.error(`Error calling read-only function ${functionName}:`, error);
      throw error;
    }
  }

  private async retry<T>(
    fn: () => Promise<T>,
    retries: number,
    delay: number,
    functionName: string,
  ): Promise<T> {
    let lastError: Error | undefined;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          console.warn(
            `Retry attempt ${i + 1} for ${functionName} after error: ${
              lastError.message
            }. Retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  /**
   * Wait for transaction confirmation
   */
  public async waitForTransaction(
    txId: string,
    maxWaitTime: number = 300000,
  ): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 3000; // 3 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(
          `${this.network.client.baseUrl}/extended/v1/tx/${txId}`,
        );
        const txData = await response.json();

        if (txData.tx_status === "success") {
          return { success: true, data: txData };
        } else if (
          txData.tx_status === "abort_by_response" ||
          txData.tx_status === "abort_by_post_condition"
        ) {
          return { success: false, error: "Transaction aborted", data: txData };
        }

        // Continue polling if transaction is still pending
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        // Continue polling on error (transaction might not be in mempool yet)
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    return { success: false, error: "Transaction confirmation timeout" };
  }

  /**
   * Get current account nonce
   */
  public async getAccountNonce(address: string): Promise<number> {
    try {
      const response = await fetch(
        `${this.network.client.baseUrl}/extended/v1/address/${address}/nonces`,
      );
      const data = await response.json();
      return data.possible_next_nonce || 0;
    } catch (error) {
      console.error("Error fetching account nonce:", error);
      return 0;
    }
  }

  /**
   * Get account STX balance
   */
  public async getStxBalance(address: string): Promise<number> {
    try {
      const response = await fetch(
        `${this.network.client.baseUrl}/extended/v1/address/${address}/stx`,
      );
      const data = await response.json();
      return parseInt(data.balance) || 0;
    } catch (error) {
      console.error("Error fetching STX balance:", error);
      return 0;
    }
  }

  /**
   * Estimate transaction fee
   */
  public async estimateTransactionFee(
    contractAddress: string,
    contractName: string,
    functionName: string,
    functionArgs: any[],
    senderKey: string,
  ): Promise<number> {
    try {
      const txOptions = {
        contractAddress,
        contractName,
        functionName,
        functionArgs,
        senderKey,
        network: this.network,
        fee: 0, // Will be estimated
      };

      const transaction = await makeContractCall(txOptions);
      return parseInt(
        transaction.auth.spendingCondition?.fee?.toString() || "0",
      );
    } catch (error) {
      console.error("Error estimating transaction fee:", error);
      return 10000; // Default fee
    }
  }

  /**
   * Utility functions for creating Clarity values
   */
  public static createUintCV(value: number | bigint): any {
    return uintCV(value);
  }

  public static createStringUtf8CV(value: string): any {
    return stringUtf8CV(value);
  }

  public static createBufferCV(value: string | Uint8Array): any {
    if (typeof value === "string") {
      return bufferCV(new TextEncoder().encode(value));
    }
    return bufferCV(value);
  }

  public static createPrincipalCV(address: string): any {
    return standardPrincipalCV(address);
  }

  public static createContractPrincipalCV(
    address: string,
    contractName: string,
  ): any {
    return contractPrincipalCV(address, contractName);
  }

  public static createOptionalCV(value: any): any {
    return value ? someCV(value) : noneCV();
  }
}
