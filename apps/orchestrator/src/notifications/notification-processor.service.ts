import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Queue from 'bull';
import { NotificationsService } from './notifications.service';
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

    try {
      this.logger.debug(`Processing ${data.type} notification job ${job.id}: ${data.message.title}`);

      let result;

      switch (data.type) {
        case 'user':
          result = await this.notificationsService.sendToUser(
            data.userId,
            data.message
          );
          break;

        case 'telegram-user':
          result = await this.notificationsService.sendToTelegramUser(
            data.telegramId,
            data.message
          );
          break;

        case 'role':
          result = await this.notificationsService.sendToRole(
            data.role,
            data.message
          );
          break;

        case 'broadcast':
          result = await this.notificationsService.sendToAllUsers(
            data.message
          );
          break;

        case 'channel':
          result = await this.notificationsService.sendToChannel(
            data.message
          );
          break;

        default:
          throw new Error(`Unknown notification job type: ${(data as any).type}`);
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Completed ${data.type} notification job ${job.id} in ${duration}ms. ` +
        `Sent: ${result.sentCount}, Failed: ${result.failedCount}`
      );

      return {
        success: result.success,
        result,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed ${data.type} notification job ${job.id} after ${duration}ms:`,
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }
}
