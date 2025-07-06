import { Context, Middleware } from 'telegraf';
import { logger } from '../../utils/logger';
import { SessionData } from '../../types';
import { authService } from '../../services/auth';
import { storage } from '../../utils/storage';

interface SessionContext extends Context {
  session: SessionData;
}

// Simple session middleware
export const sessionMiddleware: Middleware<SessionContext> = async (
  ctx,
  next
) => {
  const userId = ctx.from?.id?.toString() || 'anonymous';
  const sessionKey = `session:${userId}`;

  // Initialize session if not exists
  let session = await storage.getObject<SessionData>(sessionKey);

  if (!session) {
    session = {
      userId: ctx.from?.id,
      currentPool: undefined,
      step: undefined,
      tempData: undefined,
      lastActivity: new Date(),
    };

    // Set session with 1 hour TTL
    await storage.setObject(sessionKey, session, 3600);
  }

  // Add session to context
  (ctx as any).session = session;

  return next();
};

// Middleware to update last activity
export const activityMiddleware: Middleware<SessionContext> = async (
  ctx,
  next
) => {
  if ((ctx as any).session) {
    (ctx as any).session.lastActivity = new Date();

    // Set user ID if not set
    if (!(ctx as any).session.userId && ctx.from) {
      (ctx as any).session.userId = ctx.from.id;
      logger.info(`Session initialized for user: ${ctx.from.id}`);
    }
  }

  return next();
};

// Middleware to save session after all processing is complete
export const sessionSaveMiddleware: Middleware<SessionContext> = async (
  ctx,
  next
) => {
  // Process the request first
  await next();

  // Then save the session (after all other middleware has potentially modified it)
  if ((ctx as any).session) {
    const userId = ctx.from?.id?.toString() || 'anonymous';
    const sessionKey = `session:${userId}`;
    await storage.setObject(sessionKey, (ctx as any).session, 3600);
    logger.debug(`Session saved for user: ${userId}`);
  }
};

// Helper function to clear expired sessions (cleanup job)
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    // Get all session keys
    const sessionKeys = await storage.keys('session:*');
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check each session for expiration
    for (const key of sessionKeys) {
      const session = await storage.getObject<SessionData>(key);
      if (session?.lastActivity && session.lastActivity < oneHourAgo) {
        await storage.delete(key);
        logger.debug(`Cleaned up expired session: ${key}`);
      }
    }
  } catch (error) {
    logger.error('Error cleaning up sessions:', error);
  }
}

// Authentication middleware - Updated to be selective about when auth is required
export const authMiddleware: Middleware<SessionContext> = async (ctx, next) => {
  const user = ctx.from;

  if (!user) {
    await ctx.reply(
      '❌ Unable to identify user. Please restart the bot with /start'
    );
    return;
  }

  // Set basic session user data
  if (ctx.session) {
    ctx.session.userId = user.id;
  }

  // Commands/actions that don't require authentication
  const publicCommands = [
    '/start',
    '/help',
    '/pools',
    '/status',
    'pools_page_',
    'pools_refresh',
    'pool_',
    'menu_pools',
    'contact_support',
    'close_message',
    'ignore',
  ];

  // Commands/actions that require authentication
  const protectedCommands = [
    '/profile',
    '/balance',
    '/portfolio',
    '/performance',
    '/contribute',
    '/withdraw',
    '/trades',
    '/settings',
    'profile_',
    'wallet_',
    'toggle_notifications',
    'contribute_',
    'withdraw_',
    'portfolio_',
    'settings_',
  ];

  // Get the current command or callback action
  const messageText =
    'text' in (ctx.message || {}) ? (ctx.message as any).text : '';
  const callbackData =
    'data' in (ctx.callbackQuery || {}) ? (ctx.callbackQuery as any).data : '';
  const currentAction = messageText || callbackData || '';

  // For protected actions, require authentication
  if (!authService.isAuthenticated(ctx)) {
    logger.info(
      `Protected action: ${currentAction} - attempting background authentication for user ${user.id}`
    );

    // Attempt automatic background authentication for all protected actions
    try {
      const authResult = await authService.authenticateUser(ctx);

      if (!authResult || !authResult.success) {
        logger.warn(`Background authentication failed for user ${user.id}`);

        // Only show explicit login prompt if automatic authentication fails
        const actionName = currentAction.split('_')[0] || 'this feature';
        await ctx.reply(
          `🔐 <b>Authentication Required</b>\n\n` +
            `To use ${actionName}, we need to verify your account. ` +
            `This ensures your data security and enables personalized features.\n\n` +
            `Please try again or contact support if the issue persists.`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔄 Try Again', callback_data: currentAction }],
                [
                  {
                    text: '🏠 Main Menu',
                    callback_data: 'main_menu',
                  },
                ],
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
        return;
      }

      if (authResult.data?.isNewUser) {
        logger.info(`New user registered during background auth: ${user.id}`);
      } else {
        logger.info(`Background authentication successful for user ${user.id}`);
      }

      // Continue with the protected action after successful authentication
    } catch (error) {
      logger.error('Background authentication error:', error);
      await ctx.reply(
        '⚠️ Authentication error. Please try again.\n\n' +
          'If the problem persists, please contact our support team.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Try Again', callback_data: currentAction }],
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
      return;
    }
  } else {
    // User is authenticated, refresh profile periodically for protected actions
    const user = authService.getAuthenticatedUser(ctx);
    if (user) {
      logger.debug(
        `Authenticated user: ${user.telegramId} (${user.username || user.firstName})`
      );
    }
  }

  return next();
};

// Rate limiting middleware
const userLastAction = new Map<number, number>();
const RATE_LIMIT_WINDOW = 1000; // 1 second

export const rateLimitMiddleware: Middleware<SessionContext> = async (
  ctx,
  next
) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const now = Date.now();
  const userActions = userLastAction.get(userId) || 0;

  if (now - userActions < RATE_LIMIT_WINDOW) {
    logger.warn(`Rate limit exceeded for user ${userId}`);
    await ctx.reply(
      "⚠️ You're sending messages too quickly. Please slow down."
    );
    return;
  }

  userLastAction.set(userId, now);
  return next();
};

// Error handling middleware
export const errorMiddleware: Middleware<SessionContext> = async (
  ctx,
  next
) => {
  try {
    await next();
  } catch (error) {
    logger.error('Bot error:', error);

    // Send user-friendly error message
    const errorMessage =
      '⚠️ Something went wrong. Please try again.\n\n' +
      'If the problem persists, please contact our support team.';

    try {
      await ctx.reply(errorMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Try Again', callback_data: 'main_menu' }],
            [{ text: '💬 Contact Support', callback_data: 'contact_support' }],
          ],
        },
      });
    } catch (replyError) {
      logger.error('Failed to send error message:', replyError);
    }
  }
};

// Logging middleware
export const loggingMiddleware: Middleware<SessionContext> = (ctx, next) => {
  const user = ctx.from;
  const message = ctx.message;
  const callbackQuery = ctx.callbackQuery;

  if (message && 'text' in message) {
    logger.info(
      `Message from ${user?.id} (${user?.username}): ${message.text}`
    );
  } else if (callbackQuery && 'data' in callbackQuery) {
    logger.info(
      `Callback from ${user?.id} (${user?.username}): ${callbackQuery.data}`
    );
  }

  return next();
};

export type { SessionContext };
