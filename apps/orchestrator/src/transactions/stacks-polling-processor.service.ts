import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Queue from 'bull';
import { TransactionsService } from './transactions.service';
import {
  StacksPollingQueueService,
  StacksPollingJobData,
  StacksPollingJobResult,
} from './stacks-polling-queue.service';
import { AppConfig } from '../config/env.schema';
import { defaultUrlFromNetwork, StacksNetworkName } from '@stacks/network';

@Injectable()
export class StacksPollingProcessorService implements OnModuleInit {
  private readonly logger = new Logger(StacksPollingProcessorService.name);
  private apiBaseUrl: string;

  constructor(
    private readonly pollingQueueService: StacksPollingQueueService,
    private readonly transactionsService: TransactionsService,
    private readonly configService: ConfigService<AppConfig>,
  ) {
    this.logger.log('🔧 StacksPollingProcessorService constructor called');
  }

  async onModuleInit() {
    this.logger.log('🔄 Initializing Stacks polling processor...');

    // Initialize API base URL
    this.initializeApiBaseUrl();

    // Get the queue from the shared queue service
    const queue = this.pollingQueueService.getQueue();

    if (!queue) {
      this.logger.error(
        '❌ Stacks polling queue is not available. Make sure StacksPollingQueueService is properly initialized.',
      );
      return;
    }

    this.logger.log(`🔍 Queue instance retrieved: ${queue.name}`);

    // Wait for Redis to be ready before setting up processor
    const waitForRedis = async () => {
      return new Promise<void>((resolve) => {
        if (queue.client && queue.client.status === 'ready') {
          resolve();
          return;
        }

        const onReady = () => {
          queue.off('ready', onReady);
          resolve();
        };

        queue.on('ready', onReady);

        // Timeout after 10 seconds
        setTimeout(() => {
          queue.off('ready', onReady);
          resolve(); // Continue anyway
        }, 10000);
      });
    };

    await waitForRedis();
    this.logger.log('✅ Redis connection confirmed for processor');

    try {
      this.logger.log(
        '🔧 Setting up job processor for poll-transaction jobs...',
      );

      // Set up the job processor
      queue.process(
        'poll-transaction',
        3,
        async (job: Queue.Job<StacksPollingJobData>) => {
          this.logger.log(
            `🎯 Processor received job: ${job.id} for transaction ${job.data.transactionId}`,
          );
          return this.processPollingJob(job);
        },
      );

      this.logger.log('🔧 Job processor registration completed successfully');

      // Add queue event listeners for debugging
      queue.on('waiting', (jobId) => {
        this.logger.debug(`📋 Job ${jobId} is waiting`);
      });

      queue.on('active', (job) => {
        this.logger.log(`🚀 Job ${job.id} started processing`);
      });

      queue.on('completed', (job, result) => {
        this.logger.log(`✅ Job ${job.id} completed successfully`);
      });

      queue.on('failed', (job, err) => {
        this.logger.error(`❌ Job ${job.id} failed:`, err);
      });

      this.logger.log(
        '✅ Stacks polling processor initialized with concurrency: 3',
      );

      // Debug: Check current queue status
      setTimeout(async () => {
        try {
          const waiting = await queue.getJobs(['waiting'], 0, 10);
          const active = await queue.getJobs(['active'], 0, 10);
          const delayed = await queue.getJobs(['delayed'], 0, 10);
          const completed = await queue.getJobs(['completed'], 0, 5);
          const failed = await queue.getJobs(['failed'], 0, 5);

          this.logger.log(
            `🔍 Queue status - Waiting: ${waiting.length}, Active: ${active.length}, Delayed: ${delayed.length}, Completed: ${completed.length}, Failed: ${failed.length}`,
          );

          if (waiting.length > 0) {
            this.logger.log(
              `📋 Waiting jobs: ${waiting.map((j) => `${j.id}(${j.data?.transactionId})`).join(', ')}`,
            );

            // Try to trigger processing of the first waiting job
            this.logger.log(
              '🔧 Attempting to manually trigger job processing...',
            );
          }

          if (failed.length > 0) {
            this.logger.warn(
              `❌ Recent failed jobs: ${failed.map((j) => `${j.id}(${j.failedReason})`).join(', ')}`,
            );
          }
        } catch (err) {
          this.logger.error('Failed to get queue status:', err);
        }
      }, 2000); // Check after 2 seconds

      // Additional debug: Check processor count
      setTimeout(async () => {
        try {
          const processors = await queue.getJobCounts();
          this.logger.log(`🔧 Queue job counts:`, processors);
        } catch (err) {
          this.logger.error('Failed to get job counts:', err);
        }
      }, 3000);
    } catch (error) {
      this.logger.error('❌ Failed to initialize polling processor:', error);
    }
  }

  /**
   * Process a polling job
   */
  private async processPollingJob(
    job: Queue.Job<StacksPollingJobData>,
  ): Promise<StacksPollingJobResult> {
    const { transactionId, txId, retryCount } = job.data;
    const startTime = Date.now();

    try {
      this.logger.log(
        `🔄 Processing polling job for transaction ${transactionId}` +
          (txId ? ` with txId ${txId}` : ' (no txId yet)') +
          ` (attempt ${retryCount + 1})`,
      );

      // Get the current transaction
      const transaction =
        await this.transactionsService.getTransactionById(transactionId);

      if (!transaction) {
        this.logger.warn(`Transaction ${transactionId} not found`);
        return {
          success: false,
          transactionId,
          error: 'Transaction not found',
          shouldRetry: false,
        };
      }

      // If transaction is already complete, no need to poll
      if (transaction.isComplete()) {
        this.logger.log(
          `✅ Transaction ${transactionId} is already complete (${transaction.status})`,
        );
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
        this.logger.log(
          `✅ Polling job completed for transaction ${transactionId} in ${duration}ms` +
            (result.newStatus ? ` - New status: ${result.newStatus}` : '') +
            (result.confirmations !== undefined
              ? ` - Confirmations: ${result.confirmations}`
              : ''),
        );

        // If the job should be retried, requeue it with a delay
        if (result.shouldRetry) {
          // Check if we've exceeded max retries
          if (job.data.retryCount >= 50) {
            // MAX_RETRIES from StacksPollingService
            this.logger.warn(
              `⚠️ Transaction ${transactionId} exceeded max retries (${job.data.retryCount}), marking as failed`,
            );

            // Mark transaction as failed due to timeout
            await this.transactionsService.updateTransactionStatus(
              transactionId,
              {
                status: 'failed',
                errorMessage:
                  'Transaction polling timeout - exceeded maximum retry attempts',
                errorCode: 'POLLING_TIMEOUT',
              },
            );

            return {
              success: true,
              transactionId,
              newStatus: 'failed',
              shouldRetry: false,
            };
          }

          this.logger.debug(
            `🔄 Requeuing transaction ${transactionId} for retry in 30 seconds (attempt ${job.data.retryCount + 1}/50)`,
          );
          await this.requeueJob(job, 30000); // 30 second delay
        }
      } else {
        this.logger.warn(
          `⚠️ Polling job completed with issues for transaction ${transactionId} in ${duration}ms: ${result.error}`,
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `❌ Failed to process polling job for transaction ${transactionId} in ${duration}ms:`,
        error,
      );

      return {
        success: false,
        transactionId,
        error: error.message || 'Unknown error',
        shouldRetry: true,
      };
    }
  }

  /**
   * Check transaction confirmation status on Stacks network
   */
  private async checkTransactionConfirmation(
    transaction: any,
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
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          this.logger.debug(
            `Transaction ${txId} not found on Stacks network yet`,
          );
          return {
            success: true,
            transactionId: transaction._id.toString(),
            shouldRetry: true,
          };
        }

        throw new Error(
          `Stacks API error: ${response.status} ${response.statusText}`,
        );
      }

      const txData = await response.json();

      this.logger.debug(`Transaction ${txId} status: ${txData.tx_status}`);

      // Update transaction based on status
      switch (txData.tx_status) {
        case 'success':
          await this.transactionsService.updateTransactionStatus(
            transaction._id.toString(),
            {
              status: 'confirmed',
              txId,
              blockHeight: txData.block_height,
              confirmations: txData.block_height
                ? await this.getConfirmations(txData.block_height)
                : 0,
              metadata: {
                blockHash: txData.block_hash,
                burnBlockTime: txData.burn_block_time,
                txResult: txData.tx_result,
              },
            },
          );

          this.logger.log(
            `✅ Transaction ${transaction._id} confirmed successfully`,
          );
          return {
            success: true,
            transactionId: transaction._id.toString(),
            newStatus: 'confirmed',
            confirmations: txData.block_height
              ? await this.getConfirmations(txData.block_height)
              : 0,
            shouldRetry: false,
          };

        case 'pending':
          // Transaction is pending on Stacks network, update status to confirming
          await this.transactionsService.updateTransactionStatus(
            transaction._id.toString(),
            {
              status: 'confirming',
              txId,
              metadata: {
                lastCheckedAt: new Date(),
              },
            },
          );

          this.logger.log(
            `🔄 Transaction ${transaction._id} is pending on Stacks network, status updated to confirming`,
          );
          return {
            success: true,
            transactionId: transaction._id.toString(),
            newStatus: 'confirming',
            shouldRetry: true,
          };

        case 'abort_by_response':
        case 'abort_by_post_condition':
          await this.transactionsService.updateTransactionStatus(
            transaction._id.toString(),
            {
              status: 'failed',
              txId,
              errorMessage: `Transaction aborted: ${txData.tx_status}`,
              metadata: {
                txResult: txData.tx_result,
              },
            },
          );

          this.logger.warn(
            `❌ Transaction ${transaction._id} aborted: ${txData.tx_status}`,
          );
          return {
            success: true,
            transactionId: transaction._id.toString(),
            newStatus: 'failed',
            shouldRetry: false,
          };

        default:
          // Handle other statuses (dropped, etc.)
          await this.transactionsService.updateTransactionStatus(
            transaction._id.toString(),
            {
              status: 'failed',
              txId,
              errorMessage: `Transaction failed with status: ${txData.tx_status}`,
              metadata: {
                txResult: txData.tx_result,
              },
            },
          );

          this.logger.warn(
            `❌ Transaction ${transaction._id} failed: ${txData.tx_status}`,
          );
          return {
            success: true,
            transactionId: transaction._id.toString(),
            newStatus: 'failed',
            shouldRetry: false,
          };
      }
    } catch (error) {
      this.logger.error(`Error checking transaction confirmation:`, error);
      return {
        success: false,
        transactionId: transaction._id.toString(),
        error: error.message || 'Unknown error',
        shouldRetry: true,
      };
    }
  }

  /**
   * Handle transaction that hasn't been broadcast yet
   */
  private async handleUnbroadcastTransaction(
    transaction: any,
  ): Promise<StacksPollingJobResult> {
    this.logger.debug(
      `Transaction ${transaction._id} not yet broadcast, incrementing retry count`,
    );

    // Increment retry count
    await this.transactionsService.incrementTransactionRetry(
      transaction._id.toString(),
    );

    return {
      success: true,
      transactionId: transaction._id.toString(),
      shouldRetry: true,
    };
  }

  /**
   * Requeue a job with updated data and delay
   */
  private async requeueJob(
    job: Queue.Job<StacksPollingJobData>,
    delay: number,
  ): Promise<void> {
    try {
      const queue = this.pollingQueueService.getQueue();
      if (!queue) {
        this.logger.error('Cannot requeue job: polling queue not available');
        return;
      }

      // Increment retry count
      const updatedData: StacksPollingJobData = {
        ...job.data,
        retryCount: job.data.retryCount + 1,
        lastCheckedAt: new Date(),
      };

      // Add the job back to the queue with delay
      await this.pollingQueueService.addJob(updatedData, {
        delay,
        priority: job.opts.priority || 10,
        jobId: `poll-${updatedData.transactionId}`,
      });

      this.logger.debug(
        `Job requeued successfully for transaction ${updatedData.transactionId} (retry ${updatedData.retryCount})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to requeue job for transaction ${job.data.transactionId}:`,
        error,
      );
    }
  }

  /**
   * Get current confirmations for a transaction
   */
  private async getConfirmations(blockHeight: number): Promise<number> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/extended/v1/info`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return 0;
      }

      const info = await response.json();
      const currentHeight = info.burn_block_height || 0;

      return Math.max(0, currentHeight - blockHeight + 1);
    } catch (error) {
      this.logger.debug(`Error getting confirmations: ${error.message}`);
      return 0;
    }
  }

  /**
   * Initialize the API base URL based on network configuration
   */
  private initializeApiBaseUrl() {
    const network = this.configService.get<StacksNetworkName>('stacks.network');
    this.apiBaseUrl = defaultUrlFromNetwork(network);
    this.logger.log(
      `🔧 API base URL initialized for processor: ${this.apiBaseUrl}`,
    );
  }
}
