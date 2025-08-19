import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@stacks/blockchain-api-client';
import Queue from 'bull';
import { TransactionsService } from './transactions.service';
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

export interface StacksPollingJobData {
  transactionId: string;
  txId?: string;
  retryCount: number;
  lastCheckedAt: Date;
}

export interface StacksPollingJobResult {
  success: boolean;
  transactionId: string;
  newStatus?: string;
  confirmations?: number;
  error?: string;
  shouldRetry?: boolean;
}

@Injectable()
export class StacksPollingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StacksPollingService.name);
  private pollingQueue: Queue.Queue<StacksPollingJobData>;
  private stacksApiClient: any;
  private apiBaseUrl: string;
  private intervalTimer: NodeJS.Timeout;
  private readonly POLL_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRIES = 50; // Maximum polling attempts
  private readonly CONFIRMATION_THRESHOLD = 6; // Required confirmations

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  async onModuleInit() {
    await this.initializeStacksApi();
    await this.initializeQueue();
    this.startPollingScheduler();
    
    this.logger.log('🔄 Stacks polling service initialized successfully');
  }

  async onModuleDestroy() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }
    
    if (this.pollingQueue) {
      await this.pollingQueue.close();
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
      const network = this.configService.get<StacksNetworkName>('stacks.network')!;
      
      // Determine the correct API URL based on network
      this.apiBaseUrl = defaultUrlFromNetwork(network);

      // Create the Stacks API client
      this.stacksApiClient = createClient({
        baseUrl: this.apiBaseUrl,
        fetch: fetch,
      });
      
      this.logger.log(`✓ Stacks API initialized for ${network} network: ${this.apiBaseUrl}`);
      
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
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`API test failed: ${response.status} ${response.statusText}`);
      }

      const networkInfo: NetworkInfo = await response.json();
      this.logger.log(
        `🌐 Connected to Stacks network - Block height: ${networkInfo.stacks_tip_height}, ` +
        `Network ID: ${networkInfo.network_id}, Synced: ${networkInfo.is_fully_synced}`
      );
    } catch (error) {
      this.logger.warn('Failed to test API connection:', error);
      // Don't throw here, as the service might still work
    }
  }

  /**
   * Initialize the polling queue
   */
  private async initializeQueue() {
    try {
      const redisUrl = this.configService.get<string>('redis.url');
      
      this.pollingQueue = new Queue('stacks-polling-queue', redisUrl!, {
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50,      // Keep last 50 failed jobs
          attempts: 3,           // Retry failed jobs up to 3 times
          backoff: {
            type: 'exponential',
            delay: 5000,         // Start with 5s delay
          },
        },
        settings: {
          stalledInterval: 60 * 1000,    // Check for stalled jobs every 60 seconds
          maxStalledCount: 1,             // Maximum number of times a job can be stalled
        },
      });

      // Set up job processor
      this.pollingQueue.process('poll-transaction', this.processPollingJob.bind(this));

      // Set up event handlers
      this.setupQueueEventHandlers();
      
      this.logger.log('✓ Stacks polling queue initialized');
    } catch (error) {
      this.logger.error('Failed to initialize polling queue:', error);
      throw error;
    }
  }

  /**
   * Set up queue event handlers
   */
  private setupQueueEventHandlers() {
    this.pollingQueue.on('ready', () => {
      this.logger.log('Stacks polling queue is ready');
    });

    this.pollingQueue.on('error', (error) => {
      this.logger.error('Stacks polling queue error:', error);
    });

    this.pollingQueue.on('waiting', (jobId) => {
      this.logger.debug(`Polling job ${jobId} is waiting`);
    });

    this.pollingQueue.on('active', (job) => {
      this.logger.debug(`Polling job ${job.id} started processing transaction ${job.data.transactionId}`);
    });

    this.pollingQueue.on('completed', (job, result: StacksPollingJobResult) => {
      if (result.success) {
        this.logger.log(
          `Polling job ${job.id} completed successfully for transaction ${result.transactionId}` +
          (result.newStatus ? ` - Status: ${result.newStatus}` : '') +
          (result.confirmations !== undefined ? ` - Confirmations: ${result.confirmations}` : '')
        );
      } else {
        this.logger.warn(
          `Polling job ${job.id} completed with issues for transaction ${result.transactionId}: ${result.error}`
        );
      }
    });

    this.pollingQueue.on('failed', (job, err) => {
      this.logger.error(`Polling job ${job.id} failed for transaction ${job.data.transactionId}:`, err);
    });

    this.pollingQueue.on('stalled', (job) => {
      this.logger.warn(`Polling job ${job.id} stalled for transaction ${job.data.transactionId}`);
    });
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
      } catch (error) {
        this.logger.error('Error in polling scheduler:', error);
      }
    }, this.POLL_INTERVAL);

    this.logger.log(`🕐 Polling scheduler started with ${this.POLL_INTERVAL / 1000}s interval`);
  }

  /**
   * Find pending transactions and schedule them for polling
   */
  private async schedulePendingTransactions() {
    try {
      const startTime = Date.now();
      
      // Get pending transactions that need polling
      const pendingTransactions = await this.transactionsService.getPendingTransactions(this.MAX_RETRIES);
      
      if (pendingTransactions.length === 0) {
        this.logger.debug('No pending transactions found for polling');
        return;
      }

      this.logger.debug(`Found ${pendingTransactions.length} pending transactions to poll`);

      let scheduled = 0;
      let skipped = 0;

      for (const transaction of pendingTransactions) {
        try {
          // Check if this transaction is already in the queue
          const existingJobs = await this.pollingQueue.getJobs(['waiting', 'active'], 0, -1);
          const alreadyQueued = existingJobs.some(job => 
            job.data.transactionId === transaction._id.toString()
          );

          if (alreadyQueued) {
            this.logger.debug(`Transaction ${transaction._id} already queued for polling`);
            skipped++;
            continue;
          }

          // Schedule the transaction for polling
          await this.queueTransactionForPolling(transaction);
          scheduled++;

        } catch (error) {
          this.logger.error(`Failed to schedule transaction ${transaction._id} for polling:`, error);
        }
      }

      const duration = Date.now() - startTime;
      
      if (scheduled > 0 || skipped > 0) {
        this.logger.log(
          `Polling scheduler completed in ${duration}ms - Scheduled: ${scheduled}, Skipped: ${skipped}, Total: ${pendingTransactions.length}`
        );
      }

    } catch (error) {
      this.logger.error('Failed to schedule pending transactions:', error);
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
    delay = 0
  ): Promise<Queue.Job<StacksPollingJobData>> {
    try {
      const jobData: StacksPollingJobData = {
        transactionId: transaction._id.toString(),
        txId: transaction.metadata.txId,
        retryCount: transaction.metadata.retryCount,
        lastCheckedAt: transaction.metadata.lastCheckedAt || new Date(),
      };

      const job = await this.pollingQueue.add('poll-transaction', jobData, {
        priority,
        delay,
        jobId: `poll-${transaction._id}`, // Prevent duplicate jobs
      });

      this.logger.debug(
        `Queued transaction ${transaction._id} for polling - Job ID: ${job.id}` +
        (transaction.metadata.txId ? ` - TxID: ${transaction.metadata.txId}` : '')
      );

      return job;

    } catch (error) {
      this.logger.error(`Failed to queue transaction ${transaction._id} for polling:`, error);
      throw error;
    }
  }

  /**
   * Process a polling job
   */
  private async processPollingJob(
    job: Queue.Job<StacksPollingJobData>
  ): Promise<StacksPollingJobResult> {
    const { transactionId, txId, retryCount } = job.data;
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Processing polling job for transaction ${transactionId}` +
        (txId ? ` with txId ${txId}` : ' (no txId yet)') +
        ` (attempt ${retryCount + 1})`
      );

      // Get the current transaction
      const transaction = await this.transactionsService.getTransactionById(transactionId);
      
      if (!transaction) {
        return {
          success: false,
          transactionId,
          error: 'Transaction not found',
          shouldRetry: false,
        };
      }

      // If transaction is already complete, no need to poll
      if (transaction.isComplete()) {
        this.logger.debug(`Transaction ${transactionId} is already complete (${transaction.status})`);
        return {
          success: true,
          transactionId,
          newStatus: transaction.status,
          shouldRetry: false,
        };
      }

      let result: StacksPollingJobResult;

      if (transaction.metadata.txId) {
        // Transaction has been broadcast, check confirmation status
        result = await this.checkTransactionConfirmation(transaction);
      } else {
        // Transaction hasn't been broadcast yet, increment retry
        result = await this.handleUnbroadcastTransaction(transaction);
      }

      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.logger.debug(
          `✓ Polling job completed for transaction ${transactionId} in ${duration}ms` +
          (result.newStatus ? ` - New status: ${result.newStatus}` : '') +
          (result.confirmations !== undefined ? ` - Confirmations: ${result.confirmations}` : '')
        );
      } else {
        this.logger.warn(
          `⚠ Polling job completed with issues for transaction ${transactionId} in ${duration}ms: ${result.error}`
        );
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to process polling job for transaction ${transactionId} in ${duration}ms:`,
        error
      );

      return {
        success: false,
        transactionId,
        error: error.message || 'Unknown error',
        shouldRetry: true,
      };
    }
  }

  // =====================================
  // STACKS NETWORK POLLING METHODS
  // =====================================

  /**
   * Check transaction confirmation status on Stacks network
   */
  private async checkTransactionConfirmation(
    transaction: ITransaction
  ): Promise<StacksPollingJobResult> {
    try {
      const txId = transaction.metadata.txId!;
      
      this.logger.debug(`Checking confirmation status for txId: ${txId}`);

      // Get transaction from Stacks API using direct fetch
      const response = await fetch(`${this.apiBaseUrl}/extended/v1/tx/${txId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PoolMind-Orchestrator/1.0.0',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.status === 404) {
        this.logger.debug(`Transaction ${txId} not yet visible in API`);
        
        // Increment retry count but don't consider it a failure
        await this.transactionsService.incrementTransactionRetry(transaction._id.toString());
        
        return {
          success: true,
          transactionId: transaction._id.toString(),
          shouldRetry: transaction.metadata.retryCount < this.MAX_RETRIES,
        };
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const stacksTransaction: StacksApiTransaction = await response.json();
      
      // Process the transaction status
      return await this.processStacksTransactionStatus(transaction, stacksTransaction);

    } catch (error) {
      this.logger.error(`Failed to check confirmation for transaction ${transaction._id}:`, error);
      
      // Increment retry count on API errors
      await this.transactionsService.incrementTransactionRetry(transaction._id.toString());
      
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
    stacksTransaction: StacksApiTransaction
  ): Promise<StacksPollingJobResult> {
    const txId = stacksTransaction.tx_id;
    const currentStatus = transaction.status;
    let newStatus: string;
    let confirmations = 0;

    // Determine new status based on Stacks transaction status
    switch (stacksTransaction.tx_status) {
      case TRANSACTION_STATUS.PENDING:
        newStatus = 'pending';
        break;
        
      case TRANSACTION_STATUS.SUCCESS:
        // Calculate confirmations if we have block height
        if (stacksTransaction.block_height) {
          const currentBlockHeight = await this.getCurrentBlockHeight();
          confirmations = Math.max(0, currentBlockHeight - stacksTransaction.block_height + 1);
          
          if (confirmations >= this.CONFIRMATION_THRESHOLD) {
            newStatus = 'confirmed';
          } else {
            newStatus = 'confirming';
          }
        } else {
          newStatus = 'confirming';
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
        newStatus = 'pending';
    }

    // Update transaction if status changed
    if (newStatus !== currentStatus || confirmations !== transaction.metadata.confirmations) {
      
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
        updateData
      );

      this.logger.log(
        `Transaction ${transaction._id} status updated: ${currentStatus} → ${newStatus}` +
        (confirmations > 0 ? ` (${confirmations} confirmations)` : '')
      );
    }

    // Determine if we should continue polling
    const shouldRetry = !['confirmed', 'failed'].includes(newStatus) && 
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
    transaction: ITransaction
  ): Promise<StacksPollingJobResult> {
    this.logger.debug(
      `Transaction ${transaction._id} has no txId yet (created ${transaction.createdAt})`
    );

    // Check if transaction is too old (older than 1 hour)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (transaction.createdAt < hourAgo) {
      this.logger.warn(
        `Transaction ${transaction._id} created over 1 hour ago but still no txId - marking as failed`
      );

      await this.transactionsService.updateTransactionStatus(
        transaction._id.toString(),
        {
          status: 'failed',
          errorMessage: 'Transaction was not broadcast within expected timeframe',
          errorCode: 'BROADCAST_TIMEOUT',
        }
      );

      return {
        success: true,
        transactionId: transaction._id.toString(),
        newStatus: 'failed',
        shouldRetry: false,
      };
    }

    // Increment retry count and continue polling
    await this.transactionsService.incrementTransactionRetry(transaction._id.toString());

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
   * Get current block height from Stacks network
   */
  private async getCurrentBlockHeight(): Promise<number> {
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
        throw new Error(`Failed to get network info: ${response.status} ${response.statusText}`);
      }

      const networkInfo: NetworkInfo = await response.json();
      return networkInfo.stacks_tip_height || 0;
    } catch (error) {
      this.logger.warn('Failed to get current block height:', error);
      return 0;
    }
  }

  // =====================================
  // PUBLIC API METHODS
  // =====================================

  /**
   * Manually trigger polling for a specific transaction
   */
  async triggerTransactionPolling(transactionId: string, priority = 10): Promise<void> {
    try {
      const transaction = await this.transactionsService.getTransactionById(transactionId);
      
      if (transaction.isComplete()) {
        this.logger.debug(`Transaction ${transactionId} is already complete`);
        return;
      }

      await this.queueTransactionForPolling(transaction, priority);
      
      this.logger.log(`Manually triggered polling for transaction ${transactionId}`);

    } catch (error) {
      this.logger.error(`Failed to trigger polling for transaction ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Get polling queue statistics
   */
  async getQueueStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.pollingQueue.getJobs(['waiting'], 0, -1),
        this.pollingQueue.getJobs(['active'], 0, -1),
        this.pollingQueue.getJobs(['completed'], 0, 10),
        this.pollingQueue.getJobs(['failed'], 0, 10),
        this.pollingQueue.getJobs(['delayed'], 0, -1),
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
  async getTransactionDetails(txId: string): Promise<StacksApiTransaction | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/extended/v1/tx/${txId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PoolMind-Orchestrator/1.0.0',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get transaction: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to get transaction details for ${txId}:`, error);
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
        throw new Error(`Failed to get network info: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Failed to get network info:', error);
      throw error;
    }
  }
}