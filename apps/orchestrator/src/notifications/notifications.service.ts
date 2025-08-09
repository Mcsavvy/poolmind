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
      throw new Error('Telegram bot token not configured');
    }

    this.bot = new Telegraf(botToken);
    this.channelId = this.configService.get<string>('telegram.channelId') || '';
  }

  /**
   * Send notification to a specific user by user ID
   */
  async sendToUser(
    userId: string,
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.isActive) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 1,
        errors: [{ userId, error: 'User not found or inactive' }],
      };
    }

    return this.sendToUsers([user], message);
  }

  /**
   * Send notification to a specific user by Telegram ID
   */
  async sendToTelegramUser(
    telegramId: number,
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    const user = await this.userModel.findByTelegramId(telegramId);
    if (!user || !user.isActive) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 1,
        errors: [{ telegramId, error: 'User not found or inactive' }],
      };
    }

    return this.sendToUsers([user], message);
  }

  /**
   * Send notification to users with a specific role
   */
  async sendToRole(
    role: 'user' | 'admin' | 'moderator',
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    const users = await this.userModel.findByRole(role);
    return this.sendToUsers(users, message);
  }

  /**
   * Send notification to all users (broadcast)
   */
  async sendToAllUsers(
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    const users = await this.userModel.findWithTelegramNotifications();
    return this.sendToUsers(users, message);
  }

  /**
   * Send notification to the configured channel
   */
  async sendToChannel(
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    if (!this.channelId) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 1,
        errors: [{ error: 'Channel ID not configured' }],
      };
    }

    try {
      const formattedMessage = this.formatMessage(message);
      await this.bot.telegram.sendMessage(
        this.channelId,
        formattedMessage,
        this.buildTelegramOptions(message.options),
      );

      this.logger.log(`Notification sent to channel: ${message.title}`);
      return {
        success: true,
        sentCount: 1,
        failedCount: 0,
        errors: [],
      };
    } catch (error) {
      this.logger.error(`Failed to send notification to channel:`, error);
      return {
        success: false,
        sentCount: 0,
        failedCount: 1,
        errors: [{ error: error.message }],
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
    const eligibleUsers = this.filterEligibleUsers(users, message.type);
    const results: NotificationResult = {
      success: true,
      sentCount: 0,
      failedCount: 0,
      errors: [],
    };

    if (eligibleUsers.length === 0) {
      this.logger.warn(`No eligible users found for notification: ${message.title}`);
      return results;
    }

    const formattedMessage = this.formatMessage(message);
    const telegramOptions = this.buildTelegramOptions(message.options);

    // Send notifications in batches to avoid rate limiting
    const batchSize = 30; // Telegram rate limit is ~30 messages per second
    for (let i = 0; i < eligibleUsers.length; i += batchSize) {
      const batch = eligibleUsers.slice(i, i + batchSize);
      
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
          this.logger.debug(`Notification sent to user ${user._id}: ${message.title}`);
        } catch (error) {
          results.failedCount++;
          results.errors.push({
            userId: user._id.toString(),
            telegramId: user.telegramAuth?.telegramId,
            error: error.message,
          });
          this.logger.error(`Failed to send notification to user ${user._id}:`, error);
        }
      });

      await Promise.allSettled(batchPromises);

      // Add delay between batches to respect rate limits
      if (i + batchSize < eligibleUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update success status based on results
    results.success = results.failedCount === 0;

    this.logger.log(
      `Notification batch completed - Title: ${message.title}, Sent: ${results.sentCount}, Failed: ${results.failedCount}`,
    );

    return results;
  }

  /**
   * Filter users based on their notification preferences and Telegram availability
   */
  private filterEligibleUsers(
    users: IUser[],
    notificationType: NotificationType,
  ): IUser[] {
    return users.filter((user) => {
      // User must be active
      if (!user.isActive) return false;

      // User must have Telegram linked
      if (!user.telegramAuth?.telegramId) return false;

      // User must have Telegram notifications enabled
      if (!user.notificationPreferences?.telegram) return false;

      // For now, we only check the general telegram preference
      // In the future, we could add specific preferences for different notification types
      // e.g., notificationPreferences.security, notificationPreferences.marketing, etc.

      return true;
    });
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
    return this.notificationQueueService.queueUserNotification(userId, message, options);
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
    return this.queueToRole('admin', {
      type: NotificationType.SECURITY,
      title,
      body,
      options: {
        silent: false, // Security alerts should not be silent
      },
    }, {
      priority: 1, // High priority for security alerts
      ...options,
    });
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
    return this.notificationQueueService.getQueueStats();
  }

  /**
   * Clear all queued notifications (admin function)
   */
  async clearQueue() {
    return this.notificationQueueService.clearQueue();
  }

  /**
   * Pause notification processing (admin function)
   */
  async pauseQueue() {
    return this.notificationQueueService.pauseQueue();
  }

  /**
   * Resume notification processing (admin function)
   */
  async resumeQueue() {
    return this.notificationQueueService.resumeQueue();
  }
}
