import { Context } from 'telegraf';
import { logger } from '../../utils/logger';

export async function handleSettingsCallback(ctx: Context): Promise<void> {
  try {
    await ctx.answerCbQuery();
    await ctx.reply('⚙️ Settings');
  } catch (error) {
    logger.error('Error in settings callback:', error);
    await ctx.answerCbQuery('Error occurred');
  }
}
