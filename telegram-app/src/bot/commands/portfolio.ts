import { Context } from 'telegraf';
import { logger } from '../../utils/logger';

export async function balanceCommand(ctx: Context): Promise<void> {
  try {
    await ctx.reply('💼 <b>Your Portfolio</b>\n\nFetching your balance...', {
      parse_mode: 'HTML',
    });
  } catch (error) {
    logger.error('Error in balance command:', error);
    await ctx.reply('⚠️ Unable to fetch portfolio data. Please try again.');
  }
}

export async function portfolioCommand(ctx: Context): Promise<void> {
  try {
    await ctx.reply('💼 <b>Portfolio Details</b>\n\nFetching your portfolio...', {
      parse_mode: 'HTML',
    });
  } catch (error) {
    logger.error('Error in portfolio command:', error);
    await ctx.reply('⚠️ Unable to fetch portfolio data. Please try again.');
  }
}

export async function performanceCommand(ctx: Context): Promise<void> {
  try {
    await ctx.reply(
      '📊 <b>Performance Analytics</b>\n\nFetching your performance...',
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    logger.error('Error in performance command:', error);
    await ctx.reply('⚠️ Unable to fetch performance data. Please try again.');
  }
}
