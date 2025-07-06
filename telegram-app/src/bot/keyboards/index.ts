import { InlineKeyboardMarkup } from 'telegraf/types';

export class KeyboardBuilder {
  static mainMenu(authenticated: boolean = true): InlineKeyboardMarkup {
    if (authenticated) {
      return {
        inline_keyboard: [
          [{ text: '👤 View Profile', callback_data: 'profile_refresh' }],
        ],
      };
    }
    return {
      inline_keyboard: [[{ text: '🔐 Login', callback_data: 'authenticate' }]],
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

  static backButton(callbackData: string): InlineKeyboardMarkup {
    return {
      inline_keyboard: [[{ text: '◀️ Back', callback_data: callbackData }]],
    };
  }
}
