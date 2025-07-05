import Bull from "bull";
import winston from "winston";
import { config } from "../config";
import { queueService, TransactionQueueData } from "./queueService";
import { transactionPollingService } from "./transactionPollingService";

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "queue-processor" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: config.logging.files.combined,
    }),
  ],
});

class QueueProcessor {
  private isProcessing = false;

  constructor() {
    this.setupQueueProcessors();
  }

  private setupQueueProcessors(): void {
    // Process transaction polling jobs
    queueService
      .getTransactionQueue()
      .process(
        "poll-transaction",
        config.queue.concurrency,
        this.processTransactionPolling.bind(this),
      );

    // Process cleanup jobs
    queueService.getCleanupQueue().process(
      "cleanup-transaction",
      1, // Process cleanup jobs one at a time
      this.processTransactionCleanup.bind(this),
    );

    // Set up event listeners
    this.setupEventListeners();

    logger.info("Queue processors initialized", {
      concurrency: config.queue.concurrency,
    });
  }

  private setupEventListeners(): void {
    const transactionQueue = queueService.getTransactionQueue();
    const cleanupQueue = queueService.getCleanupQueue();

    // Transaction queue events
    transactionQueue.on("completed", (job) => {
      logger.info("Transaction polling job completed", {
        jobId: job.id,
        txId: job.data.txId,
        attempts: job.attemptsMade,
      });
    });

    transactionQueue.on("failed", (job, err) => {
      logger.error("Transaction polling job failed", {
        jobId: job.id,
        txId: job.data.txId,
        attempts: job.attemptsMade,
        error: err.message,
      });
    });

    transactionQueue.on("stalled", (job) => {
      logger.warn("Transaction polling job stalled", {
        jobId: job.id,
        txId: job.data.txId,
      });
    });

    // Cleanup queue events
    cleanupQueue.on("completed", (job) => {
      logger.info("Transaction cleanup job completed", {
        jobId: job.id,
        txId: job.data.txId,
      });
    });

    cleanupQueue.on("failed", (job, err) => {
      logger.error("Transaction cleanup job failed", {
        jobId: job.id,
        txId: job.data.txId,
        error: err.message,
      });
    });
  }

  /**
   * Process transaction polling job
   */
  private async processTransactionPolling(
    job: Bull.Job<TransactionQueueData>,
  ): Promise<void> {
    const { txId, userId, type } = job.data;

    try {
      logger.debug("Processing transaction polling job", {
        jobId: job.id,
        txId,
        userId,
        type,
        attempt: job.attemptsMade + 1,
      });

      // Poll the transaction
      const statusUpdate =
        await transactionPollingService.pollTransaction(txId);

      // Update the database
      await transactionPollingService.updateTransactionStatus(statusUpdate);

      if (
        statusUpdate.status === "success" ||
        statusUpdate.status === "failed"
      ) {
        // Transaction is final, remove from queue
        // Note: We don't need to remove the polling job here as Bull.js will handle it
        // We only need to remove the cleanup job to prevent timeout processing
        try {
          const cleanupQueue = queueService.getCleanupQueue();
          const cleanupJob = await cleanupQueue.getJob(`cleanup-${txId}`);
          if (cleanupJob) {
            await cleanupJob.remove();
            logger.debug("Cleanup job removed for finalized transaction", {
              txId,
            });
          }
        } catch (cleanupError) {
          logger.warn(
            "Failed to remove cleanup job (may already be processed)",
            {
              txId,
              error:
                cleanupError instanceof Error
                  ? cleanupError.message
                  : "Unknown error",
            },
          );
        }

        logger.info("Transaction finalized", {
          txId,
          status: statusUpdate.status,
          blockHeight: statusUpdate.blockHeight,
        });

        // Job completed successfully, don't throw error
        return;
      } else {
        // Still pending, job will be retried automatically
        logger.debug("Transaction still pending", {
          txId,
          attempt: job.attemptsMade + 1,
        });

        // Throw error to trigger retry
        throw new Error("Transaction still pending");
      }
    } catch (error) {
      logger.debug("Transaction polling attempt failed", {
        txId,
        attempt: job.attemptsMade + 1,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Re-throw to trigger Bull's retry mechanism
      throw error;
    }
  }

  /**
   * Process transaction cleanup job (for timed-out transactions)
   */
  private async processTransactionCleanup(
    job: Bull.Job<{ txId: string }>,
  ): Promise<void> {
    const { txId } = job.data;

    try {
      logger.debug("Processing transaction cleanup job", {
        jobId: job.id,
        txId,
      });

      // Check if transaction is still pending
      const transaction = await transactionPollingService.getTransaction(txId);

      if (!transaction) {
        logger.warn("Transaction not found for cleanup", { txId });
        return;
      }

      if (transaction.status === "pending") {
        // Mark as timed out
        await transactionPollingService.markTransactionAsTimeout(txId);

        // Remove from polling queue (cleanup job will be removed automatically by Bull.js)
        try {
          const transactionQueue = queueService.getTransactionQueue();
          const pollingJob = await transactionQueue.getJob(txId);
          if (pollingJob) {
            await pollingJob.remove();
            logger.debug("Polling job removed during cleanup", { txId });
          }
        } catch (removalError) {
          logger.debug("Polling job already removed or completed", {
            txId,
            error:
              removalError instanceof Error
                ? removalError.message
                : "Unknown error",
          });
        }

        logger.info("Transaction marked as timed out", {
          txId,
          retryCount: transaction.retryCount,
        });
      } else {
        logger.debug("Transaction already finalized, no cleanup needed", {
          txId,
          status: transaction.status,
        });
      }
    } catch (error) {
      logger.error("Transaction cleanup job failed", {
        txId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Start processing queues
   */
  start(): void {
    if (this.isProcessing) {
      logger.warn("Queue processor already started");
      return;
    }

    this.isProcessing = true;
    logger.info("Queue processor started");
  }

  /**
   * Stop processing queues
   */
  async stop(): Promise<void> {
    if (!this.isProcessing) {
      logger.warn("Queue processor not running");
      return;
    }

    try {
      await queueService.close();
      this.isProcessing = false;
      logger.info("Queue processor stopped");
    } catch (error) {
      logger.error("Failed to stop queue processor", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get processing status
   */
  isRunning(): boolean {
    return this.isProcessing;
  }
}

export const queueProcessor = new QueueProcessor();
export default queueProcessor;
