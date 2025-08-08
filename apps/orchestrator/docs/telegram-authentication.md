# Telegram Authentication Setup

This guide explains how to set up Telegram login for PoolMind authentication.

## Overview

PoolMind supports Telegram login as a **secondary authentication method** that users can enable after creating their account with a Stacks wallet. This provides users with an additional convenient login option while maintaining wallet-first security.

## Setup Process

### 1. Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the prompts to create your bot:
   - Choose a name (e.g., "PoolMind Login")
   - Choose a username ending in 'bot' (e.g., "poolmind_login_bot")
4. Save the bot token provided by BotFather

### 2. Configure Bot Domain

1. Send `/setdomain` command to @BotFather
2. Select your bot from the list
3. Enter your domain (e.g., `poolmind.app` or `localhost:3000` for development)

### 3. Environment Configuration

Add the following environment variables to your `.env` files:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username
```

### 4. Update Bot Profile

- Set a profile picture that matches your app's branding
- Update the bot description to explain its purpose
- Configure bot commands if needed

## Implementation Flow

### User Flow
1. User creates account with Stacks wallet (primary authentication)
2. User goes to profile settings
3. User can enable Telegram login by clicking "Connect Telegram"
4. User authenticates with Telegram widget
5. Account is linked and user can now login with either wallet or Telegram

### Technical Flow
1. Frontend displays Telegram login widget after wallet account creation
2. Widget handles Telegram OAuth flow
3. Backend validates Telegram auth data using bot token
4. System links Telegram ID to existing user account
5. Future logins can use either wallet signature or Telegram auth

## Security Considerations

- Telegram authentication is always **secondary** to wallet authentication
- Users must first create an account with wallet
- Bot token must be kept secure
- Telegram auth data is validated using HMAC-SHA-256
- Users can unlink Telegram authentication at any time

## Development Testing

For local development:
1. Use ngrok or similar to expose localhost
2. Configure bot domain to your ngrok URL
3. Test with actual Telegram account

## Production Deployment

1. Ensure domain is properly configured with BotFather
2. Use HTTPS for production domain
3. Store bot token securely (environment variable)
4. Monitor bot usage through BotFather analytics
