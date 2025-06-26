import { Context } from 'telegraf';
export async function adminCommand(ctx: Context) {
  await ctx.reply('Admin command');
}
