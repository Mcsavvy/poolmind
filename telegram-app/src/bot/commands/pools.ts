import { Context } from 'telegraf';
import { apiService } from '../../services/api';
import { logger } from '../../utils/logger';
import { KeyboardBuilder } from '../keyboards';
import { Pool } from '../../types';

export async function poolsCommand(ctx: Context): Promise<void> {
  try {
    const pools = await fetchPools(1, 10);

    if (pools.length === 0) {
      await ctx.reply(
        '📊 No trading pools available at the moment.\n\n' +
          'Please check back later or contact support if you think this is an error.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Refresh', callback_data: 'menu_pools' }],
              [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
            ],
          },
        }
      );
      return;
    }

    const message = formatPoolsMessage(pools);
    const keyboard = KeyboardBuilder.poolsList(pools);

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (error) {
    logger.error('Error in pools command:', error);
    await ctx.reply(
      '⚠️ Unable to fetch pools at the moment. Please try again.',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Try Again', callback_data: 'menu_pools' }],
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
          ],
        },
      }
    );
  }
}

export async function poolInfoCommand(
  ctx: Context,
  poolId?: string
): Promise<void> {
  try {
    // Extract pool ID from command or callback data
    let targetPoolId = poolId;

    if (!targetPoolId && ctx.message && 'text' in ctx.message) {
      const parts = ctx.message.text.split(' ');
      targetPoolId = parts[1];
    }

    if (!targetPoolId) {
      await ctx.reply(
        'Please specify a pool ID.\n\nUsage: `/pool_info [pool_id]`\n\n' +
          'Or use the buttons below to browse available pools.',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 Browse Pools', callback_data: 'menu_pools' }],
            ],
          },
        }
      );
      return;
    }

    const poolResponse = await apiService.getPool(targetPoolId);
    if (!poolResponse.success || !poolResponse.data) {
      await ctx.reply(`❌ Pool "${targetPoolId}" not found.`);
      return;
    }

    const pool = poolResponse.data;
    const userId = ctx.from?.id;
    let userHasShares = false;

    // Check if user has shares in this pool
    if (userId) {
      try {
        const portfolioResponse = await apiService.getUserPortfolio(userId);
        if (portfolioResponse.success && portfolioResponse.data) {
          userHasShares = portfolioResponse.data.some(
            p => p.poolId === targetPoolId
          );
        }
      } catch (error) {
        logger.warn('Could not fetch user portfolio for share check:', error);
      }
    }

    const message = formatPoolDetailsMessage(pool, userHasShares);
    const keyboard = KeyboardBuilder.poolDetails(pool, userHasShares);

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (error) {
    logger.error('Error in pool info command:', error);
    await ctx.reply('⚠️ Unable to fetch pool information. Please try again.');
  }
}

export async function joinPoolCommand(ctx: Context): Promise<void> {
  try {
    let poolId: string | undefined;

    if (ctx.message && 'text' in ctx.message) {
      const parts = ctx.message.text.split(' ');
      poolId = parts[1];
    }

    if (!poolId) {
      await ctx.reply(
        'Please specify a pool ID to join.\n\nUsage: `/join [pool_id]`\n\n' +
          'Browse available pools to find one that suits your risk profile.',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 Browse Pools', callback_data: 'menu_pools' }],
            ],
          },
        }
      );
      return;
    }

    // Show pool details and contribution options
    await poolInfoCommand(ctx, poolId);
  } catch (error) {
    logger.error('Error in join pool command:', error);
    await ctx.reply('⚠️ Unable to process join request. Please try again.');
  }
}

async function fetchPools(
  page: number = 1,
  limit: number = 10
): Promise<Pool[]> {
  try {
    const response = await apiService.getPools(page, limit);
    return response.data || [];
  } catch (error) {
    logger.error('Failed to fetch pools:', error);
    throw error;
  }
}

function formatPoolsMessage(pools: Pool[]): string {
  let message = `📊 <b>Available Trading Pools</b>\n\n`;

  pools.slice(0, 5).forEach(pool => {
    const riskEmoji =
      pool.riskLevel === 'LOW'
        ? '🟢'
        : pool.riskLevel === 'MEDIUM'
          ? '🟡'
          : '🔴';
    const monthlyReturn = (pool.performanceMetrics.monthlyReturn * 100).toFixed(
      1
    );
    const totalValue = pool.totalValue.toLocaleString();

    message += `${riskEmoji} <b>${pool.name}</b>\n`;
    message += `💰 Total Value: $${totalValue}\n`;
    message += `📈 30-day Return: +${monthlyReturn}%\n`;
    message += `👥 Participants: ${pool.participantCount}\n`;
    message += `⚡ Risk Level: ${pool.riskLevel}\n`;
    message += `💵 Min. Contribution: $${pool.minimumContribution}\n\n`;
  });

  if (pools.length > 5) {
    message += `... and ${pools.length - 5} more pools available.\n\n`;
  }

  message += `Select a pool below to view details and join!`;

  return message;
}

function formatPoolDetailsMessage(pool: Pool, userHasShares: boolean): string {
  const riskEmoji =
    pool.riskLevel === 'LOW' ? '🟢' : pool.riskLevel === 'MEDIUM' ? '🟡' : '🔴';
  const metrics = pool.performanceMetrics;

  let message = `${riskEmoji} <b>${pool.name}</b>\n\n`;

  message += `📝 <b>Description:</b>\n${pool.description}\n\n`;

  message += `💰 <b>Pool Overview:</b>\n`;
  message += `• Total Value: $${pool.totalValue.toLocaleString()}\n`;
  message += `• Participants: ${pool.participantCount}\n`;
  message += `• Risk Level: ${pool.riskLevel}\n`;
  message += `• Min. Contribution: $${pool.minimumContribution}\n`;
  message += `• Status: ${pool.status}\n\n`;

  message += `📈 <b>Performance Metrics:</b>\n`;
  message += `• Current NAV: $${metrics.nav.toFixed(4)}\n`;
  message += `• Daily Return: ${(metrics.dailyReturn * 100).toFixed(2)}%\n`;
  message += `• Weekly Return: ${(metrics.weeklyReturn * 100).toFixed(2)}%\n`;
  message += `• Monthly Return: ${(metrics.monthlyReturn * 100).toFixed(2)}%\n`;
  message += `• Yearly Return: ${(metrics.yearlyReturn * 100).toFixed(2)}%\n\n`;

  message += `🎯 <b>Trading Stats:</b>\n`;
  message += `• Total Trades: ${metrics.totalTrades}\n`;
  message += `• Win Rate: ${(metrics.winRate * 100).toFixed(1)}%\n`;
  message += `• Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}\n`;
  message += `• Max Drawdown: ${(metrics.maxDrawdown * 100).toFixed(2)}%\n\n`;

  if (userHasShares) {
    message += `✅ <b>You are invested in this pool</b>\n\n`;
  }

  message += `Use the buttons below to interact with this pool:`;

  return message;
}

export async function handlePoolCallback(
  ctx: Context,
  action: string,
  poolId: string
): Promise<void> {
  try {
    switch (action) {
      case 'pool':
        await poolInfoCommand(ctx, poolId);
        break;
      case 'contribute':
        await showContributionOptions(ctx, poolId);
        break;
      case 'withdraw':
        await showWithdrawalOptions(ctx, poolId);
        break;
      case 'performance':
        await showPoolPerformance(ctx, poolId);
        break;
      case 'trades':
        await showPoolTrades(ctx, poolId);
        break;
      case 'participants':
        await showPoolParticipants(ctx, poolId);
        break;
      default:
        logger.warn(`Unknown pool action: ${action}`);
    }
  } catch (error) {
    logger.error(`Error handling pool callback ${action}:`, error);
    await ctx.reply('⚠️ Unable to process request. Please try again.');
  }
}

async function showContributionOptions(
  ctx: Context,
  poolId: string
): Promise<void> {
  const poolResponse = await apiService.getPool(poolId);
  if (!poolResponse.success || !poolResponse.data) {
    await ctx.reply('❌ Pool not found.');
    return;
  }

  const pool = poolResponse.data;
  const message =
    `💰 <b>Contribute to ${pool.name}</b>\n\n` +
    `Choose an amount to contribute:\n\n` +
    `💵 Minimum: $${pool.minimumContribution}\n` +
    `📊 Current NAV: $${pool.performanceMetrics.nav.toFixed(4)}\n\n` +
    `Your contribution will be converted to shares at the current NAV price.`;

  const keyboard = KeyboardBuilder.contributionAmounts(poolId);

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

async function showWithdrawalOptions(
  ctx: Context,
  poolId: string
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Unable to identify user.');
    return;
  }

  try {
    const portfolioResponse = await apiService.getUserPortfolio(userId);
    if (!portfolioResponse.success || !portfolioResponse.data) {
      await ctx.reply('❌ Unable to fetch your portfolio.');
      return;
    }

    const portfolio = portfolioResponse.data.find(p => p.poolId === poolId);
    if (!portfolio) {
      await ctx.reply("❌ You don't have any shares in this pool.");
      return;
    }

    const message =
      `💸 <b>Withdraw from Pool</b>\n\n` +
      `💼 Your Holdings:\n` +
      `• Shares: ${portfolio.shares}\n` +
      `• Current Value: $${portfolio.currentValue.toFixed(2)}\n` +
      `• Total Contributed: $${portfolio.totalContributed.toFixed(2)}\n` +
      `• Unrealized P&L: $${portfolio.unrealizedPnL.toFixed(2)}\n\n` +
      `Choose withdrawal percentage:`;

    const keyboard = KeyboardBuilder.withdrawalOptions(
      poolId,
      portfolio.currentValue
    );

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (error) {
    logger.error('Error showing withdrawal options:', error);
    await ctx.reply('⚠️ Unable to fetch withdrawal options.');
  }
}

async function showPoolPerformance(
  ctx: Context,
  poolId: string
): Promise<void> {
  try {
    const performanceResponse = await apiService.getPoolPerformance(
      poolId,
      '30D'
    );

    if (!performanceResponse.success || !performanceResponse.data) {
      await ctx.reply('❌ Unable to fetch performance data.');
      return;
    }

    const performance = performanceResponse.data;

    let message = `📈 <b>Pool Performance (30 Days)</b>\n\n`;

    // Add performance chart data visualization (text-based)
    const chartData = performance.data;
    if (chartData && chartData.length > 0) {
      const firstValue = chartData[0].value;
      const lastValue = chartData[chartData.length - 1].value;
      const totalReturn = ((lastValue - firstValue) / firstValue) * 100;

      message += `📊 <b>30-Day Summary:</b>\n`;
      message += `• Start Value: $${firstValue.toFixed(4)}\n`;
      message += `• Current Value: $${lastValue.toFixed(4)}\n`;
      message += `• Total Return: ${totalReturn.toFixed(2)}%\n\n`;

      // Simple text-based chart
      message += `📈 <b>Recent Trend:</b>\n`;
      const recentData = chartData.slice(-7); // Last 7 days
      recentData.forEach((point, index) => {
        const date = new Date(point.timestamp).toLocaleDateString();
        const change =
          index > 0
            ? ((point.value - recentData[index - 1].value) /
                recentData[index - 1].value) *
              100
            : 0;
        const arrow = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
        message += `${arrow} ${date}: $${point.value.toFixed(4)} (${change.toFixed(2)}%)\n`;
      });
    }

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: KeyboardBuilder.backButton(`pool_${poolId}`),
    });
  } catch (error) {
    logger.error('Error showing pool performance:', error);
    await ctx.reply('⚠️ Unable to fetch performance data.');
  }
}

async function showPoolTrades(ctx: Context, poolId: string): Promise<void> {
  try {
    const tradesResponse = await apiService.getRecentTrades(poolId, 10);

    if (!tradesResponse.success || !tradesResponse.data) {
      await ctx.reply('❌ Unable to fetch trading data.');
      return;
    }

    const trades = tradesResponse.data;

    if (trades.length === 0) {
      await ctx.editMessageText(
        '📈 <b>Recent Trades</b>\n\nNo recent trades found for this pool.',
        {
          parse_mode: 'HTML',
          reply_markup: KeyboardBuilder.backButton(`pool_${poolId}`),
        }
      );
      return;
    }

    let message = `📈 <b>Recent Trades (Last 10)</b>\n\n`;

    trades.forEach((trade, index) => {
      const date = new Date(trade.executedAt).toLocaleDateString();
      const time = new Date(trade.executedAt).toLocaleTimeString();
      const profitEmoji = trade.profit > 0 ? '💰' : '❌';

      message += `${profitEmoji} <b>Trade ${index + 1}</b>\n`;
      message += `• Asset: ${trade.asset}\n`;
      message += `• Route: ${trade.fromExchange} → ${trade.toExchange}\n`;
      message += `• Profit: $${trade.profit.toFixed(2)} (${trade.profitPercentage.toFixed(2)}%)\n`;
      message += `• Date: ${date} ${time}\n\n`;
    });

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: KeyboardBuilder.backButton(`pool_${poolId}`),
    });
  } catch (error) {
    logger.error('Error showing pool trades:', error);
    await ctx.reply('⚠️ Unable to fetch trading data.');
  }
}

async function showPoolParticipants(
  ctx: Context,
  poolId: string
): Promise<void> {
  try {
    const poolResponse = await apiService.getPool(poolId);

    if (!poolResponse.success || !poolResponse.data) {
      await ctx.reply('❌ Pool not found.');
      return;
    }

    const pool = poolResponse.data;

    const message =
      `👥 <b>Pool Participants</b>\n\n` +
      `🏊‍♂️ **${pool.name}**\n\n` +
      `👥 Total Participants: ${pool.participantCount}\n` +
      `💰 Total Pool Value: $${pool.totalValue.toLocaleString()}\n` +
      `📊 Average Contribution: $${(pool.totalValue / pool.participantCount).toFixed(2)}\n\n` +
      `💡 <b>Join this community of traders and start earning together!</b>`;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: KeyboardBuilder.backButton(`pool_${poolId}`),
    });
  } catch (error) {
    logger.error('Error showing pool participants:', error);
    await ctx.reply('⚠️ Unable to fetch participant data.');
  }
}
