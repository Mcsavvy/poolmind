import { Context } from 'telegraf';
import { logger } from '../../utils/logger';
import { KeyboardBuilder } from '../keyboards';
import { Message } from 'telegraf/types';

export async function handleMainMenuCallback(ctx: Context): Promise<void> {
  try {
    await ctx.answerCbQuery();

    const menuMessage =
      `🏠 <b>PoolMind Main Menu</b>\n\n` +
      `Welcome to PoolMind - Your gateway to pooled crypto arbitrage trading.\n\n` +
      `What would you like to do?`;

    // Use editMessageText if it's a callback, otherwise reply
    if (ctx.callbackQuery && 'message' in ctx.callbackQuery) {
      const currentMessage = ctx.callbackQuery.message as Message;
      const newKeyboard = KeyboardBuilder.mainMenu();

      // Check if the message content and keyboard are already the same
      const currentText =
        ('text' in currentMessage ? currentMessage.text : '') ||
        ('caption' in currentMessage ? currentMessage.caption : '') ||
        '';
      const currentKeyboard =
        'reply_markup' in currentMessage ? currentMessage.reply_markup : null;

      // Compare content (strip HTML for comparison as Telegram might not include HTML tags in the returned text)
      const currentTextPlain = currentText.replace(/<[^>]*>/g, '');
      const newTextPlain = menuMessage.replace(/<[^>]*>/g, '');

      const isContentSame = currentTextPlain.trim() === newTextPlain.trim();
      const isKeyboardSame =
        JSON.stringify(currentKeyboard) === JSON.stringify(newKeyboard);

      if (isContentSame && isKeyboardSame) {
        // Message is already the same, just answer the callback query
        return;
      }

      await ctx.editMessageText(menuMessage, {
        parse_mode: 'HTML',
        reply_markup: newKeyboard,
      });
    } else {
      await ctx.reply(menuMessage, {
        parse_mode: 'HTML',
        reply_markup: KeyboardBuilder.mainMenu(),
      });
    }
  } catch (error) {
    logger.error('Error in main menu callback:', error);

    // If it's still the "message not modified" error, just acknowledge it
    if (
      error instanceof Error &&
      error.message &&
      error.message.includes('message is not modified')
    ) {
      return; // Already answered callback query above
    }

    await ctx.answerCbQuery('Error occurred');
  }
}
