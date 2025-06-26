import { InlineKeyboardMarkup, KeyboardButton } from 'telegraf/types';
import { Pool } from '../../types';

export class KeyboardBuilder {
  static mainMenu(): InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '📊 View Pools', callback_data: 'menu_pools' },
          { text: '💼 Portfolio', callback_data: 'menu_portfolio' },
        ],
        [
          { text: '📈 Trading Activity', callback_data: 'menu_trading' },
          { text: '⚙️ Settings', callback_data: 'menu_settings' },
        ],
        // [
        //   {
        //     text: '📱 Open Web App',
        //     web_app: { url: 'https://t.me/poolmind_bot/app' },
        //   },
        // ],
      ],
    };
  }

  static poolsList(
    pools: Pool[],
    page: number = 1,
    limit: number = 5
  ): InlineKeyboardMarkup {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const poolsToShow = pools.slice(startIndex, endIndex);

    const keyboard: any[] = [];

    // Pool buttons
    poolsToShow.forEach((pool, index) => {
      const riskEmoji =
        pool.riskLevel === 'LOW'
          ? '🟢'
          : pool.riskLevel === 'MEDIUM'
            ? '🟡'
            : '🔴';
      const returnPercentage = (
        pool.performanceMetrics.monthlyReturn * 100
      ).toFixed(1);

      keyboard.push([
        {
          text: `${riskEmoji} ${pool.name} | ${returnPercentage}% | $${pool.totalValue.toLocaleString()}`,
          callback_data: `pool_${pool.id}`,
        },
      ]);
    });

    // Pagination
    if (pools.length > limit) {
      const paginationRow: { text: string; callback_data: string }[] = [];

      if (page > 1) {
        paginationRow.push({
          text: '◀️ Previous',
          callback_data: `pools_page_${page - 1}`,
        });
      }

      paginationRow.push({
        text: `${page}/${Math.ceil(pools.length / limit)}`,
        callback_data: 'ignore',
      });

      if (endIndex < pools.length) {
        paginationRow.push({
          text: 'Next ▶️',
          callback_data: `pools_page_${page + 1}`,
        });
      }

      keyboard.push(paginationRow);
    }

    keyboard.push([{ text: '🔄 Refresh', callback_data: 'pools_refresh' }]);
    keyboard.push([{ text: '🏠 Main Menu', callback_data: 'main_menu' }]);

    return { inline_keyboard: keyboard };
  }

  static poolDetails(
    pool: Pool,
    userHasShares: boolean = false
  ): InlineKeyboardMarkup {
    const keyboard: any[] = [
      [
        { text: '💰 Contribute', callback_data: `contribute_${pool.id}` },
        { text: '📊 Performance', callback_data: `performance_${pool.id}` },
      ],
      [
        { text: '📈 Live Trades', callback_data: `trades_${pool.id}` },
        { text: '👥 Participants', callback_data: `participants_${pool.id}` },
      ],
    ];

    if (userHasShares) {
      keyboard.unshift([
        { text: '💸 Withdraw', callback_data: `withdraw_${pool.id}` },
      ]);
    }

    keyboard.push([{ text: '◀️ Back to Pools', callback_data: 'menu_pools' }]);
    keyboard.push([{ text: '🏠 Main Menu', callback_data: 'main_menu' }]);

    return { inline_keyboard: keyboard };
  }

  static portfolioMenu(): InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '💼 Holdings', callback_data: 'portfolio_holdings' },
          { text: '📊 Performance', callback_data: 'portfolio_performance' },
        ],
        [
          { text: '📋 Transactions', callback_data: 'portfolio_transactions' },
          { text: '💰 Total Value', callback_data: 'portfolio_value' },
        ],
        [{ text: '🔄 Refresh', callback_data: 'portfolio_refresh' }],
        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
      ],
    };
  }

  static contributionAmounts(poolId: string): InlineKeyboardMarkup {
    const amounts = [100, 500, 1000, 2500, 5000];
    const keyboard: any[] = [];

    // Amount buttons in rows of 2
    for (let i = 0; i < amounts.length; i += 2) {
      const row: { text: string; callback_data: string }[] = [];
      row.push({
        text: `$${amounts[i]}`,
        callback_data: `contribute_amount_${poolId}_${amounts[i]}`,
      });

      if (i + 1 < amounts.length) {
        row.push({
          text: `$${amounts[i + 1]}`,
          callback_data: `contribute_amount_${poolId}_${amounts[i + 1]}`,
        });
      }

      keyboard.push(row);
    }

    keyboard.push([
      {
        text: '💬 Custom Amount',
        callback_data: `contribute_custom_${poolId}`,
      },
    ]);
    keyboard.push([{ text: '◀️ Back', callback_data: `pool_${poolId}` }]);

    return { inline_keyboard: keyboard };
  }

  static confirmContribution(
    poolId: string,
    amount: number,
    shares: number
  ): InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          {
            text: '✅ Confirm Contribution',
            callback_data: `confirm_contribute_${poolId}_${amount}`,
          },
        ],
        [{ text: '❌ Cancel', callback_data: `pool_${poolId}` }],
      ],
    };
  }

  static withdrawalOptions(
    poolId: string,
    maxAmount: number
  ): InlineKeyboardMarkup {
    const percentages = [25, 50, 75, 100];
    const keyboard: any[] = [];

    percentages.forEach(percentage => {
      const amount = (maxAmount * percentage) / 100;
      keyboard.push([
        {
          text: `${percentage}% ($${amount.toFixed(2)})`,
          callback_data: `withdraw_amount_${poolId}_${amount}`,
        },
      ]);
    });

    keyboard.push([
      { text: '💬 Custom Amount', callback_data: `withdraw_custom_${poolId}` },
    ]);
    keyboard.push([{ text: '◀️ Back', callback_data: `pool_${poolId}` }]);

    return { inline_keyboard: keyboard };
  }

  static confirmWithdrawal(
    poolId: string,
    amount: number
  ): InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          {
            text: '✅ Confirm Withdrawal',
            callback_data: `confirm_withdraw_${poolId}_${amount}`,
          },
        ],
        [{ text: '❌ Cancel', callback_data: `pool_${poolId}` }],
      ],
    };
  }

  static settingsMenu(): InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '🔔 Notifications', callback_data: 'settings_notifications' },
          { text: '🌐 Language', callback_data: 'settings_language' },
        ],
        [
          { text: '🕐 Timezone', callback_data: 'settings_timezone' },
          { text: '🔐 Security', callback_data: 'settings_security' },
        ],
        [{ text: '📊 Display Options', callback_data: 'settings_display' }],
        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
      ],
    };
  }

  static notificationSettings(): InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '🔔 Trade Alerts', callback_data: 'toggle_trade_alerts' },
          {
            text: '💰 Profit Notifications',
            callback_data: 'toggle_profit_notifications',
          },
        ],
        [
          { text: '👥 Pool Updates', callback_data: 'toggle_pool_updates' },
          { text: '⚠️ System Alerts', callback_data: 'toggle_system_alerts' },
        ],
        [{ text: '◀️ Back to Settings', callback_data: 'menu_settings' }],
      ],
    };
  }

  static adminMenu(): InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '➕ Create Pool', callback_data: 'admin_create_pool' },
          { text: '⚙️ Manage Pools', callback_data: 'admin_manage_pools' },
        ],
        [
          { text: '📊 Analytics', callback_data: 'admin_analytics' },
          { text: '👥 User Management', callback_data: 'admin_users' },
        ],
        [{ text: '📈 System Status', callback_data: 'admin_status' }],
        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
      ],
    };
  }

  static confirmAction(action: string, id: string): InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '✅ Confirm', callback_data: `confirm_${action}_${id}` },
          { text: '❌ Cancel', callback_data: 'main_menu' },
        ],
      ],
    };
  }

  static backButton(callbackData: string): InlineKeyboardMarkup {
    return {
      inline_keyboard: [[{ text: '◀️ Back', callback_data: callbackData }]],
    };
  }

  static closeButton(): InlineKeyboardMarkup {
    return {
      inline_keyboard: [[{ text: '❌ Close', callback_data: 'close_message' }]],
    };
  }

  static shareButton(text: string, url: string): InlineKeyboardMarkup {
    return {
      inline_keyboard: [[{ text: `📤 ${text}`, url: url }]],
    };
  }
}
