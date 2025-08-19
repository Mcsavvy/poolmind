import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Queue from 'bull';
import { NotificationsService, type NotificationResult } from './notifications.service';
import { 
  NotificationQueueService, 
  NotificationJobData, 
  NotificationJobResult 
} from './notification-queue.service';

@Injectable()
export class NotificationProcessorService implements OnModuleInit {
  private readonly logger = new Logger(NotificationProcessorService.name);

  constructor(
    private readonly notificationQueueService: NotificationQueueService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    const queue = this.notificationQueueService.getQueue();
    
    // Set up the job processor
    queue.process('*', 5, async (job: Queue.Job<NotificationJobData>) => {
      return this.processNotificationJob(job);
    });

    this.logger.log('Notification processor initialized with concurrency: 5');
  }

  /**
   * Process a notification job based on its type
   */
  private async processNotificationJob(
    job: Queue.Job<NotificationJobData>
  ): Promise<NotificationJobResult> {
    const { data } = job;
    const startTime = Date.now();

    const attempt = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts || 3;

    try {
      const title = data.type === 'in-app' 
        ? data.notificationData.title 
        : data.message?.title || 'Unknown';
      
      this.logger.log(
        `Processing ${data.type} notification job ${job.id} (attempt ${attempt}/${maxAttempts}): ${title}`
      );

      let result: NotificationResult;
      let targetInfo = '';

      switch (data.type) {
        case 'user':
          targetInfo = `user ${data.userId}`;
          result = await this.notificationsService.sendToUser(
            data.userId,
            data.message
          );
          break;

        case 'telegram-user':
          targetInfo = `telegram user ${data.telegramId}`;
          result = await this.notificationsService.sendToTelegramUser(
            data.telegramId,
            data.message
          );
          break;

        case 'role':
          targetInfo = `role '${data.role}'`;
          result = await this.notificationsService.sendToRole(
            data.role,
            data.message
          );
          break;

        case 'broadcast':
          targetInfo = 'all users';
          result = await this.notificationsService.sendToAllUsers(
            data.message
          );
          break;

        case 'channel':
          targetInfo = 'channel';
          result = await this.notificationsService.sendToChannel(
            data.message
          );
          break;

        case 'in-app':
          targetInfo = `in-app ${data.notificationData.targetType}`;
          const inAppResult = await this.notificationsService.createInAppNotification(data.notificationData);
          result = {
            success: true,
            sentCount: inAppResult.stats.totalRecipients,
            failedCount: 0,
            errors: [],
          };
          break;

        default:
          throw new Error(`Unknown notification job type: ${(data as any).type}`);
      }

      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.logger.log(
          `✓ Completed ${data.type} notification job ${job.id} to ${targetInfo} in ${duration}ms. ` +
          `Sent: ${result.sentCount}, Failed: ${result.failedCount}`
        );
      } else {
        this.logger.warn(
          `⚠ Completed ${data.type} notification job ${job.id} to ${targetInfo} with errors in ${duration}ms. ` +
          `Sent: ${result.sentCount}, Failed: ${result.failedCount}`
        );
      }

      return {
        success: result.success,
        result,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (attempt < maxAttempts) {
        this.logger.warn(
          `⚠ Failed ${data.type} notification job ${job.id} (attempt ${attempt}/${maxAttempts}) after ${duration}ms. ` +
          `Will retry: ${error.message}`
        );
      } else {
        this.logger.error(
          `✗ Failed ${data.type} notification job ${job.id} permanently after ${attempt} attempts and ${duration}ms: ${error.message}`
        );
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }
}
