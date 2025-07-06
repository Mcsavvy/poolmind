import { authService } from '../../services/auth';
import { apiService } from '../../services/api';
import { config } from '../../config/env';
import { logger, logError } from '../../utils/logger';
import { SessionContext } from '../middleware/session';

export async function profileCommand(ctx: SessionContext): Promise<void> {
  try {
    const authenticatedUser = authService.getAuthenticatedUser(ctx);

    if (!authenticatedUser) {
      await ctx.reply('🔐 You need to login to view your profile.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔐 Login', callback_data: 'authenticate' }],
          ],
        },
      });
      return;
    }

    // Refresh user profile to get latest data
    const refreshedUser = await authService.refreshUserProfile(ctx);
    const user = refreshedUser || authenticatedUser;

    const profileMessage =
      `👤 <b>Your Profile</b>\n\n` +
      `🆔 <b>User ID:</b> ${user.telegramId}\n` +
      `👤 <b>Name:</b> ${user.firstName || 'Not set'} ${user.lastName || ''}\n` +
      `📧 <b>Username:</b> @${user.username || 'Not set'}\n` +
      `💎 <b>Wallet:</b> ${user.walletAddress ? `${user.walletAddress.slice(0, 8)}...${user.walletAddress.slice(-8)}` : 'Not linked'}\n` +
      `✅ <b>KYC Status:</b> ${user.kycStatus ? user.kycStatus.charAt(0).toUpperCase() + user.kycStatus.slice(1) : 'Pending'}\n` +
      `🔔 <b>Notifications:</b> ${user.preferences?.notifications ? 'Enabled' : 'Disabled'}\n` +
      `🌐 <b>Language:</b> ${user.preferences?.language || 'en'}\n` +
      `📅 <b>Member since:</b> ${new Date(user.createdAt).toLocaleDateString()}\n`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✏️ Edit Profile', callback_data: 'profile_edit' },
          { text: '💎 Manage Wallet', callback_data: 'profile_wallet' },
        ],
        [
          { text: '🔔 Notifications', callback_data: 'profile_notifications' },
          { text: '🔄 Refresh', callback_data: 'profile_refresh' },
        ],
        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
      ],
    };

    await ctx.reply(profileMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (error) {
    logError('Error in profile command:', error);
    await ctx.reply('⚠️ Unable to load profile. Please try again.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Try Again', callback_data: 'profile_refresh' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
        ],
      },
    });
  }
}

export async function handleProfileCallback(
  ctx: SessionContext,
  action: string
): Promise<void> {
  try {
    logger.info(`Handling profile callback action: ${action}`);

    const user = authService.getAuthenticatedUser(ctx);

    if (!user) {
      logger.warn('User not authenticated for profile callback');
      await ctx.answerCbQuery('Please authenticate first');
      return;
    }

    switch (action) {
      case 'refresh':
        logger.info('Refreshing profile');
        await profileCommand(ctx);
        await ctx.answerCbQuery('Profile refreshed');
        break;

      case 'edit':
        logger.info('Showing edit profile options');
        await handleEditProfile(ctx);
        break;

      case 'wallet':
        logger.info('Showing wallet management');
        await handleWalletManagement(ctx);
        break;

      case 'notifications':
        logger.info('Showing notification settings');
        await handleNotificationSettings(ctx);
        break;

      default:
        logger.warn(`Unknown profile action: ${action}`);
        await ctx.answerCbQuery('Unknown action');
    }
  } catch (error) {
    logger.error('Error in profile callback:', error);
    await ctx.answerCbQuery('An error occurred');
  }
}

async function handleEditProfile(ctx: SessionContext): Promise<void> {
  const user = authService.getAuthenticatedUser(ctx);
  if (!user) return;

  const editMessage =
    `✏️ <b>Edit Profile</b>\n\n` +
    `Current Information:\n` +
    `👤 <b>First Name:</b> ${user.firstName || 'Not set'}\n` +
    `👤 <b>Last Name:</b> ${user.lastName || 'Not set'}\n\n` +
    `What would you like to update?`;

  await ctx.editMessageText(editMessage, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '👤 First Name', callback_data: 'edit_firstname' },
          { text: '👤 Last Name', callback_data: 'edit_lastname' },
        ],
        [{ text: '← Back to Profile', callback_data: 'profile_refresh' }],
      ],
    },
  });
}

async function handleWalletManagement(ctx: SessionContext): Promise<void> {
  const user = authService.getAuthenticatedUser(ctx);
  if (!user) return;

  const walletMessage = user.walletAddress
    ? `💎 <b>Wallet Management</b>\n\n` +
      `<b>Connected Wallet:</b>\n` +
      `${user.walletAddress}\n\n` +
      `Your Stacks wallet is connected and ready for transactions.\n\n` +
      `⚠️ <b>Important:</b> Only unlink your wallet if you want to connect a different one. This will affect your ability to make deposits and withdrawals.`
    : `💎 <b>Wallet Management</b>\n\n` +
      `No wallet connected.\n\n` +
      `Connect your Stacks wallet to:\n` +
      `• Make deposits to the pool\n` +
      `• Withdraw your earnings\n\n` +
      `Please ensure you have a Stacks wallet (like Xverse Wallet) installed.`;

  const keyboard = user.walletAddress
    ? {
        inline_keyboard: [
          [{ text: '🔓 Unlink Wallet', callback_data: 'wallet_unlink' }],
          [{ text: '← Back to Profile', callback_data: 'profile_refresh' }],
        ],
      }
    : {
        inline_keyboard: [
          [{ text: '🔗 Link Wallet', callback_data: 'wallet_link' }],
          [{ text: '❓ What is Stacks?', callback_data: 'wallet_info' }],
          [{ text: '← Back to Profile', callback_data: 'profile_refresh' }],
        ],
      };

  await ctx.editMessageText(walletMessage, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

export async function handleNotificationSettings(
  ctx: SessionContext
): Promise<void> {
  try {
    logger.info('Showing notification settings');

    const user = ctx.session?.user;
    if (!user) {
      logger.error('No user data in session for notification settings');
      await ctx.reply('❌ User data not available. Please authenticate first.');
      return;
    }

    // Get current notification preference - simplified to just one toggle
    let notificationsEnabled = true; // Default to enabled

    if (user.preferences?.notifications) {
      notificationsEnabled = user.preferences.notifications;
    }

    logger.info(
      `Profile notification setting: ${notificationsEnabled ? 'enabled' : 'disabled'}`
    );

    const notificationMessage =
      '🔔 <b>Notification Settings</b>\n\n' +
      'Enable or disable all notifications from PoolMind bot.\n\n' +
      `Current status: ${notificationsEnabled ? '✅ Enabled' : '❌ Disabled'}`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: `🔔 Notifications ${notificationsEnabled ? '✅' : '❌'}`,
            callback_data: 'toggle_notifications',
          },
        ],
        [{ text: '← Back to Profile', callback_data: 'profile_refresh' }],
      ],
    };

    if (ctx.callbackQuery) {
      await ctx.editMessageText(notificationMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(notificationMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }
  } catch (error) {
    logger.error('Error showing notification settings:', error);
    await ctx.reply(
      '❌ Error loading notification settings. Please try again.'
    );
  }
}

export async function handleToggleAllNotifications(
  ctx: SessionContext
): Promise<void> {
  try {
    logger.info('Handling toggle notifications');

    const user = ctx.session?.user;
    if (!user) {
      logger.error('No user data in session for toggle notifications');
      await ctx.answerCbQuery('❌ User data not available');
      return;
    }

    // Get current notification preference
    let currentNotificationsEnabled = true; // Default to enabled

    if (user.preferences?.notifications) {
      currentNotificationsEnabled = user.preferences.notifications;
    }

    logger.info(
      `Current notifications enabled: ${currentNotificationsEnabled}`
    );

    // Toggle the notification setting
    const newValue = !currentNotificationsEnabled;

    logger.info(
      `Toggling notifications from ${currentNotificationsEnabled} to ${newValue}`
    );

    const profileUpdate = {
      preferences: {
        notifications: newValue,
      },
    };

    logger.info(
      `Sending notifications toggle update:`,
      JSON.stringify(profileUpdate, null, 2)
    );

    const updatedUser = await authService.updateUserProfile(ctx, profileUpdate);

    if (updatedUser) {
      logger.info('Notifications toggle updated successfully');
      await ctx.answerCbQuery(
        newValue
          ? 'All notifications enabled ✅'
          : 'All notifications disabled ❌'
      );
      await handleNotificationSettings(ctx);
    } else {
      logger.error('Failed to update notification preference');
      await ctx.answerCbQuery('❌ Failed to update notification preference');
    }
  } catch (error) {
    logger.error('Error toggling notifications:', error);
    await ctx.answerCbQuery('❌ Error updating notification preference');
  }
}

export async function handleWalletCallback(
  ctx: SessionContext,
  action: string
): Promise<void> {
  try {
    const user = authService.getAuthenticatedUser(ctx);
    if (!user) {
      await ctx.answerCbQuery('Please authenticate first');
      return;
    }

    // Ensure JWT token is set in API service for authenticated requests
    if (!authService.ensureApiToken(ctx)) {
      await ctx.answerCbQuery('Authentication token missing. Please restart the bot.');
      return;
    }

    switch (action) {
      case 'link':
        await ctx.answerCbQuery();
        try {
          logger.info('Generating wallet connection URL');
          const response = await apiService.getWalletConnectUrl();

          if (response.url) {
            await ctx.reply(
              '🔗 <b>Link Your Stacks Wallet</b>\n\n' +
                'Click the link below to securely connect your Stacks wallet through our web interface.\n\n' +
                response.url,
              {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: '← Back to Wallet',
                        callback_data: 'profile_wallet',
                      },
                    ],
                  ],
                },
              }
            );
          } else {
            logger.error('Failed to generate wallet connection URL');
            await ctx.reply(
              '❌ Unable to generate wallet connection link. Please try again later.',
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🔄 Try Again', callback_data: 'wallet_link' }],
                    [
                      {
                        text: '← Back to Wallet',
                        callback_data: 'profile_wallet',
                      },
                    ],
                  ],
                },
              }
            );
          }
        } catch (error) {
          logger.error('Error generating wallet connection URL:', error);
          await ctx.reply(
            '❌ Error generating wallet connection link. Please try again later.',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔄 Try Again', callback_data: 'wallet_link' }],
                  [
                    {
                      text: '← Back to Wallet',
                      callback_data: 'profile_wallet',
                    },
                  ],
                ],
              },
            }
          );
        }
        break;

      case 'unlink':
        try {
          const response = await apiService.unlinkWallet();
          if (response.success) {
            await authService.refreshUserProfile(ctx);
            await ctx.answerCbQuery('Wallet unlinked successfully');
            await handleWalletManagement(ctx);
          } else {
            await ctx.answerCbQuery('Failed to unlink wallet');
          }
        } catch (error) {
          logger.error('Error unlinking wallet:', error);
          await ctx.answerCbQuery('Error unlinking wallet');
        }
        break;

      case 'info':
        await ctx.editMessageText(
          '❓ <b>About Stacks Blockchain</b>\n\n' +
            'Stacks is a layer-1 blockchain that brings smart contracts and decentralized apps to Bitcoin.\n\n' +
            '🔹 <b>Why Stacks?</b>\n' +
            '• Security of Bitcoin\n' +
            '• Smart contract capabilities\n' +
            '• Lower transaction fees\n' +
            '• Growing DeFi ecosystem\n\n' +
            '🔹 <b>Recommended Wallets:</b>\n' +
            '• Hiro Wallet (Web & Mobile)\n' +
            '• Xverse Wallet\n' +
            '• Leather Wallet\n\n' +
            'Visit stacks.org to learn more.',
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🌐 Visit Stacks.org', url: 'https://stacks.org' }],
                [{ text: '← Back to Wallet', callback_data: 'profile_wallet' }],
              ],
            },
          }
        );
        break;

      default:
        await ctx.answerCbQuery('Unknown wallet action');
    }
  } catch (error) {
    logError('Error in wallet callback:', error);
    await ctx.answerCbQuery('An error occurred');
  }
}
