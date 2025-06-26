import { Context } from 'telegraf';
import { apiService } from '../../services/api';
import { logger } from '../../utils/logger';
import { KeyboardBuilder } from '../keyboards';

export async function contributionCommand(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('❌ Unable to identify user.');
      return;
    }

    let amount: number | undefined;
    let poolId: string | undefined;

    if (ctx.message && 'text' in ctx.message) {
      const parts = ctx.message.text.split(' ');
      if (parts.length >= 2) {
        amount = parseFloat(parts[1]);
        poolId = parts[2]; // Optional pool ID
      }
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      await ctx.reply(
        '💰 <b>Make a Contribution</b>\n\n' +
          'Usage: `/contribute <amount> [pool_id]`\n\n' +
          'Examples:\n' +
          '• `/contribute 1000` - Contribute to your current pool\n' +
          '• `/contribute 500 pool_abc123` - Contribute to specific pool\n\n' +
          'Or browse pools to select one:',
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

    // If no pool specified, check user's session for current pool
    // This would typically be stored in session state
    if (!poolId) {
      await ctx.reply(
        '🔍 <b>Select a Pool</b>\n\n' +
          "Please specify which pool you'd like to contribute to:\n\n" +
          `💵 Amount: $${amount.toFixed(2)}\n\n` +
          'Browse available pools and select one:',
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

    // Validate pool exists
    const poolResponse = await apiService.getPool(poolId);
    if (!poolResponse.success || !poolResponse.data) {
      await ctx.reply(`❌ Pool "${poolId}" not found.`);
      return;
    }

    const pool = poolResponse.data;

    // Check minimum contribution
    if (amount < pool.minimumContribution) {
      await ctx.reply(
        `❌ Minimum contribution for ${pool.name} is $${pool.minimumContribution}.`
      );
      return;
    }

    // Calculate shares at current NAV
    const shares = amount / pool.performanceMetrics.nav;

    const confirmationMessage =
      `💰 <b>Confirm Contribution</b>\n\n` +
      `🏊‍♂️ Pool: ${pool.name}\n` +
      `💵 Amount: $${amount.toFixed(2)}\n` +
      `📊 Shares: ${shares.toFixed(4)}\n` +
      `📈 NAV: $${pool.performanceMetrics.nav.toFixed(4)}\n\n` +
      `⚡ Risk Level: ${pool.riskLevel}\n\n` +
      `Are you sure you want to proceed?`;

    const keyboard = KeyboardBuilder.confirmContribution(
      poolId,
      amount,
      shares
    );

    await ctx.reply(confirmationMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (error) {
    logger.error('Error in contribution command:', error);
    await ctx.reply('⚠️ Unable to process contribution. Please try again.');
  }
}

export async function withdrawalCommand(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('❌ Unable to identify user.');
      return;
    }

    let amount: number | undefined;
    let poolId: string | undefined;

    if (ctx.message && 'text' in ctx.message) {
      const parts = ctx.message.text.split(' ');
      if (parts.length >= 2) {
        amount = parseFloat(parts[1]);
        poolId = parts[2]; // Optional pool ID
      }
    }

    // Get user's portfolio to show available withdrawals
    const portfolioResponse = await apiService.getUserPortfolio(userId);

    if (
      !portfolioResponse.success ||
      !portfolioResponse.data ||
      portfolioResponse.data.length === 0
    ) {
      await ctx.reply(
        '💸 <b>Withdrawal Request</b>\n\n' +
          "You don't have any investments to withdraw from.\n\n" +
          'Make a contribution first to start earning!',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 Browse Pools', callback_data: 'menu_pools' }],
            ],
          },
        }
      );
      return;
    }

    const portfolios = portfolioResponse.data;

    if (!poolId && portfolios.length === 1) {
      // If user has only one investment, use that
      poolId = portfolios[0].poolId;
    }

    if (!poolId) {
      // Show user's investments to choose from
      let message = `💸 <b>Select Investment to Withdraw</b>\n\n`;

      portfolios.forEach((portfolio, index) => {
        message += `${index + 1}. Pool: ${portfolio.poolId}\n`;
        message += `   💰 Value: $${portfolio.currentValue.toFixed(2)}\n`;
        message += `   📊 Shares: ${portfolio.shares}\n\n`;
      });

      message += `Use: \`/withdraw <amount> [pool_id]\``;

      await ctx.reply(message, {
        parse_mode: 'HTML',
      });
      return;
    }

    // Find user's portfolio for the specified pool
    const portfolio = portfolios.find(p => p.poolId === poolId);
    if (!portfolio) {
      await ctx.reply(`❌ You don't have any shares in pool "${poolId}".`);
      return;
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      // Show withdrawal options
      const message =
        `💸 <b>Withdraw from Investment</b>\n\n` +
        `🏊‍♂️ Pool: ${poolId}\n` +
        `💼 Your Holdings:\n` +
        `• Current Value: $${portfolio.currentValue.toFixed(2)}\n` +
        `• Shares: ${portfolio.shares}\n` +
        `• Unrealized P&L: $${portfolio.unrealizedPnL.toFixed(2)}\n\n` +
        `Usage: \`/withdraw <amount> ${poolId}\`\n\n` +
        `Or use the buttons below:`;

      const keyboard = KeyboardBuilder.withdrawalOptions(
        poolId,
        portfolio.currentValue
      );

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
      return;
    }

    // Validate withdrawal amount
    if (amount > portfolio.currentValue) {
      await ctx.reply(
        `❌ Insufficient balance.\n\n` +
          `Available: $${portfolio.currentValue.toFixed(2)}\n` +
          `Requested: $${amount.toFixed(2)}`
      );
      return;
    }

    // Get pool info for current NAV
    const poolResponse = await apiService.getPool(poolId);
    if (!poolResponse.success || !poolResponse.data) {
      await ctx.reply(`❌ Unable to fetch pool information.`);
      return;
    }

    const pool = poolResponse.data;
    const sharesToSell = amount / pool.performanceMetrics.nav;

    const confirmationMessage =
      `💸 <b>Confirm Withdrawal</b>\n\n` +
      `🏊‍♂️ Pool: ${pool.name}\n` +
      `💵 Amount: $${amount.toFixed(2)}\n` +
      `📊 Shares to Sell: ${sharesToSell.toFixed(4)}\n` +
      `📈 Current NAV: $${pool.performanceMetrics.nav.toFixed(4)}\n\n` +
      `💼 After Withdrawal:\n` +
      `• Remaining Shares: ${(portfolio.shares - sharesToSell).toFixed(4)}\n` +
      `• Remaining Value: $${(portfolio.currentValue - amount).toFixed(2)}\n\n` +
      `⏱️ Processing time: 1-3 business days\n\n` +
      `Are you sure you want to proceed?`;

    const keyboard = KeyboardBuilder.confirmWithdrawal(poolId, amount);

    await ctx.reply(confirmationMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (error) {
    logger.error('Error in withdrawal command:', error);
    await ctx.reply('⚠️ Unable to process withdrawal. Please try again.');
  }
}

export async function processContribution(
  ctx: Context,
  poolId: string,
  amount: number
): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('❌ Unable to identify user.');
      return;
    }

    // Show processing message
    await ctx.editMessageText(
      '⏳ <b>Processing Contribution...</b>\n\n' +
        'Please wait while we process your contribution.',
      { parse_mode: 'HTML' }
    );

    // Call API to process contribution
    const contributionResponse = await apiService.contributeToPool(
      poolId,
      userId,
      amount
    );

    if (contributionResponse.success) {
      const successMessage =
        `✅ <b>Contribution Successful!</b>\n\n` +
        `💰 Amount: $${amount.toFixed(2)}\n` +
        `🏊‍♂️ Pool: ${poolId}\n` +
        `📊 Shares Received: ${contributionResponse.data?.shares?.toFixed(4) || 'N/A'}\n` +
        `🆔 Transaction ID: ${contributionResponse.data?.transactionId || 'N/A'}\n\n` +
        `Your contribution is now active and earning returns!`;

      await ctx.editMessageText(successMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💼 View Portfolio', callback_data: 'menu_portfolio' },
              { text: '📊 Pool Details', callback_data: `pool_${poolId}` },
            ],
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
          ],
        },
      });
    } else {
      await ctx.editMessageText(
        `❌ <b>Contribution Failed</b>\n\n` +
          `${contributionResponse.error || 'Unknown error occurred'}\n\n` +
          `Please try again or contact support if the issue persists.`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Try Again', callback_data: `contribute_${poolId}` }],
              [
                {
                  text: '💬 Contact Support',
                  callback_data: 'contact_support',
                },
              ],
            ],
          },
        }
      );
    }
  } catch (error) {
    logger.error('Error processing contribution:', error);

    await ctx.editMessageText(
      '❌ <b>Contribution Failed</b>\n\n' +
        'An error occurred while processing your contribution.\n\n' +
        'Please try again or contact support.',
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Try Again', callback_data: `contribute_${poolId}` }],
            [{ text: '💬 Contact Support', callback_data: 'contact_support' }],
          ],
        },
      }
    );
  }
}

export async function processWithdrawal(
  ctx: Context,
  poolId: string,
  amount: number
): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('❌ Unable to identify user.');
      return;
    }

    // Show processing message
    await ctx.editMessageText(
      '⏳ <b>Processing Withdrawal...</b>\n\n' +
        'Please wait while we process your withdrawal request.',
      { parse_mode: 'HTML' }
    );

    // Call API to process withdrawal
    const withdrawalResponse = await apiService.withdrawFromPool(
      poolId,
      userId,
      amount
    );

    if (withdrawalResponse.success) {
      const successMessage =
        `✅ <b>Withdrawal Request Submitted!</b>\n\n` +
        `💸 Amount: $${amount.toFixed(2)}\n` +
        `🏊‍♂️ Pool: ${poolId}\n` +
        `📊 Shares Sold: ${withdrawalResponse.data?.shares?.toFixed(4) || 'N/A'}\n` +
        `🆔 Request ID: ${withdrawalResponse.data?.requestId || 'N/A'}\n\n` +
        `⏱️ Processing Time: 1-3 business days\n` +
        `📧 You'll receive updates via notifications.\n\n` +
        `Your withdrawal is now in the processing queue.`;

      await ctx.editMessageText(successMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💼 View Portfolio', callback_data: 'menu_portfolio' },
              {
                text: '📋 Transaction History',
                callback_data: 'portfolio_transactions',
              },
            ],
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
          ],
        },
      });
    } else {
      await ctx.editMessageText(
        `❌ <b>Withdrawal Failed</b>\n\n` +
          `${withdrawalResponse.error || 'Unknown error occurred'}\n\n` +
          `Please try again or contact support if the issue persists.`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Try Again', callback_data: `withdraw_${poolId}` }],
              [
                {
                  text: '💬 Contact Support',
                  callback_data: 'contact_support',
                },
              ],
            ],
          },
        }
      );
    }
  } catch (error) {
    logger.error('Error processing withdrawal:', error);

    await ctx.editMessageText(
      '❌ <b>Withdrawal Failed</b>\n\n' +
        'An error occurred while processing your withdrawal.\n\n' +
        'Please try again or contact support.',
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Try Again', callback_data: `withdraw_${poolId}` }],
            [{ text: '💬 Contact Support', callback_data: 'contact_support' }],
          ],
        },
      }
    );
  }
}
