import { PoolMindBot } from './bot';
import { logger } from './utils/logger';
import { config } from './config/env';

async function main() {
  try {
    logger.info('🚀 Initializing PoolMind Telegram Bot...');
    logger.info(`Environment: ${config.server.env}`);
    logger.info(`Port: ${config.server.port}`);

    const bot = new PoolMindBot();
    await bot.start();

    logger.info('✅ PoolMind Bot is now running!');
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error);

  // Don't exit if it's a WebSocket-related error (ENOTFOUND, ECONNREFUSED, etc.)
  if (
    error.message.includes('getaddrinfo') ||
    error.message.includes('ENOTFOUND') ||
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('api.poolmind.com')
  ) {
    logger.warn(
      'WebSocket connection error caught - continuing without WebSocket'
    );
    return;
  }

  // Exit for other critical errors
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);

  // Don't exit if it's a WebSocket-related error
  if (reason && typeof reason === 'object' && 'message' in reason) {
    const errorMessage = (reason as Error).message;
    if (
      errorMessage.includes('getaddrinfo') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('api.poolmind.com')
    ) {
      logger.warn('WebSocket rejection caught - continuing without WebSocket');
      return;
    }
  }

  process.exit(1);
});

// Start the application
main();
