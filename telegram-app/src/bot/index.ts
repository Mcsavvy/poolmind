import { Telegraf } from 'telegraf';
import { config } from '../config/env';
import { logger, logError } from '../utils/logger';
import { webSocketService } from '../services/websocket';
import {
  sessionMiddleware,
  activityMiddleware,
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
  poolsCommand,
  poolInfoCommand,
  joinPoolCommand,
  handlePoolCallback,
} from './commands/pools';
import {
  balanceCommand,
  performanceCommand,
  portfolioCommand,
} from './commands/portfolio';
import { contributionCommand, withdrawalCommand } from './commands/financial';
import { tradesCommand, statusCommand, settingsCommand } from './commands/misc';
import { adminCommand } from './commands/admin';

// Import callback handlers
import { handleMainMenuCallback } from './callbacks/menu';
import { handleContributionCallback } from './callbacks/contribution';
import { handleWithdrawalCallback } from './callbacks/withdrawal';
import { handleSettingsCallback } from './callbacks/settings';

class PoolMindBot {
  private bot: Telegraf<SessionContext>;

  constructor() {
    // Configure bot with custom handler timeout for slow networks
    this.bot = new Telegraf<SessionContext>(config.bot.token, {
      handlerTimeout: 90_000, // 90 seconds for handlers
    });
    
    this.setupMiddleware();
    this.setupCommands();
    this.setupCallbackHandlers();
    this.setupWebSocketHandlers();
    this.setupScheduledTasks();
  }

  private setupMiddleware(): void {
    // Apply middleware in order
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

    // Pool management commands
    this.bot.command('pools', poolsCommand);
    this.bot.command('pool_info', ctx => poolInfoCommand(ctx));
    this.bot.command('join', joinPoolCommand);

    // Portfolio commands
    this.bot.command('balance', balanceCommand);
    this.bot.command('portfolio', portfolioCommand);
    this.bot.command('performance', performanceCommand);

    // Financial commands
    this.bot.command('contribute', contributionCommand);
    this.bot.command('withdraw', withdrawalCommand);

    // Information commands
    this.bot.command('trades', tradesCommand);
    this.bot.command('status', statusCommand);
    this.bot.command('settings', settingsCommand);

    // Admin commands
    this.bot.command('admin', adminCommand);
  }

  private setupCallbackHandlers(): void {
    // Main menu callbacks
    this.bot.action(/^main_menu$/, handleMainMenuCallback);
    this.bot.action(/^menu_(.+)$/, handleMainMenuCallback);

    // Pool-related callbacks
    this.bot.action(/^pool_(.+)$/, async ctx => {
      const poolId = ctx.match[1];
      await handlePoolCallback(ctx, 'pool', poolId);
    });

    this.bot.action(
      /^(contribute|withdraw|performance|trades|participants)_(.+)$/,
      async ctx => {
        const action = ctx.match[1];
        const poolId = ctx.match[2];
        await handlePoolCallback(ctx, action, poolId);
      }
    );

    // Pagination callbacks
    this.bot.action(/^pools_page_(\d+)$/, async ctx => {
      await poolsCommand(ctx);
    });

    this.bot.action(/^pools_refresh$/, poolsCommand);

    // Contribution callbacks
    this.bot.action(
      /^contribute_amount_(.+)_(.+)$/,
      handleContributionCallback
    );
    this.bot.action(/^contribute_custom_(.+)$/, handleContributionCallback);
    this.bot.action(
      /^confirm_contribute_(.+)_(.+)$/,
      handleContributionCallback
    );

    // Withdrawal callbacks
    this.bot.action(/^withdraw_amount_(.+)_(.+)$/, handleWithdrawalCallback);
    this.bot.action(/^withdraw_custom_(.+)$/, handleWithdrawalCallback);
    this.bot.action(/^confirm_withdraw_(.+)_(.+)$/, handleWithdrawalCallback);

    // Settings callbacks
    this.bot.action(/^settings_(.+)$/, handleSettingsCallback);
    this.bot.action(/^toggle_(.+)$/, handleSettingsCallback);

    // Portfolio callbacks
    this.bot.action(/^portfolio_(.+)$/, async ctx => {
      const action = ctx.match[1];
      switch (action) {
        case 'holdings':
          await portfolioCommand(ctx);
          break;
        case 'performance':
          await performanceCommand(ctx);
          break;
        case 'refresh':
          await balanceCommand(ctx);
          break;
        default:
          logger.warn(`Unknown portfolio action: ${action}`);
      }
    });

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
              [
                {
                  text: '🌐 Open Support Portal',
                  url: 'https://poolmind.com/support',
                },
              ],
              [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
            ],
          },
        });
      } catch (error) {
        logError('Failed to edit contact support message:', error);
        await ctx.answerCbQuery('Failed to load support information. Please try again.');
      }
    });
  }

  private setupWebSocketHandlers(): void {
    // Handle real-time pool updates
    webSocketService.on('poolUpdate', update => {
      this.handlePoolUpdate(update);
    });

    webSocketService.on('tradeExecuted', trade => {
      this.handleTradeExecuted(trade);
    });

    webSocketService.on('profitDistribution', distribution => {
      this.handleProfitDistribution(distribution);
    });

    webSocketService.on('systemAlert', alert => {
      this.handleSystemAlert(alert);
    });
  }

  private async handlePoolUpdate(update: any): Promise<void> {
    try {
      logger.info('Pool update received:', update);
    } catch (error) {
      logError('Error handling pool update:', error);
    }
  }

  private async handleTradeExecuted(trade: any): Promise<void> {
    try {
      logger.info('Trade executed:', trade);
    } catch (error) {
      logError('Error handling trade notification:', error);
    }
  }

  private async handleProfitDistribution(distribution: any): Promise<void> {
    try {
      logger.info('Profit distribution:', distribution);

      // Notify affected users about their profit distribution
      const notificationMessage =
        `💰 <b>Profit Distributed</b>\n\n` +
        `Daily profits have been distributed to your account!\n\n` +
        `💵 Your Share: $${distribution.userShare?.toFixed(2) || '0.00'}\n` +
        `📊 Pool: ${distribution.poolName}\n` +
        `📈 Total Distributed: $${distribution.totalAmount.toFixed(2)}`;

      // Send to specific user
      if (distribution.userId) {
        try {
          await this.bot.telegram.sendMessage(
            distribution.userId,
            notificationMessage,
            {
              parse_mode: 'HTML',
            }
          );
        } catch (error) {
          logError(
            `Failed to send profit notification to user ${distribution.userId}:`,
            error
          );
        }
      }
    } catch (error) {
      logError('Error handling profit distribution:', error);
    }
  }

  private async handleSystemAlert(alert: any): Promise<void> {
    try {
      logger.info('System alert:', alert);
    } catch (error) {
      logError('Error handling system alert:', error);
    }
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
        logger.info(`Attempting to start bot (attempt ${attempt}/${maxRetries})...`);
        
        if (config.bot.webhookUrl) {
          // Production: Use webhooks
          await this.bot.launch({
            webhook: {
              domain: config.bot.webhookUrl,
              port: config.server.port,
            },
          });
          logger.info(`Bot started with webhook: ${config.bot.webhookUrl}`);
        } else {
          // Development: Use polling
          await this.bot.launch();
          logger.info('Bot started with polling');
        }
        
        return; // Success, exit retry loop
      } catch (error: any) {
        if (this.isNetworkError(error)) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Exponential backoff, max 30s
          logger.warn(`Network error on attempt ${attempt}/${maxRetries}: ${error.message}`);
          
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
          logger.warn(`Network error getting bot info on attempt ${attempt}/${maxRetries}: ${error.message}`);
          
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
    const networkErrorCodes = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'];
    return networkErrorCodes.includes(error.code) || 
           error.message?.includes('timeout') ||
           error.message?.includes('network') ||
           error.message?.includes('fetch');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async stop(signal: string): Promise<void> {
    logger.info(`Received ${signal}. Graceful shutdown...`);

    try {
      // Stop the bot
      this.bot.stop(signal);

      // Disconnect WebSocket
      webSocketService.disconnect();

      logger.info('Bot stopped gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

export { PoolMindBot };
