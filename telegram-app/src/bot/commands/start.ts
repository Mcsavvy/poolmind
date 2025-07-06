import { Context } from 'telegraf';
import { apiService } from '../../services/api';
import { authService } from '../../services/auth';
import { logger, logError } from '../../utils/logger';
import { KeyboardBuilder } from '../keyboards';
import { SessionContext } from '../middleware/session';
// @ts-ignore
import { config } from '../../config/env';

export async function startCommand(ctx: SessionContext): Promise<void> {
  try {
    const user = ctx.from;
    if (!user) {
      await ctx.reply('Unable to identify user. Please try again.');
      return;
    }

    logger.info(
      `Start command from user: ${user.id} (${user.username || user.first_name})`
    );

    // Get authenticated user (authentication may have been done in middleware)
    const authenticatedUser = authService.getAuthenticatedUser(ctx);

    let welcomeMessage = '';

    // Check if this is a new user (based on auth response or session)
    const isNewUser =
      authenticatedUser &&
      ctx.session?.user?.createdAt &&
      new Date().getTime() - new Date(ctx.session.user.createdAt).getTime() <
        60000; // Within last minute

    const userName =
      authenticatedUser?.firstName || user.first_name || user.username;
    welcomeMessage =
      `🎉 <b>Welcome to PoolMind!</b>\n\n` +
      `Hi ${userName}! I'm your gateway to the world of ` +
      `pooled cross-exchange arbitrage trading.\n\n` +
      `🔹 <b>What is PoolMind?</b>\n` +
      `PoolMind allows multiple users to contribute capital to a shared trading pool ` +
      `managed by AI agents. Our algorithms execute profitable arbitrage trades ` +
      `across different exchanges, and profits are distributed transparently.\n\n` +
      `🔹 <b>Getting Started:</b>\n` +
      `• Contribute funds to the pool and start earning profits\n` +
      `• Track your performance in real-time\n` +
      `• Withdraw your share anytime\n\n`;

    const keyboard = KeyboardBuilder.mainMenu(!!authenticatedUser);

    await ctx.reply(welcomeMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (error) {
    logError('Error in startCommand', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
}

export async function helpCommand(ctx: Context): Promise<void> {
  const helpMessage = `🤖 <b>PoolMind Bot Commands</b>\n\n`;

  await ctx.reply(helpMessage, {
    parse_mode: 'HTML',
    reply_markup: KeyboardBuilder.mainMenu(),
  });
}
