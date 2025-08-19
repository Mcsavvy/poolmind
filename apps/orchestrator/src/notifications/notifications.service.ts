import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Telegraf } from 'telegraf';
import { AppConfig } from '../config/env.schema';
import { IUser, type IUserModel } from '../lib/models/user';
import { NotificationQueueService } from './notification-queue.service';

export interface NotificationOptions {
  disablePreview?: boolean;
  silent?: boolean;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification?: boolean;
  includeIcon?: boolean; // Whether to include emoji icon (default: true)
}

export enum NotificationType {
  SECURITY = 'security',
  UPDATE = 'update',
  MARKETING = 'marketing',
  SYSTEM = 'system',
  TRADING = 'trading',
  ARBITRAGE = 'arbitrage',
  TRANSACTION = 'transaction',
}

export interface NotificationMessage {
  type: NotificationType;
  title: string;
  body: string;
  options?: NotificationOptions;
}

export interface NotificationResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: Array<{ userId?: string; telegramId?: number; error: string }>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private bot: Telegraf;
  private readonly channelId: string;

  constructor(
    private readonly configService: ConfigService<AppConfig>,
    @InjectModel('User') private readonly userModel: IUserModel,
    private readonly notificationQueueService: NotificationQueueService,
  ) {
    const botToken = this.configService.get<string>('telegram.botToken');
    if (!botToken) {
      this.logger.error('Telegram bot token not configured');
      throw new Error('Telegram bot token not configured');
    }

    this.bot = new Telegraf(botToken);
    this.channelId = this.configService.get<string>('telegram.channelId') || '';
    
    this.logger.log('NotificationsService initialized successfully');
    this.logger.debug(`Channel ID configured: ${this.channelId ? 'Yes' : 'No'}`);
  }

  /**
   * Send notification to a specific user by user ID
   */
  async sendToUser(
    userId: string,
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    this.logger.debug(`Sending notification to user ${userId}: ${message.title}`);
    
    try {
      const user = await this.userModel.findById(userId);
      if (!user || !user.isActive) {
        this.logger.warn(`Failed to send notification - User not found or inactive: ${userId}`);
        return {
          success: false,
          sentCount: 0,
          failedCount: 1,
          errors: [{ userId, error: 'User not found or inactive' }],
        };
      }

      this.logger.debug(`User found for notification: ${userId}, telegram linked: ${!!user.telegramAuth?.telegramId}`);
      return this.sendToUsers([user], message);
    } catch (error) {
      this.logger.error(`Error in sendToUser for ${userId}:`, error);
      return {
        success: false,
        sentCount: 0,
        failedCount: 1,
        errors: [{ userId, error: error.message }],
      };
    }
  }

  /**
   * Send notification to a specific user by Telegram ID
   */
  async sendToTelegramUser(
    telegramId: number,
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    this.logger.debug(`Sending notification to Telegram user ${telegramId}: ${message.title}`);
    
    
    try {
      const user = await this.userModel.findByTelegramId(telegramId);
      if (!user || !user.isActive) {
        // maybe user's telegram account is unlinked
        const formattedMessage = this.formatMessage(message);
        const telegramOptions = this.buildTelegramOptions(message.options);
        this.logger.debug(`Formatted message preview: ${formattedMessage.substring(0, 100)}...`);
        this.bot.telegram.sendMessage(
          telegramId,
          formattedMessage,
          telegramOptions,
        );
        return {
          success: true,
          sentCount: 1,
          failedCount: 0,
          errors: [],
        };
      }
      this.logger.debug(`Telegram user found for notification: ${telegramId} -> userId: ${user._id}`);
      return this.sendToUsers([user], message);
    } catch (error) {
      this.logger.error(`Error in sendToTelegramUser for ${telegramId}:`, error);
      return {
        success: false,
        sentCount: 0,
        failedCount: 1,
        errors: [{ telegramId, error: error.message }],
      };
    }
  }

  /**
   * Send notification to users with a specific role
   */
  async sendToRole(
    role: 'user' | 'admin' | 'moderator',
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    this.logger.debug(`Sending notification to role '${role}': ${message.title}`);
    
    try {
      const users = await this.userModel.findByRole(role);
      this.logger.log(`Found ${users.length} users with role '${role}' for notification: ${message.title}`);
      
      if (users.length === 0) {
        this.logger.warn(`No users found with role '${role}' for notification: ${message.title}`);
      }
      
      return this.sendToUsers(users, message);
    } catch (error) {
      this.logger.error(`Error in sendToRole for role '${role}':`, error);
      return {
        success: false,
        sentCount: 0,
        failedCount: 1,
        errors: [{ error: `Failed to query users with role '${role}': ${error.message}` }],
      };
    }
  }

  /**
   * Send notification to all users (broadcast)
   */
  async sendToAllUsers(
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    this.logger.debug(`Broadcasting notification to all users: ${message.title}`);
    
    try {
      const users = await this.userModel.findWithTelegramNotifications();
      this.logger.log(`Found ${users.length} users eligible for broadcast notification: ${message.title}`);
      
      if (users.length === 0) {
        this.logger.warn(`No users eligible for broadcast notification: ${message.title}`);
      }
      
      return this.sendToUsers(users, message);
    } catch (error) {
      this.logger.error('Error in sendToAllUsers:', error);
      return {
        success: false,
        sentCount: 0,
        failedCount: 1,
        errors: [{ error: `Failed to query all users: ${error.message}` }],
      };
    }
  }

  /**
   * Send notification to the configured channel
   */
  async sendToChannel(
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    this.logger.debug(`Sending notification to channel: ${message.title}`);
    
    if (!this.channelId) {
      this.logger.error('Cannot send channel notification - Channel ID not configured');
      return {
        success: false,
        sentCount: 0,
        failedCount: 1,
        errors: [{ error: 'Channel ID not configured' }],
      };
    }

    try {
      const formattedMessage = this.formatMessage(message);
      this.logger.debug(`Sending to channel ${this.channelId}: ${formattedMessage.substring(0, 100)}...`);
      
      await this.bot.telegram.sendMessage(
        this.channelId,
        formattedMessage,
        this.buildTelegramOptions(message.options),
      );

      this.logger.log(`Successfully sent notification to channel ${this.channelId}: ${message.title}`);
      return {
        success: true,
        sentCount: 1,
        failedCount: 0,
        errors: [],
      };
    } catch (error) {
      this.logger.error(`Failed to send notification to channel ${this.channelId}:`, error);
      return {
        success: false,
        sentCount: 0,
        failedCount: 1,
        errors: [{ error: `Channel notification failed: ${error.message}` }],
      };
    }
  }

  /**
   * Send notification to multiple users
   */
  private async sendToUsers(
    users: IUser[],
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    this.logger.debug(`Processing notification for ${users.length} users: ${message.title}`);
    
    const eligibleUsers = this.filterEligibleUsers(users, message.type);
    const results: NotificationResult = {
      success: true,
      sentCount: 0,
      failedCount: 0,
      errors: [],
    };

    this.logger.log(`${eligibleUsers.length} of ${users.length} users eligible for notification: ${message.title}`);

    if (eligibleUsers.length === 0) {
      this.logger.warn(`No eligible users found for notification: ${message.title}`);
      return results;
    }

    const formattedMessage = this.formatMessage(message);
    const telegramOptions = this.buildTelegramOptions(message.options);

    this.logger.debug(`Formatted message preview: ${formattedMessage.substring(0, 100)}...`);

    // Send notifications in batches to avoid rate limiting
    const batchSize = 30; // Telegram rate limit is ~30 messages per second
    const totalBatches = Math.ceil(eligibleUsers.length / batchSize);
    
    this.logger.log(`Sending notifications in ${totalBatches} batches of ${batchSize} messages each`);

    for (let i = 0; i < eligibleUsers.length; i += batchSize) {
      const batch = eligibleUsers.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      this.logger.debug(`Processing batch ${batchNumber}/${totalBatches} with ${batch.length} users`);
      
      const batchPromises = batch.map(async (user) => {
        try {
          if (!user.telegramAuth?.telegramId) {
            throw new Error('User has no Telegram ID');
          }

          await this.bot.telegram.sendMessage(
            user.telegramAuth.telegramId,
            formattedMessage,
            telegramOptions,
          );

          results.sentCount++;
          this.logger.debug(`✓ Notification sent to user ${user._id} (Telegram: ${user.telegramAuth.telegramId})`);
        } catch (error) {
          results.failedCount++;
          results.errors.push({
            userId: user._id.toString(),
            telegramId: user.telegramAuth?.telegramId,
            error: error.message,
          });
          this.logger.error(`✗ Failed to send notification to user ${user._id} (Telegram: ${user.telegramAuth?.telegramId}): ${error.message}`);
        }
      });

      await Promise.allSettled(batchPromises);

      // Add delay between batches to respect rate limits
      if (i + batchSize < eligibleUsers.length) {
        this.logger.debug(`Waiting 1 second before next batch to respect rate limits`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update success status based on results
    results.success = results.failedCount === 0;

    if (results.success) {
      this.logger.log(`✓ Notification batch completed successfully - Title: ${message.title}, Sent: ${results.sentCount}`);
    } else {
      this.logger.warn(`⚠ Notification batch completed with errors - Title: ${message.title}, Sent: ${results.sentCount}, Failed: ${results.failedCount}`);
      
      // Log first few errors for debugging
      const errorSample = results.errors.slice(0, 3);
      errorSample.forEach(error => {
        this.logger.error(`Sample error: User ${error.userId || 'unknown'} - ${error.error}`);
      });
      
      if (results.errors.length > 3) {
        this.logger.error(`... and ${results.errors.length - 3} more errors`);
      }
    }

    return results;
  }

  /**
   * Filter users based on their notification preferences and Telegram availability
   */
  private filterEligibleUsers(
    users: IUser[],
    notificationType: NotificationType,
  ): IUser[] {
    const startTime = Date.now();
    let activeUsers = 0;
    let telegramLinked = 0;
    let notificationsEnabled = 0;
    
    const eligible = users.filter((user) => {
      // User must be active
      if (!user.isActive) {
        this.logger.debug(`User ${user._id} filtered out - inactive`);
        return false;
      }
      activeUsers++;

      // User must have Telegram linked
      if (!user.telegramAuth?.telegramId) {
        this.logger.debug(`User ${user._id} filtered out - no Telegram linked`);
        return false;
      }
      telegramLinked++;

      // User must have Telegram notifications enabled
      if (!user.notificationPreferences?.telegram) {
        this.logger.debug(`User ${user._id} filtered out - Telegram notifications disabled`);
        return false;
      }
      notificationsEnabled++;

      // For now, we only check the general telegram preference
      // In the future, we could add specific preferences for different notification types
      // e.g., notificationPreferences.security, notificationPreferences.marketing, etc.

      return true;
    });
    
    const filterTime = Date.now() - startTime;
    
    this.logger.debug(
      `User filtering completed in ${filterTime}ms: ` +
      `${users.length} total → ${activeUsers} active → ${telegramLinked} with Telegram → ` +
      `${notificationsEnabled} with notifications enabled → ${eligible.length} eligible for ${notificationType}`
    );
    
    if (eligible.length === 0 && users.length > 0) {
      this.logger.warn(
        `No eligible users for ${notificationType} notification. ` +
        `Reasons: ${users.length - activeUsers} inactive, ` +
        `${activeUsers - telegramLinked} without Telegram, ` +
        `${telegramLinked - notificationsEnabled} with notifications disabled`
      );
    }
    
    return eligible;
  }

  /**
   * Format notification message for Telegram
   */
  private formatMessage(message: NotificationMessage): string {
    const includeIcon = message.options?.includeIcon !== false; // Default to true
    
    if (includeIcon) {
      const typeEmoji = this.getTypeEmoji(message.type);
      return `${typeEmoji} *${message.title}*\n\n${message.body}`;
    } else {
      return `*${message.title}*\n\n${message.body}`;
    }
  }

  /**
   * Get emoji for notification type
   */
  private getTypeEmoji(type: NotificationType): string {
    switch (type) {
      case NotificationType.SECURITY:
        return '🔒';
      case NotificationType.UPDATE:
        return '📢';
      case NotificationType.MARKETING:
        return '🎯';
      case NotificationType.SYSTEM:
        return '⚙️';
      case NotificationType.TRADING:
        return '📈';
      case NotificationType.ARBITRAGE:
        return '⚡';
      case NotificationType.TRANSACTION:
        return '💰';
      default:
        return '📋';
    }
  }

  /**
   * Build Telegram options from notification options
   */
  private buildTelegramOptions(options?: NotificationOptions) {
    return {
      parse_mode: options?.parseMode || 'Markdown',
      disable_web_page_preview: options?.disablePreview || false,
      disable_notification: options?.silent || options?.disableNotification || false,
    };
  }

  /**
   * Send a simple text message to a user (utility method)
   */
  async sendSimpleMessage(
    userId: string,
    title: string,
    body: string,
    type: NotificationType = NotificationType.SYSTEM,
  ): Promise<NotificationResult> {
    return this.sendToUser(userId, {
      type,
      title,
      body,
    });
  }

  /**
   * Send security alert to admins
   */
  async sendSecurityAlert(
    title: string,
    body: string,
  ): Promise<NotificationResult> {
    return this.sendToRole('admin', {
      type: NotificationType.SECURITY,
      title,
      body,
      options: {
        silent: false, // Security alerts should not be silent
      },
    });
  }

  /**
   * Send system update notification to all users
   */
  async sendSystemUpdate(
    title: string,
    body: string,
  ): Promise<NotificationResult> {
    return this.sendToAllUsers({
      type: NotificationType.UPDATE,
      title,
      body,
    });
  }

  /**
   * Send trading/arbitrage update to users
   */
  async sendTradingUpdate(
    title: string,
    body: string,
    targetRole?: 'user' | 'admin' | 'moderator',
  ): Promise<NotificationResult> {
    const message = {
      type: NotificationType.TRADING,
      title,
      body,
    };

    if (targetRole) {
      return this.sendToRole(targetRole, message);
    }
    return this.sendToAllUsers(message);
  }

  // =====================================
  // QUEUED NOTIFICATION METHODS
  // =====================================

  /**
   * Queue notification to a specific user by user ID (non-blocking)
   */
  async queueToUser(
    userId: string,
    message: NotificationMessage,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ) {
    try {
      this.logger.debug(`Queueing notification for user ${userId}: ${message.title} (priority: ${options?.priority || 'default'})`);
      const job = await this.notificationQueueService.queueUserNotification(userId, message, options);
      this.logger.log(`Successfully queued user notification - Job ID: ${job.id}, User: ${userId}, Title: ${message.title}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to queue user notification for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Queue notification to a specific user by Telegram ID (non-blocking)
   */
  async queueToTelegramUser(
    telegramId: number,
    message: NotificationMessage,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ) {
    return this.notificationQueueService.queueTelegramUserNotification(telegramId, message, options);
  }

  /**
   * Queue notification to users with a specific role (non-blocking)
   */
  async queueToRole(
    role: 'user' | 'admin' | 'moderator',
    message: NotificationMessage,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ) {
    return this.notificationQueueService.queueRoleNotification(role, message, options);
  }

  /**
   * Queue notification to all users (non-blocking)
   */
  async queueToAllUsers(
    message: NotificationMessage,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ) {
    return this.notificationQueueService.queueBroadcastNotification(message, options);
  }

  /**
   * Queue notification to the configured channel (non-blocking)
   */
  async queueToChannel(
    message: NotificationMessage,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ) {
    return this.notificationQueueService.queueChannelNotification(message, options);
  }

  /**
   * Queue a simple text message to a user (utility method)
   */
  async queueSimpleMessage(
    userId: string,
    title: string,
    body: string,
    type: NotificationType = NotificationType.SYSTEM,
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ) {
    return this.queueToUser(userId, {
      type,
      title,
      body,
    }, options);
  }

  /**
   * Queue security alert to admins (high priority)
   */
  async queueSecurityAlert(
    title: string,
    body: string,
    options?: {
      delay?: number;
      attempts?: number;
    }
  ) {
    this.logger.warn(`Queueing SECURITY ALERT: ${title}`);
    try {
      const job = await this.queueToRole('admin', {
        type: NotificationType.SECURITY,
        title,
        body,
        options: {
          silent: false, // Security alerts should not be silent
        },
      }, {
        priority: 1, // High priority for security alerts
        attempts: 5, // More retry attempts for security alerts
        ...options,
      });
      this.logger.error(`CRITICAL: Security alert queued successfully - Job ID: ${job.id}, Title: ${title}`);
      return job;
    } catch (error) {
      this.logger.error(`CRITICAL: Failed to queue security alert "${title}":`, error);
      throw error;
    }
  }

  /**
   * Queue system update notification to all users (low priority)
   */
  async queueSystemUpdate(
    title: string,
    body: string,
    options?: {
      delay?: number;
      attempts?: number;
    }
  ) {
    return this.queueToAllUsers({
      type: NotificationType.UPDATE,
      title,
      body,
    }, {
      priority: 10, // Low priority for system updates
      ...options,
    });
  }

  /**
   * Queue trading/arbitrage update to users (medium priority)
   */
  async queueTradingUpdate(
    title: string,
    body: string,
    targetRole?: 'user' | 'admin' | 'moderator',
    options?: {
      delay?: number;
      attempts?: number;
    }
  ) {
    const message = {
      type: NotificationType.TRADING,
      title,
      body,
    };

    const queueOptions = {
      priority: 5, // Medium priority for trading updates
      ...options,
    };

    if (targetRole) {
      return this.queueToRole(targetRole, message, queueOptions);
    }
    return this.queueToAllUsers(message, queueOptions);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const stats = await this.notificationQueueService.getQueueStats();
      this.logger.debug(`Queue stats retrieved: waiting=${stats.waiting}, active=${stats.active}, completed=${stats.completed}, failed=${stats.failed}`);
      
      // Log warnings for concerning stats
      if (stats.failed > 10) {
        this.logger.warn(`High number of failed notification jobs: ${stats.failed}`);
      }
      
      if (stats.waiting > 100) {
        this.logger.warn(`Large queue backlog detected: ${stats.waiting} jobs waiting`);
      }
      
      return stats;
    } catch (error) {
      this.logger.error('Failed to retrieve queue statistics:', error);
      throw error;
    }
  }

  /**
   * Clear all queued notifications (admin function)
   */
  async clearQueue() {
    try {
      this.logger.warn('ADMIN ACTION: Clearing all queued notifications');
      await this.notificationQueueService.clearQueue();
      this.logger.log('Successfully cleared notification queue');
    } catch (error) {
      this.logger.error('Failed to clear notification queue:', error);
      throw error;
    }
  }

  /**
   * Pause notification processing (admin function)
   */
  async pauseQueue() {
    try {
      this.logger.warn('ADMIN ACTION: Pausing notification queue processing');
      await this.notificationQueueService.pauseQueue();
      this.logger.log('Notification queue processing paused');
    } catch (error) {
      this.logger.error('Failed to pause notification queue:', error);
      throw error;
    }
  }

  /**
   * Resume notification processing (admin function)
   */
  async resumeQueue() {
    try {
      this.logger.log('ADMIN ACTION: Resuming notification queue processing');
      await this.notificationQueueService.resumeQueue();
      this.logger.log('Notification queue processing resumed');
    } catch (error) {
      this.logger.error('Failed to resume notification queue:', error);
      throw error;
    }
  }
}
