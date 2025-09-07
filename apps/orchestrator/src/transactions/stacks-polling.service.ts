import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@stacks/blockchain-api-client';
import Queue from 'bull';
import { TransactionsService } from './transactions.service';
import {
  StacksPollingQueueService,
  StacksPollingJobData,
  StacksPollingJobResult,
} from './stacks-polling-queue.service';
import { ITransaction } from '../lib/models/transaction';
import { AppConfig } from '../config/env.schema';
import { defaultUrlFromNetwork, StacksNetworkName } from '@stacks/network';

// Define the transaction status constants since we can't import the enum
const TRANSACTION_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  ABORT_BY_RESPONSE: 'abort_by_response',
  ABORT_BY_POST_CONDITION: 'abort_by_post_condition',
  DROPPED_REPLACE_BY_FEE: 'dropped_replace_by_fee',
  DROPPED_REPLACE_ACROSS_FORK: 'dropped_replace_across_fork',
  DROPPED_TOO_EXPENSIVE: 'dropped_too_expensive',
  DROPPED_STALE_GARBAGE_COLLECT: 'dropped_stale_garbage_collect',
} as const;

// Define interfaces for the API responses
interface StacksApiTransaction {
  tx_id: string;
  tx_status: string;
  block_height?: number;
  block_hash?: string;
  burn_block_time?: number;
  burn_block_time_iso?: string;
  canonical?: boolean;
  tx_index?: number;
  tx_result?: {
    hex: string;
    repr: string;
  };
  event_count?: number;
  parent_block_hash?: string;
  is_unanchored?: boolean;
  microblock_hash?: string;
  microblock_sequence?: number;
  microblock_canonical?: boolean;
  execution_cost_read_count?: number;
  execution_cost_read_length?: number;
  execution_cost_runtime?: number;
  execution_cost_write_count?: number;
  execution_cost_write_length?: number;
}

interface NetworkInfo {
  peer_version?: number;
  pox_consensus?: string;
  burn_block_height?: number;
  stable_pox_consensus?: string;
  stable_burn_block_height?: number;
  server_version?: string;
  network_id?: number;
  parent_network_id?: number;
  stacks_tip_height?: number;
  stacks_tip?: string;
  stacks_tip_consensus_hash?: string;
  genesis_chainstate_hash?: string;
  unanchored_tip?: string | null;
  unanchored_seq?: number | null;
  exit_at_block_height?: number | null;
  is_fully_synced?: boolean;
  node_public_key?: string;
  node_public_key_hash?: string;
}

@Injectable()
export class StacksPollingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StacksPollingService.name);
  private stacksApiClient: any;
  private apiBaseUrl: string;
  private intervalTimer: NodeJS.Timeout;
  private readonly POLL_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRIES = 50; // Maximum polling attempts
  private readonly CONFIRMATION_THRESHOLD = 6; // Required confirmations
  private readonly STUCK_TRANSACTION_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours
  private readonly FORCE_CONFIRMATION_THRESHOLD = 10 * 60 * 1000; // 10 minutes

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly configService: ConfigService<AppConfig>,
    private readonly pollingQueueService: StacksPollingQueueService,
  ) {}

  async onModuleInit() {
    await this.initializeStacksApi();

    // Add a small delay to ensure processor service has time to initialize
    setTimeout(() => {
      this.startPollingScheduler();
    }, 5000); // 5 second delay

    this.logger.log(
      '🔄 Stacks polling service initialized - scheduler will start in 5 seconds',
    );
  }

  async onModuleDestroy() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }

    this.logger.log('🔄 Stacks polling service shut down');
  }

  // =====================================
  // INITIALIZATION METHODS
  // =====================================

  /**
   * Initialize Stacks API client
   */
  private async initializeStacksApi() {
    try {
      const network =
        this.configService.get<StacksNetworkName>('stacks.network')!;

      // Determine the correct API URL based on network
      this.apiBaseUrl = defaultUrlFromNetwork(network);

      // Create the Stacks API client
      this.stacksApiClient = createClient({
        baseUrl: this.apiBaseUrl,
        fetch: fetch,
      });

      this.logger.log(
        `✓ Stacks API initialized for ${network} network: ${this.apiBaseUrl}`,
      );

      // Test the connection
      await this.testApiConnection();
    } catch (error) {
      this.logger.error('Failed to initialize Stacks API:', error);
      throw error;
    }
  }

  /**
   * Test API connection
   */
  private async testApiConnection() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/v2/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PoolMind-Orchestrator/1.0.0',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.warn(
          `API test failed: ${response.status} ${response.statusText}`,
        );
        return;
      }

      const networkInfo: NetworkInfo = await response.json();
      this.logger.log(
        `🌐 Connected to Stacks network - Block height: ${networkInfo.stacks_tip_height}, ` +
          `Network ID: ${networkInfo.network_id}, Synced: ${networkInfo.is_fully_synced}`,
      );
    } catch (error) {
      this.logger.warn('Failed to test API connection:', error);
      // Don't throw here, as the service might still work
    }
  }

  // =====================================
  // POLLING SCHEDULER
  // =====================================

  /**
   * Start the polling scheduler that checks for pending transactions
   */
  private startPollingScheduler() {
    this.intervalTimer = setInterval(async () => {
      try {
        await this.schedulePendingTransactions();

        // Every 5 minutes, check for stuck transactions
        const now = Date.now();
        if (now % (5 * 60 * 1000) < this.POLL_INTERVAL) {
          await this.checkForStuckTransactions();
        }
      } catch (error) {
        this.logger.error('Error in polling scheduler:', error);
      }
    }, this.POLL_INTERVAL);

    this.logger.log(
      `🕐 Polling scheduler started with ${this.POLL_INTERVAL / 1000}s interval`,
    );
  }

  /**
   * Find pending transactions and schedule them for polling
   */
  private async schedulePendingTransactions() {
    try {
      const startTime = Date.now();

      // Get pending transactions that need polling
      const pendingTransactions =
        await this.transactionsService.getPendingTransactions(this.MAX_RETRIES);

      if (pendingTransactions.length === 0) {
        this.logger.debug('No pending transactions found for polling');
        return;
      }

      this.logger.debug(
        `Found ${pendingTransactions.length} pending transactions to poll`,
      );

      let scheduled = 0;
      let skipped = 0;

      for (const transaction of pendingTransactions) {
        try {
          // Check if this transaction is already in the queue
          const existingJobs = await this.pollingQueueService
            .getQueue()
            ?.getJobs(['waiting', 'active'], 0, -1);
          const alreadyQueued = existingJobs.some(
            (job) => job.data.transactionId === transaction._id.toString(),
          );

          if (alreadyQueued) {
            this.logger.debug(
              `Transaction ${transaction._id} already queued for polling (found ${existingJobs.length} existing jobs)`,
            );
            skipped++;
            continue;
          }

          // Schedule the transaction for polling
          await this.queueTransactionForPolling(transaction);
          scheduled++;
        } catch (error) {
          this.logger.error(
            `Failed to schedule transaction ${transaction._id} for polling:`,
            error,
          );
        }
      }

      const duration = Date.now() - startTime;

      if (scheduled > 0 || skipped > 0) {
        this.logger.log(
          `Polling scheduler completed in ${duration}ms - Scheduled: ${scheduled}, Skipped: ${skipped}, Total: ${pendingTransactions.length}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to schedule pending transactions:', error);
    }
  }

  /**
   * Check for transactions that have been stuck in confirming status too long
   */
  private async checkForStuckTransactions() {
    try {
      const startTime = Date.now();

      // Find transactions stuck in confirming status for too long
      const stuckThreshold = new Date(
        Date.now() - this.STUCK_TRANSACTION_THRESHOLD,
      );

      // This would require a query method in the transaction model
      const potentiallyStuckTransactions = await this.transactionsService
        .getTransactionModel()
        .find({
          status: 'confirming',
          updatedAt: { $lt: stuckThreshold },
          'metadata.txId': { $exists: true, $ne: null },
        })
        .limit(10) // Don't process too many at once
        .exec();

      if (potentiallyStuckTransactions.length > 0) {
        this.logger.warn(
          `Found ${potentiallyStuckTransactions.length} potentially stuck transactions in confirming status`,
        );

        for (const transaction of potentiallyStuckTransactions) {
          try {
            this.logger.warn(
              `Attempting to resolve stuck transaction ${transaction._id} (stuck for ${Math.round(
                (Date.now() - transaction.updatedAt.getTime()) / 60000,
              )} minutes)`,
            );

            // Force a high-priority polling job for this transaction
            await this.queueTransactionForPolling(transaction, 100, 0);
          } catch (error) {
            this.logger.error(
              `Failed to queue stuck transaction ${transaction._id}:`,
              error,
            );
          }
        }
      } else {
        this.logger.debug('No stuck transactions found');
      }

      const duration = Date.now() - startTime;
      if (potentiallyStuckTransactions.length > 0) {
        this.logger.log(`Stuck transaction check completed in ${duration}ms`);
      }
    } catch (error) {
      this.logger.error('Failed to check for stuck transactions:', error);
    }
  }

  // =====================================
  // JOB QUEUE METHODS
  // =====================================

  /**
   * Queue a transaction for polling
   */
  async queueTransactionForPolling(
    transaction: ITransaction,
    priority = 0,
    delay = 0,
  ): Promise<Queue.Job<StacksPollingJobData>> {
    try {
      const jobData: StacksPollingJobData = {
        transactionId: transaction._id.toString(),
        txId: transaction.metadata.txId,
        retryCount: transaction.metadata.retryCount,
        lastCheckedAt: transaction.metadata.lastCheckedAt || new Date(),
      };

      const job = await this.pollingQueueService.addJob(jobData, {
        priority,
        delay,
        jobId: `poll-${transaction._id}-${Date.now()}`, // Unique job ID with timestamp
      });

      this.logger.debug(
        `Queued transaction ${transaction._id} for polling - Job ID: ${job.id}` +
          (transaction.metadata.txId
            ? ` - TxID: ${transaction.metadata.txId}`
            : ''),
      );

      return job;
    } catch (error) {
      this.logger.error(
        `Failed to queue transaction ${transaction._id} for polling:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get the polling queue instance
   */
  getQueue(): Queue.Queue<StacksPollingJobData> | undefined {
    return this.pollingQueueService.getQueue();
  }

  /**
   * Get the API base URL
   */
  getApiBaseUrl(): string {
    return this.apiBaseUrl;
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Check transaction confirmation status on Stacks network
   */
  private async checkTransactionConfirmation(
    transaction: ITransaction,
  ): Promise<StacksPollingJobResult> {
    try {
      const txId = transaction.metadata.txId!;

      this.logger.debug(`Checking confirmation status for txId: ${txId}`);

      // Get transaction from Stacks API using direct fetch
      const response = await fetch(
        `${this.apiBaseUrl}/extended/v1/tx/${txId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PoolMind-Orchestrator/1.0.0',
          },
          signal: AbortSignal.timeout(10000),
        },
      );

      if (response.status === 404) {
        this.logger.debug(`Transaction ${txId} not yet visible in API`);

        // Increment retry count but don't consider it a failure
        await this.transactionsService.incrementTransactionRetry(
          transaction._id.toString(),
        );

        return {
          success: true,
          transactionId: transaction._id.toString(),
          shouldRetry: transaction.metadata.retryCount < this.MAX_RETRIES,
        };
      }

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const stacksTransaction: StacksApiTransaction = await response.json();

      // Process the transaction status
      return await this.processStacksTransactionStatus(
        transaction,
        stacksTransaction,
      );
    } catch (error) {
      this.logger.error(
        `Failed to check confirmation for transaction ${transaction._id}:`,
        error,
      );

      // Increment retry count on API errors
      await this.transactionsService.incrementTransactionRetry(
        transaction._id.toString(),
      );

      return {
        success: false,
        transactionId: transaction._id.toString(),
        error: error.message || 'API error',
        shouldRetry: transaction.metadata.retryCount < this.MAX_RETRIES,
      };
    }
  }

  /**
   * Process Stacks transaction status and update our database
   */
  private async processStacksTransactionStatus(
    transaction: ITransaction,
    stacksTransaction: StacksApiTransaction,
  ): Promise<StacksPollingJobResult> {
    const txId = stacksTransaction.tx_id;
    const currentStatus = transaction.status;
    let newStatus: string;
    let confirmations = 0;

    this.logger.debug(
      `Processing transaction ${transaction._id} - Stacks status: ${stacksTransaction.tx_status}, ` +
        `Block height: ${stacksTransaction.block_height}, Current status: ${currentStatus}`,
    );

    // Check if transaction has been stuck in confirming for too long (2 hours)
    if (currentStatus === 'confirming') {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      if (transaction.updatedAt < twoHoursAgo) {
        this.logger.warn(
          `Transaction ${transaction._id} stuck in confirming for over 2 hours - forcing confirmation check`,
        );
      }
    }

    // Determine new status based on Stacks transaction status
    switch (stacksTransaction.tx_status) {
      case TRANSACTION_STATUS.PENDING:
        newStatus = 'pending';
        break;

      case TRANSACTION_STATUS.SUCCESS:
        // Calculate confirmations if we have block height
        if (stacksTransaction.block_height) {
          try {
            const currentBlockHeight = await this.getCurrentBlockHeight();
            confirmations = Math.max(
              0,
              currentBlockHeight - stacksTransaction.block_height + 1,
            );

            this.logger.debug(
              `Confirmation calculation for ${transaction._id}: ` +
                `Current block: ${currentBlockHeight}, TX block: ${stacksTransaction.block_height}, ` +
                `Confirmations: ${confirmations}/${this.CONFIRMATION_THRESHOLD}`,
            );

            if (confirmations >= this.CONFIRMATION_THRESHOLD) {
              newStatus = 'confirmed';
            } else {
              newStatus = 'confirming';
            }
          } catch (error) {
            this.logger.error(
              `Failed to get block height for confirmation calculation:`,
              error,
            );

            // Fallback: If we can't get block height, check if the transaction has been
            // in "confirming" status for a reasonable time and force confirmation
            if (currentStatus === 'confirming') {
              const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
              if (transaction.updatedAt < tenMinutesAgo) {
                this.logger.warn(
                  `Transaction ${transaction._id} forcing confirmation due to block height API failure ` +
                    `and sufficient time passed`,
                );
                newStatus = 'confirmed';
                confirmations = this.CONFIRMATION_THRESHOLD; // Assume sufficient confirmations
              } else {
                newStatus = 'confirming';
                confirmations = transaction.metadata.confirmations; // Keep existing count
              }
            } else {
              newStatus = 'confirming';
            }
          }
        } else {
          // No block height in transaction response - this shouldn't happen for successful transactions
          this.logger.warn(
            `Transaction ${transaction._id} marked as SUCCESS but no block_height in response`,
          );

          // Check if transaction has been processing for too long without block height
          if (currentStatus === 'confirming' || currentStatus === 'pending') {
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
            if (transaction.updatedAt < fifteenMinutesAgo) {
              this.logger.warn(
                `Transaction ${transaction._id} forcing confirmation - SUCCESS status but no block height for 15+ minutes`,
              );
              newStatus = 'confirmed';
              confirmations = this.CONFIRMATION_THRESHOLD;
            } else {
              newStatus = 'confirming';
            }
          } else {
            newStatus = 'confirming';
          }
        }
        break;

      case TRANSACTION_STATUS.ABORT_BY_RESPONSE:
      case TRANSACTION_STATUS.ABORT_BY_POST_CONDITION:
      case TRANSACTION_STATUS.DROPPED_REPLACE_BY_FEE:
      case TRANSACTION_STATUS.DROPPED_REPLACE_ACROSS_FORK:
      case TRANSACTION_STATUS.DROPPED_TOO_EXPENSIVE:
      case TRANSACTION_STATUS.DROPPED_STALE_GARBAGE_COLLECT:
        newStatus = 'failed';
        break;

      default:
        this.logger.warn(
          `Unknown Stacks transaction status: ${stacksTransaction.tx_status}`,
        );
        newStatus = 'pending';
    }

    // Update transaction if status changed
    if (
      newStatus !== currentStatus ||
      confirmations !== transaction.metadata.confirmations
    ) {
      const updateData = {
        status: newStatus as any,
        blockHeight: stacksTransaction.block_height || undefined,
        confirmations,
        errorMessage: [
          TRANSACTION_STATUS.ABORT_BY_RESPONSE,
          TRANSACTION_STATUS.ABORT_BY_POST_CONDITION,
          TRANSACTION_STATUS.DROPPED_REPLACE_BY_FEE,
          TRANSACTION_STATUS.DROPPED_REPLACE_ACROSS_FORK,
          TRANSACTION_STATUS.DROPPED_TOO_EXPENSIVE,
          TRANSACTION_STATUS.DROPPED_STALE_GARBAGE_COLLECT,
        ].includes(stacksTransaction.tx_status as any)
          ? `Transaction failed: ${stacksTransaction.tx_status}`
          : undefined,
      };

      await this.transactionsService.updateTransactionStatus(
        transaction._id.toString(),
        updateData,
      );

      this.logger.log(
        `Transaction ${transaction._id} status updated: ${currentStatus} → ${newStatus}` +
          (confirmations > 0 ? ` (${confirmations} confirmations)` : ''),
      );
    }

    // Determine if we should continue polling
    const shouldRetry =
      !['confirmed', 'failed'].includes(newStatus) &&
      transaction.metadata.retryCount < this.MAX_RETRIES;

    return {
      success: true,
      transactionId: transaction._id.toString(),
      newStatus,
      confirmations,
      shouldRetry,
    };
  }

  /**
   * Handle transaction that hasn't been broadcast yet
   */
  private async handleUnbroadcastTransaction(
    transaction: ITransaction,
  ): Promise<StacksPollingJobResult> {
    this.logger.debug(
      `Transaction ${transaction._id} has no txId yet (created ${transaction.createdAt})`,
    );

    // Check if transaction is too old (older than 1 hour)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (transaction.createdAt < hourAgo) {
      this.logger.warn(
        `Transaction ${transaction._id} created over 1 hour ago but still no txId - marking as failed`,
      );

      await this.transactionsService.updateTransactionStatus(
        transaction._id.toString(),
        {
          status: 'failed',
          errorMessage:
            'Transaction was not broadcast within expected timeframe',
          errorCode: 'BROADCAST_TIMEOUT',
        },
      );

      return {
        success: true,
        transactionId: transaction._id.toString(),
        newStatus: 'failed',
        shouldRetry: false,
      };
    }

    // Increment retry count and continue polling
    await this.transactionsService.incrementTransactionRetry(
      transaction._id.toString(),
    );

    return {
      success: true,
      transactionId: transaction._id.toString(),
      shouldRetry: transaction.metadata.retryCount < this.MAX_RETRIES,
    };
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Get current block height from Stacks network with retry logic
   */
  private async getCurrentBlockHeight(): Promise<number> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/v2/info`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PoolMind-Orchestrator/1.0.0',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to get network info: ${response.status} ${response.statusText}`,
          );
        }

        const networkInfo: NetworkInfo = await response.json();
        const blockHeight = networkInfo.stacks_tip_height || 0;

        if (blockHeight === 0) {
          throw new Error('Network returned block height of 0');
        }

        this.logger.debug(`Current block height: ${blockHeight}`);
        return blockHeight;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Attempt ${attempt}/${maxRetries} to get block height failed:`,
          error,
        );

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
        }
      }
    }

    this.logger.error(
      `Failed to get block height after ${maxRetries} attempts:`,
      lastError,
    );
    throw new Error(
      `Unable to get current block height: ${lastError?.message}`,
    );
  }

  // =====================================
  // PUBLIC API METHODS
  // =====================================

  /**
   * Manually trigger polling for a specific transaction
   */
  async triggerTransactionPolling(
    transactionId: string,
    priority = 10,
  ): Promise<void> {
    try {
      const transaction =
        await this.transactionsService.getTransactionById(transactionId);

      if (transaction.isComplete()) {
        this.logger.debug(`Transaction ${transactionId} is already complete`);
        return;
      }

      await this.queueTransactionForPolling(transaction, priority);

      this.logger.log(
        `Manually triggered polling for transaction ${transactionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger polling for transaction ${transactionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get polling queue statistics
   */
  async getQueueStats() {
    try {
      const queue = this.pollingQueueService.getQueue();
      if (!queue) {
        return {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          totalJobs: 0,
        };
      }

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getJobs(['waiting'], 0, -1),
        queue.getJobs(['active'], 0, -1),
        queue.getJobs(['completed'], 0, 10),
        queue.getJobs(['failed'], 0, 10),
        queue.getJobs(['delayed'], 0, -1),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        totalJobs: waiting.length + active.length + delayed.length,
      };
    } catch (error) {
      this.logger.error('Failed to get queue statistics:', error);
      throw error;
    }
  }

  /**
   * Get detailed transaction information from Stacks network
   */
  async getTransactionDetails(
    txId: string,
  ): Promise<StacksApiTransaction | null> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/extended/v1/tx/${txId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PoolMind-Orchestrator/1.0.0',
          },
          signal: AbortSignal.timeout(10000),
        },
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(
          `Failed to get transaction: ${response.status} ${response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      this.logger.error(
        `Failed to get transaction details for ${txId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<NetworkInfo> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/v2/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PoolMind-Orchestrator/1.0.0',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to get network info: ${response.status} ${response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Failed to get network info:', error);
      throw error;
    }
  }

  /**
   * Force confirmation of a stuck transaction
   */
  async forceTransactionConfirmation(transactionId: string): Promise<boolean> {
    try {
      this.logger.warn(
        `Forcing confirmation for potentially stuck transaction ${transactionId}`,
      );

      const transaction =
        await this.transactionsService.getTransactionById(transactionId);

      if (!transaction) {
        this.logger.error(
          `Transaction ${transactionId} not found for force confirmation`,
        );
        return false;
      }

      if (transaction.status !== 'confirming') {
        this.logger.warn(
          `Transaction ${transactionId} is not in confirming status (${transaction.status})`,
        );
        return false;
      }

      if (!transaction.metadata.txId) {
        this.logger.error(
          `Transaction ${transactionId} has no txId - cannot force confirmation`,
        );
        return false;
      }

      // Try to get transaction details from Stacks API one more time
      try {
        const stacksTransaction = await this.getTransactionDetails(
          transaction.metadata.txId,
        );

        if (stacksTransaction && stacksTransaction.tx_status === 'success') {
          this.logger.warn(
            `Transaction ${transactionId} found as successful in Stacks API - forcing confirmation`,
          );

          await this.transactionsService.updateTransactionStatus(
            transactionId,
            {
              status: 'confirmed',
              confirmations: this.CONFIRMATION_THRESHOLD,
              metadata: {
                forcedConfirmation: true,
                forcedAt: new Date().toISOString(),
              },
            },
          );

          return true;
        }
      } catch (apiError) {
        this.logger.warn(
          `API check failed for transaction ${transactionId}:`,
          apiError,
        );
      }

      // Last resort: If transaction has been stuck for over 2 hours, force confirm
      const stuckThreshold = new Date(
        Date.now() - this.STUCK_TRANSACTION_THRESHOLD,
      );
      if (transaction.updatedAt < stuckThreshold) {
        this.logger.warn(
          `Transaction ${transactionId} stuck for over 2 hours - forcing confirmation as last resort`,
        );

        await this.transactionsService.updateTransactionStatus(transactionId, {
          status: 'confirmed',
          confirmations: this.CONFIRMATION_THRESHOLD,
          metadata: {
            forcedConfirmation: true,
            forcedReason: 'stuck_timeout',
            forcedAt: new Date().toISOString(),
          },
        });

        return true;
      }

      this.logger.warn(
        `Transaction ${transactionId} not eligible for force confirmation yet`,
      );
      return false;
    } catch (error) {
      this.logger.error(
        `Failed to force confirmation for transaction ${transactionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get stuck transactions that can be force-confirmed
   */
  async getStuckTransactions(): Promise<any[]> {
    try {
      const stuckThreshold = new Date(
        Date.now() - this.STUCK_TRANSACTION_THRESHOLD,
      );

      const stuckTransactions = await this.transactionsService
        .getTransactionModel()
        .find({
          status: 'confirming',
          updatedAt: { $lt: stuckThreshold },
          'metadata.txId': { $exists: true, $ne: null },
        })
        .select('_id metadata.txId status updatedAt createdAt')
        .sort({ updatedAt: 1 })
        .limit(20)
        .exec();

      return stuckTransactions.map((tx) => ({
        id: tx._id.toString(),
        txId: tx.metadata.txId,
        status: tx.status,
        stuckForMinutes: Math.round(
          (Date.now() - tx.updatedAt.getTime()) / 60000,
        ),
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      }));
    } catch (error) {
      this.logger.error('Failed to get stuck transactions:', error);
      throw error;
    }
  }
}
