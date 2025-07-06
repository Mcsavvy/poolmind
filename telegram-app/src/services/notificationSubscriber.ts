import { createClient } from 'redis';
import { Telegraf } from 'telegraf';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { authService } from './auth';
import {
  NotificationEvent,
  NotificationEventType,
  WalletLinkedEvent,
  WalletUnlinkedEvent,
  DepositSuccessEvent,
  WithdrawalSuccessEvent,
} from '../types';
import { SessionContext } from '../bot/middleware/session';

class NotificationSubscriber {
  private subscriber: ReturnType<typeof createClient>;
  private bot: Telegraf<SessionContext>;
  private readonly channelName = 'poolmind-notifications';
  private isConnected = false;

  constructor(bot: Telegraf<SessionContext>) {
    this.bot = bot;

    // Initialize Redis subscriber
    this.subscriber = createClient({
      url: config.redis.url,
    });

    this.subscriber.on('error', (error: Error) => {
      logger.error('Redis subscriber error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

    this.subscriber.on('connect', () => {
      logger.info('Redis subscriber connected', {
        url: config.redis.url,
      });
    });

    this.subscriber.on('ready', () => {
      logger.info('Redis subscriber ready');
      this.isConnected = true;
    });

    this.subscriber.on('end', () => {
      logger.info('Redis subscriber connection ended');
      this.isConnected = false;
    });
  }

  /**
   * Start the notification subscriber
   */
  async start(): Promise<void> {
    try {
      await this.subscriber.connect();

      // Subscribe to notification channel
      await this.subscriber.subscribe(this.channelName, message => {
        this.handleNotification(message);
      });

      logger.info('Notification subscriber started', {
        channelName: this.channelName,
      });
    } catch (error) {
      logger.error('Failed to start notification subscriber', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Handle incoming notification messages
   */
  private async handleNotification(message: string): Promise<void> {
    try {
      const event: NotificationEvent = JSON.parse(message);

      logger.info('Received notification event', {
        eventType: event.eventType,
        telegramId: event.telegramId,
        userId: event.userId,
      });

      // Check if user has notifications enabled
      const shouldSendNotification = await this.shouldSendNotification(
        event.telegramId
      );

      if (!shouldSendNotification) {
        logger.info('Notifications disabled for user', {
          telegramId: event.telegramId,
          eventType: event.eventType,
        });
        return;
      }

      // Route to appropriate handler based on event type
      switch (event.eventType) {
        case NotificationEventType.WALLET_LINKED:
          await this.handleWalletLinked(event as WalletLinkedEvent);
          break;
        case NotificationEventType.WALLET_UNLINKED:
          await this.handleWalletUnlinked(event as WalletUnlinkedEvent);
          break;
        case NotificationEventType.DEPOSIT_SUCCESS:
          await this.handleDepositSuccess(event as DepositSuccessEvent);
          break;
        case NotificationEventType.WITHDRAWAL_SUCCESS:
          await this.handleWithdrawalSuccess(event as WithdrawalSuccessEvent);
          break;
        default:
          logger.warn('Unknown notification event type', {
            eventType: (event as any).eventType,
            telegramId: (event as any).telegramId,
          });
      }
    } catch (error) {
      logger.error('Failed to handle notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        message: message.substring(0, 200), // Log first 200 chars for debugging
      });
    }
  }

  /**
   * Check if user has notifications enabled
   */
  private async shouldSendNotification(telegramId: string): Promise<boolean> {
    try {
      // This is a simplified check - in a real implementation, you might want to
      // fetch user preferences from the database or cache
      // For now, we'll assume notifications are enabled by default
      return true;
    } catch (error) {
      logger.error('Failed to check notification preferences', {
        telegramId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Default to sending notifications if we can't check preferences
      return true;
    }
  }

  /**
   * Handle wallet linked notification
   */
  private async handleWalletLinked(event: WalletLinkedEvent): Promise<void> {
    const message =
      '🔗 <b>Wallet Connected Successfully!</b>\n\n' +
      `Your Stacks wallet has been linked to your PoolMind account.\n\n` +
      `💎 <b>Wallet:</b> ${event.walletAddress.slice(0, 8)}...${event.walletAddress.slice(-8)}\n\n` +
      `You can now:\n` +
      `• Make deposits to the pool\n` +
      `• Withdraw your earnings\n` +
      `• Track your portfolio performance\n\n` +
      `Ready to start earning? Check out the available pools!`;

    await this.sendNotification(event.telegramId, message);
  }

  /**
   * Handle wallet unlinked notification
   */
  private async handleWalletUnlinked(
    event: WalletUnlinkedEvent
  ): Promise<void> {
    const message =
      '🔓 <b>Wallet Disconnected</b>\n\n' +
      `Your Stacks wallet has been unlinked from your PoolMind account.\n\n` +
      `💎 <b>Previous Wallet:</b> ${event.walletAddress.slice(0, 8)}...${event.walletAddress.slice(-8)}\n\n` +
      `⚠️ <b>Note:</b> You won't be able to make new deposits or withdrawals until you link a new wallet.\n\n` +
      `Want to connect a different wallet?`;

    await this.sendNotification(event.telegramId, message);
  }

  /**
   * Handle deposit success notification
   */
  private async handleDepositSuccess(
    event: DepositSuccessEvent
  ): Promise<void> {
    const stxFormatted = (event.stxAmount / 1_000_000).toFixed(6);
    const plmdFormatted = (event.plmdAmount / 1_000_000).toFixed(6);
    const feeFormatted = (event.fee / 1_000_000).toFixed(6);
    const netFormatted = (event.netAmount / 1_000_000).toFixed(6);

    const message =
      '✅ <b>Deposit Successful!</b>\n\n' +
      `Your deposit has been processed and confirmed on the blockchain.\n\n` +
      `💰 <b>Deposit Details:</b>\n` +
      `• Amount: ${stxFormatted} STX\n` +
      `• PLMD Received: ${plmdFormatted} PLMD\n` +
      `• Fee: ${feeFormatted} STX\n` +
      `• Net Amount: ${netFormatted} STX\n\n` +
      `🔗 <b>Transaction:</b> ${event.txId.slice(0, 8)}...${event.txId.slice(-8)}\n` +
      (event.blockHeight ? `📦 <b>Block:</b> ${event.blockHeight}\n` : '') +
      (event.nav
        ? `📊 <b>NAV:</b> ${(event.nav / 1_000_000).toFixed(6)} STX\n`
        : '') +
      `\n🎉 Welcome to the pool! Your funds are now working for you.`;

    await this.sendNotification(event.telegramId, message);
  }

  /**
   * Handle withdrawal success notification
   */
  private async handleWithdrawalSuccess(
    event: WithdrawalSuccessEvent
  ): Promise<void> {
    const plmdFormatted = (event.plmdAmount / 1_000_000).toFixed(6);
    const stxFormatted = (event.stxAmount / 1_000_000).toFixed(6);
    const feeFormatted = (event.fee / 1_000_000).toFixed(6);
    const netFormatted = (event.netAmount / 1_000_000).toFixed(6);

    const message =
      '💸 <b>Withdrawal Successful!</b>\n\n' +
      `Your withdrawal has been processed and confirmed on the blockchain.\n\n` +
      `💰 <b>Withdrawal Details:</b>\n` +
      `• PLMD Redeemed: ${plmdFormatted} PLMD\n` +
      `• STX Received: ${stxFormatted} STX\n` +
      `• Fee: ${feeFormatted} STX\n` +
      `• Net Amount: ${netFormatted} STX\n\n` +
      `🔗 <b>Transaction:</b> ${event.txId.slice(0, 8)}...${event.txId.slice(-8)}\n` +
      (event.blockHeight ? `📦 <b>Block:</b> ${event.blockHeight}\n` : '') +
      (event.nav
        ? `📊 <b>NAV:</b> ${(event.nav / 1_000_000).toFixed(6)} STX\n`
        : '') +
      `\n💼 Your funds have been transferred to your wallet.`;

    await this.sendNotification(event.telegramId, message);
  }

  /**
   * Send notification message to user
   */
  private async sendNotification(
    telegramId: string,
    message: string,
    keyboard?: Array<Array<{ text: string; callback_data: string }>>
  ): Promise<void> {
    try {
      const chatId = parseInt(telegramId);
      const options: any = {
        parse_mode: 'HTML',
      };

      if (keyboard) {
        options.reply_markup = {
          inline_keyboard: keyboard,
        };
      }

      await this.bot.telegram.sendMessage(chatId, message, options);

      logger.info('Notification sent successfully', {
        telegramId,
        messageLength: message.length,
      });
    } catch (error) {
      logger.error('Failed to send notification', {
        telegramId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check if the subscriber is connected
   */
  isActive(): boolean {
    return this.isConnected;
  }

  /**
   * Stop the notification subscriber
   */
  async stop(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.subscriber.unsubscribe(this.channelName);
        await this.subscriber.disconnect();
        this.isConnected = false;
        logger.info('Notification subscriber stopped');
      }
    } catch (error) {
      logger.error('Failed to stop notification subscriber', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default NotificationSubscriber;
