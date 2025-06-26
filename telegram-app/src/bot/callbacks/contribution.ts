import { Context } from 'telegraf';
export async function handleContributionCallback(ctx: Context) {
  await ctx.answerCbQuery();
}
