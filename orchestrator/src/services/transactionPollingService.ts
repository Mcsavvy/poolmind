import winston from "winston";
import { config } from "../config";
import Transaction, { ITransaction } from "../models/Transaction";
import { TransactionQueueData, TransactionStatusUpdate } from "./queueService";
import { notificationService } from "./notificationService";
import User from "../models/User";
import { STACKS_DEVNET, STACKS_MAINNET, STACKS_TESTNET } from "@stacks/network";

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "transaction-polling" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: config.logging.files.combined,
    }),
  ],
});

export interface StacksTransaction {
  tx_id: string;
  tx_status: string;
  tx_result?: {
    hex: string;
    repr: string;
  };
  block_height?: number;
  burn_block_time?: number;
  canonical?: boolean;
  microblock_canonical?: boolean;
  microblock_sequence?: number;
  microblock_hash?: string;
  parent_microblock_hash?: string;
  block_hash?: string;
  parent_block_hash?: string;
  anchor_mode?: string;
  is_unanchored?: boolean;
  block_time?: number;
  block_time_iso?: string;
  fee_rate?: string;
  sender_address?: string;
  sponsored?: boolean;
  post_condition_mode?: string;
  post_conditions?: any[];
  anchor_mode_name?: string;
  tx_type?: string;
  token_transfer?: any;
  smart_contract?: any;
  contract_call?: any;
  poison_microblock?: any;
  coinbase_payload?: any;
  tenure_change_payload?: any;
  events?: any[];
}

class TransactionPollingService {
  private readonly stacksApiUrl: string;
  private readonly maxRetries = 60; // 5 minutes with 5-second intervals
  private readonly retryInterval = 5000; // 5 seconds

  constructor() {
    // Use the same API URL as the frontend
    this.stacksApiUrl = this.getStacksApiUrl();
    logger.info("Transaction polling service initialized", {
      stacksApiUrl: this.stacksApiUrl,
      maxRetries: this.maxRetries,
      retryInterval: this.retryInterval,
    });
  }

  private getStacksApiUrl(): string {
    switch (config.stacks.network) {
      case "mainnet":
        return STACKS_MAINNET.client.baseUrl;
      case "testnet":
        return STACKS_TESTNET.client.baseUrl;
      case "devnet":
      default:
        return STACKS_DEVNET.client.baseUrl;
    }
  }

  /**
   * Create a new transaction record in the database
   */
  async createTransaction(data: TransactionQueueData): Promise<ITransaction> {
    try {
      const timeoutAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

      const transaction = new Transaction({
        txId: data.txId,
        userId: data.userId,
        userAddress: data.userAddress,
        type: data.type,
        status: "pending",
        stxAmount: data.stxAmount,
        plmdAmount: data.plmdAmount,
        nav: data.nav,
        fee: data.fee,
        netAmount: data.netAmount,
        retryCount: 0,
        timeoutAt,
      });

      const savedTransaction = await transaction.save();

      logger.info("Transaction created in database", {
        txId: data.txId,
        userId: data.userId,
        type: data.type,
      });

      return savedTransaction;
    } catch (error) {
      logger.error("Failed to create transaction in database", {
        txId: data.txId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Poll a single transaction from the Stacks API
   */
  async pollTransaction(txId: string): Promise<TransactionStatusUpdate> {
    try {
      const url = `${this.stacksApiUrl}/extended/v1/tx/${txId}`;
      logger.debug("Polling transaction", { txId, url });

      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.status === 404) {
        logger.debug("Transaction not found in mempool yet", { txId });
        return {
          txId,
          status: "pending",
        };
      }

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const txData: StacksTransaction = await response.json();

      logger.debug("Transaction data received", {
        txId,
        status: txData.tx_status,
        blockHeight: txData.block_height,
      });

      // Update transaction record
      await this.updateTransactionFromApiData(txId, txData);

      // Determine status
      if (txData.tx_status === "success") {
        return {
          txId,
          status: "success",
          blockHeight: txData.block_height,
          confirmedAt: new Date(),
        };
      } else if (txData.tx_status.startsWith("abort")) {
        return {
          txId,
          status: "failed",
          blockHeight: txData.block_height,
          errorMessage: `Transaction aborted: ${txData.tx_status}`,
          confirmedAt: new Date(),
        };
      } else {
        // Still pending
        return {
          txId,
          status: "pending",
        };
      }
    } catch (error) {
      logger.error("Failed to poll transaction", {
        txId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Don't throw error, return pending status to continue polling
      return {
        txId,
        status: "pending",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update transaction record in database
   */
  async updateTransactionStatus(
    update: TransactionStatusUpdate,
  ): Promise<void> {
    try {
      const updateData: Partial<ITransaction> = {
        status: update.status,
        lastPolledAt: new Date(),
      };

      if (update.blockHeight) {
        updateData.blockHeight = update.blockHeight;
      }

      if (update.errorMessage) {
        updateData.errorMessage = update.errorMessage;
      }

      if (update.confirmedAt) {
        updateData.confirmedAt = update.confirmedAt;
      }

      // Increment retry count
      const updatedTransaction = await Transaction.findOneAndUpdate(
        { txId: update.txId },
        {
          $set: updateData,
          $inc: { retryCount: 1 },
        },
        { new: true },
      );

      logger.debug("Transaction status updated", {
        txId: update.txId,
        status: update.status,
        blockHeight: update.blockHeight,
      });

      // Publish notification event for successful transactions
      if (update.status === "success" && updatedTransaction) {
        await this.publishSuccessNotification(
          updatedTransaction,
          update.blockHeight,
        );
      }
    } catch (error) {
      logger.error("Failed to update transaction status", {
        txId: update.txId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Update transaction with detailed data from Stacks API
   */
  private async updateTransactionFromApiData(
    txId: string,
    txData: StacksTransaction,
  ): Promise<void> {
    try {
      const updateData: Partial<ITransaction> = {
        blockHeight: txData.block_height,
      };

      // Extract more details based on transaction type
      if (txData.contract_call) {
        // This is a contract call, we can extract more details
        const contractCall = txData.contract_call;
        logger.debug("Contract call details", {
          txId,
          contractId: contractCall.contract_id,
          functionName: contractCall.function_name,
          functionArgs: contractCall.function_args,
        });
      }

      await Transaction.findOneAndUpdate(
        { txId },
        { $set: updateData },
        { new: true },
      );
    } catch (error) {
      logger.error("Failed to update transaction from API data", {
        txId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Don't throw error, this is supplementary data
    }
  }

  /**
   * Mark transaction as timed out
   */
  async markTransactionAsTimeout(txId: string): Promise<void> {
    try {
      await Transaction.findOneAndUpdate(
        { txId },
        {
          $set: {
            status: "timeout",
            confirmedAt: new Date(),
            errorMessage: "Transaction polling timed out after 5 minutes",
          },
        },
        { new: true },
      );

      logger.info("Transaction marked as timeout", { txId });
    } catch (error) {
      logger.error("Failed to mark transaction as timeout", {
        txId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(txId: string): Promise<ITransaction | null> {
    try {
      return await Transaction.findOne({ txId });
    } catch (error) {
      logger.error("Failed to get transaction", {
        txId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get transactions for a user
   */
  async getUserTransactions(
    userId: string,
    limit: number = 20,
    skip: number = 0,
  ): Promise<ITransaction[]> {
    try {
      return await Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
    } catch (error) {
      logger.error("Failed to get user transactions", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get pending transactions that have timed out
   */
  async getTimedOutTransactions(): Promise<ITransaction[]> {
    try {
      return await Transaction.find({
        status: "pending",
        timeoutAt: { $lt: new Date() },
      });
    } catch (error) {
      logger.error("Failed to get timed out transactions", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Publish success notification for completed transactions
   */
  private async publishSuccessNotification(
    transaction: ITransaction,
    blockHeight?: number,
  ): Promise<void> {
    try {
      if (!transaction.userId) {
        logger.debug(
          "No user ID found for transaction, skipping notification",
          {
            txId: transaction.txId,
          },
        );
        return;
      }

      // Get user to retrieve telegram ID
      const user = await User.findById(transaction.userId);
      if (!user) {
        logger.warn("User not found for transaction, skipping notification", {
          txId: transaction.txId,
          userId: transaction.userId,
        });
        return;
      }

      const commonData = {
        telegramId: user.telegramId,
        userId: transaction.userId.toString(),
        txId: transaction.txId,
        nav: transaction.nav,
        blockHeight: blockHeight || transaction.blockHeight,
      };

      if (transaction.type === "deposit") {
        await notificationService.publishDepositSuccess(
          commonData.telegramId,
          commonData.userId,
          commonData.txId,
          (transaction.stxAmount || 0) * 1_000_000,
          (transaction.plmdAmount || 0) * 1_000_000,
          (transaction.fee || 0) * 1_000_000,
          (transaction.netAmount || 0) * 1_000_000,
          commonData.nav,
          commonData.blockHeight,
        );
      } else if (transaction.type === "withdrawal") {
        await notificationService.publishWithdrawalSuccess(
          commonData.telegramId,
          commonData.userId,
          commonData.txId,
          (transaction.plmdAmount || 0) * 1_000_000,
          (transaction.stxAmount || 0) * 1_000_000,
          (transaction.fee || 0) * 1_000_000,
          (transaction.netAmount || 0) * 1_000_000,
          commonData.nav,
          commonData.blockHeight,
        );
      }

      logger.info("Success notification published", {
        txId: transaction.txId,
        type: transaction.type,
        telegramId: user.telegramId,
      });
    } catch (error) {
      logger.error("Failed to publish success notification", {
        txId: transaction.txId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Don't throw error as this is not critical for transaction processing
    }
  }
}

export const transactionPollingService = new TransactionPollingService();
export default transactionPollingService;
