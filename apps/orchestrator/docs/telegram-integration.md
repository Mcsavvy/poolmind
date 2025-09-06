# Telegram Integration & Notifications

This document covers the Telegram integration features including automatic welcome/goodbye messages when users link/unlink their Telegram accounts.

## Environment Variables

Add these required environment variables to your `.env` file:

```bash
# Required Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username

# Optional Telegram Configuration
TELEGRAM_CHANNEL_ID=@your_channel_or_chat_id     # For broadcast messages
TELEGRAM_GROUP_LINK=https://t.me/your_group      # Welcome message group invitation
TELEGRAM_CHANNEL_LINK=https://t.me/your_channel  # Welcome message channel subscription
```

### Getting Your Bot Token

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` command
3. Follow the prompts to create your bot
4. Save the provided token as `TELEGRAM_BOT_TOKEN`
5. The bot username (without @) goes in `TELEGRAM_BOT_USERNAME`

### Optional Configuration

- **TELEGRAM_GROUP_LINK**: Link to your Telegram group that will be included in welcome messages
- **TELEGRAM_CHANNEL_LINK**: Link to your Telegram channel for updates and announcements
- **TELEGRAM_CHANNEL_ID**: Channel/chat ID for system-wide broadcasts (format: `@channelname` or numerical ID)

## Automatic Messages

### Welcome Message (When Linking Telegram)

When a user successfully links their Telegram account, they automatically receive:

- ✅ Confirmation of successful linking
- 📊 Information about what notifications they'll receive
- 🔗 Links to join your group and subscribe to your channel (if configured)
- 💡 Instructions on managing notification preferences

**Example Welcome Message:**

```
🔗 Telegram Connected Successfully!

Welcome to PoolMind, John! 🎉

Your Telegram account has been successfully linked to your PoolMind wallet.

📊 You'll now receive important updates about:
• Arbitrage opportunities
• Trading performance
• System announcements
• Security alerts

📢 Stay connected with our community:
• Join our group: https://t.me/poolmind_group
• Subscribe to our channel: https://t.me/poolmind_updates

💡 You can manage your notification preferences in your profile settings anytime.

Happy trading! 🚀
```

### Goodbye Message (When Unlinking Telegram)

When a user unlinks their Telegram account, they receive:

- 👋 Confirmation of unlinking
- 📱 Information about what notifications they'll stop receiving
- 🔄 Instructions on how to re-link if desired

**Example Goodbye Message:**

```
🔗 Telegram Disconnected

Goodbye, John! 👋

Your Telegram account has been unlinked from PoolMind.

📱 You will no longer receive:
• Trading notifications
• Arbitrage alerts
• System updates

🔄 You can always link your Telegram account again through your profile settings.

Thank you for being part of PoolMind! 💙
```

## Features

### Error Handling

- Messages are sent asynchronously to avoid blocking the linking/unlinking process
- If a notification fails to send, the core functionality (linking/unlinking) still succeeds
- Errors are logged for debugging but don't interfere with user experience

### Personalization

- Messages use the user's display name, username, or wallet address (with fallback logic)
- Dynamic content based on available configuration (group/channel links)
- Consistent branding with emojis and formatting

### Notification Preferences

- Respects user's existing notification preferences
- Users must have Telegram notifications enabled to receive these messages
- Links are only included if the corresponding environment variables are set

## Integration Points

### AuthService Methods

The integration is handled automatically in these methods:

- `linkTelegramAccount()`: Sends welcome message after successful linking
- `unlinkTelegramAccount()`: Sends goodbye message before unlinking

### Dependencies

- **NotificationsService**: Handles the actual message sending
- **ConfigService**: Retrieves environment variables for links
- **User Model**: Provides user display names and preferences

## Testing

To test the integration:

1. Ensure all environment variables are properly configured
2. Link a Telegram account through the API
3. Check that the welcome message is received on Telegram
4. Unlink the account and verify the goodbye message is sent
5. Monitor logs for any errors during the notification process

## Troubleshooting

### Common Issues

1. **Messages not being sent**
   - Verify `TELEGRAM_BOT_TOKEN` is correct
   - Check that the bot has permission to send messages to users
   - Ensure user has Telegram notifications enabled

2. **Links not appearing in welcome message**
   - Verify `TELEGRAM_GROUP_LINK` and `TELEGRAM_CHANNEL_LINK` are valid URLs
   - Check environment variable names are exactly as specified

3. **Authentication errors**
   - Ensure bot token is valid and not expired
   - Verify bot username matches the token

### Logs

Check application logs for notification-related errors:

```bash
# Look for these log patterns
Failed to send Telegram welcome message: [error details]
Failed to send Telegram goodbye message: [error details]
```

## Security Considerations

- Bot token should be kept secure and not exposed in client-side code
- Environment variables should not be committed to version control
- Consider rate limiting for notification sending if dealing with high volume
- Validate all user input before including in messages

## Future Enhancements

Potential improvements to consider:

- Customizable message templates
- Language localization support
- Rich message formatting with buttons/inline keyboards
- Welcome message scheduling/delays
- A/B testing for message content
- Analytics on message delivery and engagement
