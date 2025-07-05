import Bull from "bull";
import { config } from "../config";
import winston from "winston";

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "queue-service" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: config.logging.files.combined,
    }),
  ],
});

export interface TransactionQueueData {
  txId: string;
  userId: string;
  userAddress: string;
  type: "deposit" | "withdrawal";
  stxAmount?: number;
  plmdAmount?: number;
  nav?: number;
  fee?: number;
  netAmount?: number;
}

export interface TransactionStatusUpdate {
  txId: string;
  status: "pending" | "success" | "failed" | "timeout";
  blockHeight?: number;
  errorMessage?: string;
  confirmedAt?: Date;
}

class QueueService {
  private transactionQueue: Bull.Queue<TransactionQueueData>;
  private cleanupQueue: Bull.Queue<{ txId: string }>;

  constructor() {
    // Initialize transaction polling queue
    this.transactionQueue = new Bull("transaction-polling", {
      redis: config.queue.redisUrl,
      defaultJobOptions: {
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 60, // Poll for 5 minutes (60 attempts * 5 seconds = 300 seconds)
        backoff: {
          type: "fixed",
          delay: 5000, // 5 seconds between attempts
        },
      },
    });

    // Initialize cleanup queue for timed-out transactions
    this.cleanupQueue = new Bull("transaction-cleanup", {
      redis: config.queue.redisUrl,
      defaultJobOptions: {
        removeOnComplete: 5,
        removeOnFail: 10,
        delay: 5 * 60 * 1000, // 5 minutes delay
      },
    });

    logger.info("Queue service initialized", {
      redisUrl: config.queue.redisUrl.replace(/\/\/.*@/, "//********@"),
    });
  }

  /**
   * Add a transaction to the polling queue
   */
  async addTransactionToQueue(data: TransactionQueueData): Promise<void> {
    try {
      // Add to polling queue
      await this.transactionQueue.add("poll-transaction", data, {
        jobId: data.txId, // Use txId as job ID to prevent duplicates
      });

      // Add to cleanup queue with 5-minute delay
      await this.cleanupQueue.add(
        "cleanup-transaction",
        { txId: data.txId },
        {
          jobId: `cleanup-${data.txId}`,
          delay: 5 * 60 * 1000, // 5 minutes
        },
      );

      logger.info("Transaction added to queue", {
        txId: data.txId,
        userId: data.userId,
        type: data.type,
      });
    } catch (error) {
      logger.error("Failed to add transaction to queue", {
        txId: data.txId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Remove a transaction from the queue (when it's confirmed)
   */
  async removeTransactionFromQueue(txId: string): Promise<void> {
    try {
      // Remove from polling queue
      const pollingJob = await this.transactionQueue.getJob(txId);
      if (pollingJob) {
        await pollingJob.remove();
        logger.debug("Polling job removed from queue", { txId });
      } else {
        logger.debug("Polling job not found (may already be removed)", {
          txId,
        });
      }

      // Remove from cleanup queue
      const cleanupJob = await this.cleanupQueue.getJob(`cleanup-${txId}`);
      if (cleanupJob) {
        await cleanupJob.remove();
        logger.debug("Cleanup job removed from queue", { txId });
      } else {
        logger.debug("Cleanup job not found (may already be removed)", {
          txId,
        });
      }

      logger.info("Transaction removed from queue", { txId });
    } catch (error) {
      logger.warn(
        "Failed to remove transaction from queue (may already be processed)",
        {
          txId,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      // Don't throw error as this is not critical - jobs may already be removed
    }
  }

  /**
   * Get the transaction polling queue instance
   */
  getTransactionQueue(): Bull.Queue<TransactionQueueData> {
    return this.transactionQueue;
  }

  /**
   * Get the cleanup queue instance
   */
  getCleanupQueue(): Bull.Queue<{ txId: string }> {
    return this.cleanupQueue;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    polling: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
    cleanup: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
  }> {
    try {
      const [pollingCounts, cleanupCounts] = await Promise.all([
        this.transactionQueue.getJobCounts(),
        this.cleanupQueue.getJobCounts(),
      ]);

      return {
        polling: pollingCounts,
        cleanup: cleanupCounts,
      };
    } catch (error) {
      logger.error("Failed to get queue stats", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Close queue connections
   */
  async close(): Promise<void> {
    try {
      await Promise.all([
        this.transactionQueue.close(),
        this.cleanupQueue.close(),
      ]);
      logger.info("Queue connections closed");
    } catch (error) {
      logger.error("Failed to close queue connections", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

// Export singleton instance
export const queueService = new QueueService();
export default queueService;
