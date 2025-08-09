import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Queue from 'bull';
import { AppConfig } from '../config/env.schema';
import { NotificationMessage, NotificationResult } from './notifications.service';

// Job data interfaces
export interface UserNotificationJob {
  type: 'user';
  userId: string;
  message: NotificationMessage;
}

export interface TelegramUserNotificationJob {
  type: 'telegram-user';
  telegramId: number;
  message: NotificationMessage;
}

export interface RoleNotificationJob {
  type: 'role';
  role: 'user' | 'admin' | 'moderator';
  message: NotificationMessage;
}

export interface BroadcastNotificationJob {
  type: 'broadcast';
  message: NotificationMessage;
}

export interface ChannelNotificationJob {
  type: 'channel';
  message: NotificationMessage;
}

export type NotificationJobData = 
  | UserNotificationJob
  | TelegramUserNotificationJob
  | RoleNotificationJob
  | BroadcastNotificationJob
  | ChannelNotificationJob;

export interface NotificationJobResult {
  success: boolean;
  result?: NotificationResult;
  error?: string;
}

@Injectable()
export class NotificationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private notificationQueue: Queue.Queue<NotificationJobData>;

  constructor(
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url');
    
    // Initialize the notification queue
    this.notificationQueue = new Queue('notification-queue', redisUrl!, {
      defaultJobOptions: {
        removeOnComplete: 50, // Keep last 50 completed jobs
        removeOnFail: 20,     // Keep last 20 failed jobs
        attempts: 3,          // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000,        // Start with 2s delay, exponentially increase
        },
      },
      settings: {
        stalledInterval: 30 * 1000,    // Check for stalled jobs every 30 seconds
        maxStalledCount: 1,             // Maximum number of times a job can be stalled
      },
    });

    // Log queue events
    this.notificationQueue.on('ready', () => {
      this.logger.log('Notification queue is ready');
    });

    this.notificationQueue.on('error', (error) => {
      this.logger.error('Notification queue error:', error);
    });

    this.notificationQueue.on('waiting', (jobId) => {
      this.logger.debug(`Job ${jobId} is waiting`);
    });

    this.notificationQueue.on('active', (job) => {
      this.logger.debug(`Job ${job.id} started processing`);
    });

    this.notificationQueue.on('completed', (job, result: NotificationJobResult) => {
      if (result.success) {
        this.logger.log(`Job ${job.id} completed successfully. Sent: ${result.result?.sentCount}, Failed: ${result.result?.failedCount}`);
      } else {
        this.logger.warn(`Job ${job.id} completed with issues: ${result.error}`);
      }
    });

    this.notificationQueue.on('failed', (job, err) => {
      this.logger.error(`Job ${job.id} failed:`, err);
    });

    this.notificationQueue.on('stalled', (job) => {
      this.logger.warn(`Job ${job.id} stalled`);
    });
  }

  async onModuleDestroy() {
    if (this.notificationQueue) {
      await this.notificationQueue.close();
      this.logger.log('Notification queue closed');
    }
  }

  /**
   * Queue notification to a specific user
   */
  async queueUserNotification(
    userId: string,
    message: NotificationMessage,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ): Promise<Queue.Job<NotificationJobData>> {
    try {
      const jobData: UserNotificationJob = {
        type: 'user',
        userId,
        message,
      };

      const job = await this.notificationQueue.add(jobData, {
        priority: options?.priority,
        delay: options?.delay,
        attempts: options?.attempts,
      });

      this.logger.debug(
        `Queued user notification job ${job.id} for user ${userId}: ${message.title} ` +
        `(priority: ${options?.priority || 'default'}, delay: ${options?.delay || 0}ms)`
      );
      return job;
    } catch (error) {
      this.logger.error(`Failed to queue user notification for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Queue notification to a specific Telegram user
   */
  async queueTelegramUserNotification(
    telegramId: number,
    message: NotificationMessage,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ): Promise<Queue.Job<NotificationJobData>> {
    const jobData: TelegramUserNotificationJob = {
      type: 'telegram-user',
      telegramId,
      message,
    };

    const job = await this.notificationQueue.add(jobData, {
      priority: options?.priority,
      delay: options?.delay,
      attempts: options?.attempts,
    });

    this.logger.debug(`Queued Telegram user notification job ${job.id} for user ${telegramId}: ${message.title}`);
    return job;
  }

  /**
   * Queue notification to users with a specific role
   */
  async queueRoleNotification(
    role: 'user' | 'admin' | 'moderator',
    message: NotificationMessage,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ): Promise<Queue.Job<NotificationJobData>> {
    const jobData: RoleNotificationJob = {
      type: 'role',
      role,
      message,
    };

    const job = await this.notificationQueue.add(jobData, {
      priority: options?.priority || 5, // Role notifications have medium priority
      delay: options?.delay,
      attempts: options?.attempts,
    });

    this.logger.debug(`Queued role notification job ${job.id} for role ${role}: ${message.title}`);
    return job;
  }

  /**
   * Queue broadcast notification to all users
   */
  async queueBroadcastNotification(
    message: NotificationMessage,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ): Promise<Queue.Job<NotificationJobData>> {
    const jobData: BroadcastNotificationJob = {
      type: 'broadcast',
      message,
    };

    const job = await this.notificationQueue.add(jobData, {
      priority: options?.priority || 10, // Broadcast notifications have low priority
      delay: options?.delay,
      attempts: options?.attempts,
    });

    this.logger.debug(`Queued broadcast notification job ${job.id}: ${message.title}`);
    return job;
  }

  /**
   * Queue notification to channel
   */
  async queueChannelNotification(
    message: NotificationMessage,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ): Promise<Queue.Job<NotificationJobData>> {
    const jobData: ChannelNotificationJob = {
      type: 'channel',
      message,
    };

    const job = await this.notificationQueue.add(jobData, {
      priority: options?.priority || 1, // Channel notifications have high priority
      delay: options?.delay,
      attempts: options?.attempts,
    });

    this.logger.debug(`Queued channel notification job ${job.id}: ${message.title}`);
    return job;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const waiting = await this.notificationQueue.getWaiting();
      const active = await this.notificationQueue.getActive();
      const completed = await this.notificationQueue.getCompleted();
      const failed = await this.notificationQueue.getFailed();
      const delayed = await this.notificationQueue.getDelayed();

      const stats = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length,
      };

      this.logger.debug(`Queue stats: ${JSON.stringify(stats)}`);
      return stats;
    } catch (error) {
      this.logger.error('Failed to retrieve queue statistics:', error);
      throw error;
    }
  }

  /**
   * Clear all jobs from the queue
   */
  async clearQueue() {
    try {
      const stats = await this.getQueueStats();
      await this.notificationQueue.empty();
      this.logger.warn(`Notification queue cleared - Removed ${stats.waiting} waiting and ${stats.delayed} delayed jobs`);
    } catch (error) {
      this.logger.error('Failed to clear notification queue:', error);
      throw error;
    }
  }

  /**
   * Pause the queue
   */
  async pauseQueue() {
    await this.notificationQueue.pause();
    this.logger.log('Notification queue paused');
  }

  /**
   * Resume the queue
   */
  async resumeQueue() {
    await this.notificationQueue.resume();
    this.logger.log('Notification queue resumed');
  }

  /**
   * Get the Bull queue instance for advanced operations
   */
  getQueue(): Queue.Queue<NotificationJobData> {
    return this.notificationQueue;
  }
}
