import { Context } from 'telegraf';
import { apiService } from '../../services/api';
import { logger, logError } from '../../utils/logger';
import { KeyboardBuilder } from '../keyboards';
// @ts-ignore
import { config } from '../../config/env';

export async function startCommand(ctx: Context): Promise<void> {
  try {
    const user = ctx.from;
    if (!user) {
      await ctx.reply('Unable to identify user. Please try again.');
      return;
    }

    logger.info(
      `Start command from user: ${user.id} (${user.username || user.first_name})`
    );

    // Check if user exists, create if new
    let userData;
    try {
      const response = await apiService.getUserProfile(user.id);
      userData = response.data;
    } catch (error) {
      // User doesn't exist, create new user
      logger.info(`Creating new user: ${user.id}`);

      const newUserData = {
        telegramId: user.id,
        username: user.username!,
        firstName: user.first_name,
        lastName: user.last_name,
        isKycVerified: false,
        preferences: {
          notifications: {
            tradeAlerts: true,
            profitDistributions: true,
            poolUpdates: true,
            systemAlerts: true,
          },
          language: user.language_code || 'en',
          timezone: 'UTC',
        },
      };

      const createResponse = await apiService.createUser(newUserData);
      userData = createResponse.data;
    }

    // Get pools overview for welcome message
    const poolsResponse = await apiService.getPools(1, 3);
    const topPools = poolsResponse.data;

    const isNewUser = !userData;

    let welcomeMessage = '';

    if (isNewUser) {
      welcomeMessage =
        `🎉 <b>Welcome to PoolMind!</b>\n\n` +
        `Hi ${user.first_name || user.username}! I'm your gateway to the world of ` +
        `pooled cross-exchange arbitrage trading.\n\n` +
        `🔹 <b>What is PoolMind?</b>\n` +
        `PoolMind allows multiple users to contribute capital to shared trading pools ` +
        `managed by AI agents. Our algorithms execute profitable arbitrage trades ` +
        `across different exchanges, and profits are distributed transparently.\n\n` +
        `🔹 <b>Getting Started:</b>\n` +
        `• Browse available pools with different risk profiles\n` +
        `• Contribute funds to pools that match your strategy\n` +
        `• Track your performance in real-time\n` +
        `• Withdraw your share anytime\n\n`;
    } else {
      welcomeMessage =
        `👋 <b>Welcome back, ${user.first_name || user.username}!</b>\n\n` +
        `Ready to continue your arbitrage trading journey?\n\n`;
    }

    // Add top pools information
    if (topPools.length > 0) {
      welcomeMessage += `📊 <b>Top Performing Pools:</b>\n`;

      topPools.forEach(pool => {
        const riskEmoji =
          pool.riskLevel === 'LOW'
            ? '🟢'
            : pool.riskLevel === 'MEDIUM'
              ? '🟡'
              : '🔴';
        const monthlyReturn = (
          pool.performanceMetrics.monthlyReturn * 100
        ).toFixed(1);
        const totalValue = pool.totalValue.toLocaleString();

        welcomeMessage += `${riskEmoji} <b>${pool.name}</b>\n`;
        welcomeMessage += `   💰 $${totalValue} • 📈 +${monthlyReturn}% (30d)\n`;
        welcomeMessage += `   👥 ${pool.participantCount} participants\n\n`;
      });
    }

    welcomeMessage += `Choose an option below to get started:`;

    // Additional setup for new users
    if (isNewUser) {
      welcomeMessage += `\n\n💡 <b>Tip:</b> Use the Web App for the best experience with charts and detailed analytics!`;
    }

    const keyboard = KeyboardBuilder.mainMenu();

    await ctx.reply(welcomeMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    // Send additional information for new users
    if (isNewUser) {
      setTimeout(async () => {
        const infoMessage =
          `🛡️ <b>Security & Compliance</b>\n\n` +
          `Your security is our priority:\n` +
          `• All funds are held in secure, regulated exchanges\n` +
          `• Real-time transparency of all trades\n` +
          `• Withdraw your share anytime\n` +
          `• No hidden fees, everything is disclosed upfront\n\n` +
          `📈 <b>How It Works:</b>\n` +
          `1. AI monitors price differences across exchanges\n` +
          `2. When profitable opportunities arise, trades are executed\n` +
          `3. Profits are distributed proportionally to your shares\n` +
          `4. You can track everything in real-time\n\n` +
          `Ready to start? Browse our pools or check out the Web App!`;

        await ctx.reply(infoMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔍 Browse Pools', callback_data: 'menu_pools' },
                {
                  text: '📱 Web App',
                  web_app: { url: 'https://t.me/poolmind_bot/app' },
                },
              ],
            ],
          },
        });
      }, 2000);
    }
  } catch (error) {
    logError('Error in start command:', error);

    await ctx.reply(
      '⚠️ Sorry, there was an error processing your request. Please try again in a moment.\n\n' +
        'If the problem persists, please contact our support team.',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Try Again', callback_data: 'start' }],
            [{ text: '💬 Contact Support', callback_data: 'contact_support' }],
          ],
        },
      }
    );
  }
}

export async function helpCommand(ctx: Context): Promise<void> {
  const helpMessage =
    `🤖 <b>PoolMind Bot Commands</b>\n\n` +
    `<b>Pool Management:</b>\n` +
    `/pools - Browse available trading pools\n` +
    `/join [pool_id] - Join a specific pool\n` +
    `/contribute [amount] - Add funds to your current pool\n` +
    `/withdraw [amount] - Request withdrawal from pool\n\n` +
    `<b>Portfolio & Performance:</b>\n` +
    `/balance - Show your portfolio and shares\n` +
    `/performance - View your performance metrics\n` +
    `/trades - Recent trading activity\n` +
    `/transactions - Your contribution/withdrawal history\n\n` +
    `<b>Information:</b>\n` +
    `/pool_info [pool_id] - Detailed pool information\n` +
    `/status - System status and uptime\n` +
    `/settings - Manage your preferences\n\n` +
    `<b>Quick Actions:</b>\n` +
    `Use the menu buttons below for easy navigation, or open the Web App for the full experience!\n\n` +
    `💡 <b>Pro Tip:</b> The Web App offers advanced charts, detailed analytics, and better user experience!`;

  await ctx.reply(helpMessage, {
    parse_mode: 'HTML',
    reply_markup: KeyboardBuilder.mainMenu(),
  });
}
