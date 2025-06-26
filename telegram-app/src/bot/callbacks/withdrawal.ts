import { Context } from 'telegraf';
export async function handleWithdrawalCallback(ctx: Context) {
  await ctx.answerCbQuery();
}
