import { Context } from 'telegraf';
export async function tradesCommand(ctx: Context) {
  await ctx.reply('Trades command');
}
export async function statusCommand(ctx: Context) {
  await ctx.reply('Status command');
}
export async function settingsCommand(ctx: Context) {
  await ctx.reply('Settings command');
}
