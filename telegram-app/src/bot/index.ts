import { Telegraf } from 'telegraf';
import { config } from '../config/env';
import { logger, logError } from '../utils/logger';
import { authService } from '../services/auth';
import NotificationSubscriber from '../services/notificationSubscriber';
import {
  sessionMiddleware,
  activityMiddleware,
  sessionSaveMiddleware,
  authMiddleware,
  rateLimitMiddleware,
  errorMiddleware,
  loggingMiddleware,
  cleanupExpiredSessions,
  SessionContext,
} from './middleware/session';

// Import command handlers
import { startCommand, helpCommand } from './commands/start';
import {
  profileCommand,
  handleProfileCallback,
  handleWalletCallback,
  handleToggleAllNotifications,
  handleNotificationSettings,
} from './commands/profile';
import { handleMainMenuCallback } from './callbacks/menu';

class PoolMindBot {
  private bot: Telegraf<SessionContext>;
  private notificationSubscriber: NotificationSubscriber;

  constructor() {
    // Configure bot with custom handler timeout for slow networks
    this.bot = new Telegraf<SessionContext>(config.bot.token, {
      handlerTimeout: 90_000, // 90 seconds for handlers
    });

    // Initialize notification subscriber
    this.notificationSubscriber = new NotificationSubscriber(this.bot);

    this.setupMiddleware();
    this.setupCommands();
    this.setupCallbackHandlers();
    this.setupScheduledTasks();
  }

  private setupMiddleware(): void {
    // Apply middleware in order
    this.bot.use(sessionSaveMiddleware); // Must be first to save session after all processing
    this.bot.use(errorMiddleware);
    this.bot.use(loggingMiddleware);
    this.bot.use(sessionMiddleware);
    this.bot.use(activityMiddleware);
    this.bot.use(rateLimitMiddleware);
    this.bot.use(authMiddleware);
  }

  private setupCommands(): void {
    // Core commands
    this.bot.command('start', startCommand);
    this.bot.command('help', helpCommand);

    // Profile commands
    this.bot.command('profile', profileCommand);
  }

  private setupCallbackHandlers(): void {
    // Main menu callbacks
    this.bot.action(/^main_menu$/, handleMainMenuCallback);
    this.bot.action(/^menu_(.+)$/, handleMainMenuCallback);

    // Utility callbacks
    this.bot.action(/^close_message$/, async ctx => {
      try {
        await ctx.deleteMessage();
      } catch (error) {
        logError('Failed to delete message:', error);
      }
    });

    this.bot.action(/^ignore$/, async ctx => {
      // Do nothing - for pagination info
      await ctx.answerCbQuery();
    });

    // Contact support callback
    this.bot.action(/^contact_support$/, async ctx => {
      const supportMessage =
        '💬 <b>Contact Support</b>\n\n' +
        'Need help? Our support team is here for you!\n\n' +
        '📧 Email: support@poolmind.com\n' +
        '💬 Telegram: @poolmind_support\n' +
        '🌐 Website: https://poolmind.com/support\n\n' +
        'Average response time: 2-4 hours';

      try {
        await ctx.editMessageText(supportMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
            ],
          },
        });
      } catch (error) {
        logError('Failed to edit contact support message:', error);
        await ctx.answerCbQuery(
          'Failed to load support information. Please try again.'
        );
      }
    });

    // Profile callbacks
    this.bot.action(/^profile_(.+)$/, async ctx => {
      const action = ctx.match[1];
      await handleProfileCallback(ctx, action);
    });

    this.bot.action(/^wallet_(.+)$/, async ctx => {
      const action = ctx.match[1];
      await handleWalletCallback(ctx, action);
    });

    // Handle single notification toggle
    this.bot.action(/^toggle_notifications$/, async ctx => {
      await handleToggleAllNotifications(ctx);
    });

    // Handle settings menu callbacks
    this.bot.action(/^settings_notifications$/, async ctx => {
      await handleNotificationSettings(ctx);
    });

    // Handle authenticate callback
    this.bot.action(/^authenticate$/, async ctx => {
      const user = ctx.from;
      if (!user) {
        await ctx.answerCbQuery('Unable to identify user');
        return;
      }

      try {
        logger.info(`Processing authentication request for user ${user.id}`);

        const authResult = await authService.authenticateUser(ctx);

        if (authResult && authResult.success) {
          await ctx.answerCbQuery('Authentication successful! ✅');

          // Send welcome message for successful authentication
          const userName =
            authResult.data?.user.firstName || user.first_name || 'there';
          const welcomeMessage = authResult.data?.isNewUser
            ? `🎉 Welcome to PoolMind, ${userName}!

Your account has been created successfully. You can now:
• 💰 Contribute to the pool
• 📊 Track your performance  
• 🔔 Receive trading notifications
• 💎 Withdraw your share anytime

Let's get started! 🚀`
            : `👋 Welcome back, ${userName}!

You can now:
• 💰 Contribute to the pool
• 📊 Track your performance  
• 🔔 Receive trading notifications
• 💎 Withdraw your share anytime

Let's get started! 🚀`;

          await ctx.editMessageText(welcomeMessage, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
                [{ text: '👤 View Profile', callback_data: 'profile_refresh' }],
              ],
            },
          });

          if (authResult.data?.isNewUser) {
            logger.info(`New user registered: ${user.id}`);
          }
        } else {
          await ctx.answerCbQuery('Authentication failed ❌');
          await ctx.editMessageText(
            '❌ Authentication failed. Please try again.\n\n' +
              'If the problem persists, please contact our support team.',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔄 Try Again', callback_data: 'authenticate' }],
                  [
                    {
                      text: '💬 Contact Support',
                      callback_data: 'contact_support',
                    },
                  ],
                ],
              },
            }
          );
        }
      } catch (error) {
        logger.error('Authentication error in callback handler:', error);
        await ctx.answerCbQuery('Authentication error ❌');
        await ctx.editMessageText(
          '⚠️ Authentication error. Please try again.\n\n' +
            'If the problem persists, please contact support.',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔄 Try Again', callback_data: 'authenticate' }],
                [
                  {
                    text: '💬 Contact Support',
                    callback_data: 'contact_support',
                  },
                ],
              ],
            },
          }
        );
      }
    });

    // Handle text messages for profile editing
    this.bot.on('text', async ctx => {
      if (ctx.session?.step === 'awaiting_firstname') {
        const firstName = ctx.message.text.trim();
        await this.handleFirstNameInput(ctx, firstName);
      } else if (ctx.session?.step === 'awaiting_lastname') {
        const lastName = ctx.message.text.trim();
        await this.handleLastNameInput(ctx, lastName);
      }
    });

    // Handle edit name callbacks
    this.bot.action(/^edit_firstname$/, async ctx => {
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        '✏️ <b>Edit First Name</b>\n\n' + 'Please type your new first name:',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '← Back to Profile', callback_data: 'profile_refresh' }],
            ],
          },
        }
      );
      // Set session state to expect first name input
      if (ctx.session) {
        ctx.session.step = 'awaiting_firstname';
      }
    });

    this.bot.action(/^edit_lastname$/, async ctx => {
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        '✏️ <b>Edit Last Name</b>\n\n' + 'Please type your new last name:',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '← Back to Profile', callback_data: 'profile_refresh' }],
            ],
          },
        }
      );
      // Set session state to expect last name input
      if (ctx.session) {
        ctx.session.step = 'awaiting_lastname';
      }
    });
  }

  private setupScheduledTasks(): void {
    // Clean up expired sessions every hour
    setInterval(
      async () => {
        logger.info('Running scheduled session cleanup...');
        await cleanupExpiredSessions();
      },
      60 * 60 * 1000
    ); // 1 hour

    // Health check every 5 minutes
    setInterval(
      async () => {
        try {
          const botInfo = await this.bot.telegram.getMe();
          logger.debug('Bot health check passed:', botInfo.username);
        } catch (error) {
          logger.error('Bot health check failed:', error);
        }
      },
      5 * 60 * 1000
    ); // 5 minutes
  }

  public async start(): Promise<void> {
    try {
      logger.info('Starting PoolMind Telegram Bot...');

      // Enable graceful stop
      process.once('SIGINT', () => this.stop('SIGINT'));
      process.once('SIGTERM', () => this.stop('SIGTERM'));

      // Start the notification subscriber
      if (config.redis.url) {
        try {
          await this.notificationSubscriber.start();
          logger.info('Notification subscriber started successfully');
        } catch (error) {
          logger.error('Failed to start notification subscriber:', error);
          logger.warn('Bot will continue without notifications');
        }
      } else {
        logger.warn(
          'Redis URL not configured, notification subscriber disabled'
        );
      }

      // Start the bot with retry logic for network issues
      await this.startBotWithRetry();

      const botInfo = await this.getBotInfoWithRetry();
      logger.info(`Bot launched successfully: @${botInfo.username}`);
    } catch (error) {
      logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }

  private async startBotWithRetry(maxRetries: number = 5): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(
          `Attempting to start bot (attempt ${attempt}/${maxRetries})...`
        );

        await this.bot.launch();
        logger.info('Bot started with polling');
        logger.info(
          `Bot launched successfully: @${this.bot.botInfo?.username}`
        );

        return; // Success, exit retry loop
      } catch (error: any) {
        if (this.isNetworkError(error)) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Exponential backoff, max 30s
          logger.warn(
            `Network error on attempt ${attempt}/${maxRetries}: ${error.message}`
          );

          if (attempt < maxRetries) {
            logger.info(`Retrying in ${delay}ms...`);
            await this.sleep(delay);
            continue;
          }
        }
        throw error; // Re-throw if not a network error or max retries reached
      }
    }
  }

  private async getBotInfoWithRetry(maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Getting bot info (attempt ${attempt}/${maxRetries})...`);
        return await this.bot.telegram.getMe();
      } catch (error: any) {
        if (this.isNetworkError(error)) {
          const delay = Math.min(2000 * attempt, 10000); // Linear backoff, max 10s
          logger.warn(
            `Network error getting bot info on attempt ${attempt}/${maxRetries}: ${error.message}`
          );

          if (attempt < maxRetries) {
            logger.info(`Retrying getMe in ${delay}ms...`);
            await this.sleep(delay);
            continue;
          }
        }
        throw error;
      }
    }
  }

  private isNetworkError(error: any): boolean {
    const networkErrorCodes = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'EAI_AGAIN',
    ];
    return (
      networkErrorCodes.includes(error.code) ||
      error.message?.includes('timeout') ||
      error.message?.includes('network') ||
      error.message?.includes('fetch')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleFirstNameInput(
    ctx: SessionContext,
    firstName: string
  ): Promise<void> {
    try {
      // Validate first name
      if (!firstName || firstName.length < 1 || firstName.length > 50) {
        await ctx.reply(
          '❌ Invalid first name. Please provide a name between 1-50 characters.\n\n' +
            '📝 Try again:'
        );
        return;
      }

      // Update profile
      const updatedUser = await authService.updateUserProfile(ctx, {
        firstName: firstName,
      });

      if (updatedUser) {
        ctx.session.step = undefined; // Clear the step

        await ctx.reply(
          `✅ <b>First Name Updated!</b>\n\n` +
            `Your first name has been updated to: <b>${firstName}</b>`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '👤 View Profile', callback_data: 'profile_refresh' }],
                [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
              ],
            },
          }
        );
      } else {
        await ctx.reply(
          '❌ Failed to update first name. Please try again later.'
        );
      }
    } catch (error) {
      logger.error('Error updating first name:', error);
      await ctx.reply('❌ Error updating first name. Please try again.');
    }
  }

  private async handleLastNameInput(
    ctx: SessionContext,
    lastName: string
  ): Promise<void> {
    try {
      // Validate last name
      if (!lastName || lastName.length < 1 || lastName.length > 50) {
        await ctx.reply(
          '❌ Invalid last name. Please provide a name between 1-50 characters.\n\n' +
            '📝 Try again:'
        );
        return;
      }

      // Update profile
      const updatedUser = await authService.updateUserProfile(ctx, {
        lastName: lastName,
      });

      if (updatedUser) {
        ctx.session.step = undefined; // Clear the step

        await ctx.reply(
          `✅ <b>Last Name Updated!</b>\n\n` +
            `Your last name has been updated to: <b>${lastName}</b>`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '👤 View Profile', callback_data: 'profile_refresh' }],
                [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
              ],
            },
          }
        );
      } else {
        await ctx.reply(
          '❌ Failed to update last name. Please try again later.'
        );
      }
    } catch (error) {
      logger.error('Error updating last name:', error);
      await ctx.reply('❌ Error updating last name. Please try again.');
    }
  }

  public async stop(signal: string): Promise<void> {
    logger.info(`Received ${signal}. Graceful shutdown...`);

    try {
      // Stop notification subscriber
      if (this.notificationSubscriber) {
        await this.notificationSubscriber.stop();
        logger.info('Notification subscriber stopped');
      }

      // Stop the bot
      this.bot.stop(signal);
      logger.info('Bot stopped gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

export { PoolMindBot };
