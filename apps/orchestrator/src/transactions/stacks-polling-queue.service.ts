import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Queue from 'bull';
import { AppConfig } from '../config/env.schema';

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
export class StacksPollingQueueService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(StacksPollingQueueService.name);
  private pollingQueue: Queue.Queue<StacksPollingJobData>;

  constructor(private readonly configService: ConfigService<AppConfig>) {}

  async onModuleInit() {
    // Initialize queue without waiting for Redis connection
    this.initializeQueueAsync();
  }

  async onModuleDestroy() {
    if (this.pollingQueue) {
      await this.pollingQueue.close();
    }
  }

  /**
   * Initialize the polling queue asynchronously
   */
  private initializeQueueAsync() {
    try {
      const redisUrl = this.configService.get<string>('redis.url');
      // mask the password and host
      const maskedRedisUrl = redisUrl?.replace(
        /^(redis:\/\/)([^:]+):([^:]+)@([^:]+):(\d+)$/,
        '$1****:****@****:****',
      );
      this.logger.log(
        `🔍 Initializing Stacks polling queue with Redis URL: ${maskedRedisUrl}`,
      );

      this.pollingQueue = new Queue('stacks-polling-queue', redisUrl!, {
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50, // Keep last 50 failed jobs
          attempts: 3, // Retry failed jobs up to 3 times
          backoff: {
            type: 'exponential',
            delay: 5000, // Start with 5s delay
          },
        },
        settings: {
          stalledInterval: 60 * 1000, // Check for stalled jobs every 60 seconds
          maxStalledCount: 1, // Maximum number of times a job can be stalled
        },
      });

      // Set up event handlers immediately
      this.setupQueueEventHandlers();

      this.logger.log(
        '✓ Stacks polling queue initialized (Redis connection will be established asynchronously)',
      );

      // Handle Redis connection asynchronously
      this.pollingQueue.on('ready', () => {
        this.logger.log('✅ Redis connection established');
      });

      this.pollingQueue.on('error', (error) => {
        this.logger.error('❌ Redis connection error:', error);
      });
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
      this.logger.debug(
        `Polling job ${job.id} started processing transaction ${job.data.transactionId}`,
      );
    });

    this.pollingQueue.on('completed', (job, result: StacksPollingJobResult) => {
      if (result.success) {
        this.logger.log(
          `Polling job ${job.id} completed successfully for transaction ${result.transactionId}` +
            (result.newStatus ? ` - Status: ${result.newStatus}` : '') +
            (result.confirmations !== undefined
              ? ` - Confirmations: ${result.confirmations}`
              : ''),
        );
      } else {
        this.logger.warn(
          `Polling job ${job.id} completed with issues for transaction ${result.transactionId}: ${result.error}`,
        );
      }
    });

    this.pollingQueue.on('failed', (job, err) => {
      this.logger.error(
        `Polling job ${job.id} failed for transaction ${job.data.transactionId}:`,
        err,
      );
    });

    this.pollingQueue.on('stalled', (job) => {
      this.logger.warn(
        `Polling job ${job.id} stalled for transaction ${job.data.transactionId}`,
      );
    });
  }

  /**
   * Get the polling queue instance
   */
  getQueue(): Queue.Queue<StacksPollingJobData> {
    return this.pollingQueue;
  }

  /**
   * Add a job to the queue
   */
  async addJob(
    data: StacksPollingJobData,
    options?: any,
  ): Promise<Queue.Job<StacksPollingJobData>> {
    this.logger.log(
      `🎯 Adding job to queue: poll-transaction for transaction ${data.transactionId}, jobId: ${options?.jobId}`,
    );

    const job = await this.pollingQueue.add('poll-transaction', data, options);

    this.logger.log(
      `✅ Job added successfully: ${job.id} for transaction ${data.transactionId}`,
    );

    return job;
  }
}
