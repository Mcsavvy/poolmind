import { Context } from 'telegraf';
import { logger } from '../../utils/logger';

export async function handleMainMenuCallback(ctx: Context): Promise<void> {
  try {
    await ctx.answerCbQuery();
    await ctx.reply('🏠 Main Menu');
  } catch (error) {
    logger.error('Error in main menu callback:', error);
    await ctx.answerCbQuery('Error occurred');
  }
}
