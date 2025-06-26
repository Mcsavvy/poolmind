import { Context, Middleware } from 'telegraf';
import { createClient, RedisClientType } from 'redis';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { SessionData } from '../../types';

// Redis client for session storage
let redisClient: RedisClientType | null = null;

// Initialize Redis client
async function initRedis(): Promise<void> {
  try {
    redisClient = createClient({
      url: config.redis.url,
    });

    redisClient.on('error', err => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });

    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    logger.warn('Falling back to memory session storage');
    redisClient = null;
  }
}

// Initialize Redis on module load
initRedis();

// Memory fallback for session storage
const memoryStore = new Map<string, SessionData>();

interface SessionContext extends Context {
  session: SessionData;
}

// Simple session middleware
export const sessionMiddleware: Middleware<SessionContext> = (ctx, next) => {
  const userId = ctx.from?.id?.toString() || 'anonymous';

  // Initialize session if not exists
  if (!memoryStore.has(userId)) {
    memoryStore.set(userId, {
      userId: ctx.from?.id,
      currentPool: undefined,
      step: undefined,
      tempData: undefined,
      lastActivity: new Date(),
    });
  }

  // Add session to context
  (ctx as any).session = memoryStore.get(userId);

  return next();
};

// Middleware to update last activity
export const activityMiddleware: Middleware<SessionContext> = (ctx, next) => {
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

// Helper function to clear expired sessions (cleanup job)
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    if (redisClient) {
      // Redis TTL handles this automatically
      return;
    }

    // Manual cleanup for memory store
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (const [key, session] of memoryStore.entries()) {
      if (session.lastActivity && session.lastActivity < oneHourAgo) {
        memoryStore.delete(key);
        logger.debug(`Cleaned up expired session: ${key}`);
      }
    }
  } catch (error) {
    logger.error('Error cleaning up sessions:', error);
  }
}

// Authentication middleware
export const authMiddleware: Middleware<SessionContext> = async (ctx, next) => {
  const user = ctx.from;

  if (!user) {
    await ctx.reply(
      '❌ Unable to identify user. Please restart the bot with /start'
    );
    return;
  }

  // Set session user data
  if ((ctx as any).session) {
    (ctx as any).session.userId = user.id;
  }

  logger.debug(
    `Authenticated user: ${user.id} (${user.username || user.first_name})`
  );

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
