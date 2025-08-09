# Notifications Service

The NotificationsService provides a comprehensive way to send Telegram notifications to users in the PoolMind platform. It respects user notification preferences and supports various notification types.

## Features

- ✅ Send notifications to specific users by ID or Telegram ID
- ✅ Send notifications to users by role (admin, moderator, user)
- ✅ Broadcast notifications to all eligible users
- ✅ Send notifications to a configured Telegram channel
- ✅ Respects user notification preferences
- ✅ Rate limiting and batching to respect Telegram limits
- ✅ Comprehensive error handling and reporting
- ✅ Multiple notification types with custom emojis

## Configuration

Add these environment variables to your `.env` file:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_CHANNEL_ID=@your_channel_or_chat_id  # Optional, for broadcast messages
```

## Usage Examples

### Basic Usage

```typescript
import { NotificationsService, NotificationType } from './notifications';

@Injectable()
export class SomeService {
  constructor(private notificationsService: NotificationsService) {}

  async notifyUser() {
    // Send to a specific user
    const result = await this.notificationsService.sendToUser('user-id', {
      type: NotificationType.SYSTEM,
      title: 'Welcome!',
      body: 'Thank you for joining PoolMind.',
    });

    console.log(`Sent: ${result.sentCount}, Failed: ${result.failedCount}`);
  }
}
```

### Notification Types

```typescript
enum NotificationType {
  SECURITY = 'security',     // 🔒 Security alerts
  UPDATE = 'update',         // 📢 System updates
  MARKETING = 'marketing',   // 🎯 Marketing messages
  SYSTEM = 'system',         // ⚙️ System notifications
  TRADING = 'trading',       // 📈 Trading updates
  ARBITRAGE = 'arbitrage',   // ⚡ Arbitrage notifications
}
```

### Send to Different Targets

```typescript
// Send to specific user
await notificationsService.sendToUser('userId', message);

// Send to user by Telegram ID
await notificationsService.sendToTelegramUser(123456789, message);

// Send to all admins
await notificationsService.sendToRole('admin', message);

// Send to all eligible users
await notificationsService.sendToAllUsers(message);

// Send to configured channel
await notificationsService.sendToChannel(message);
```

### Utility Methods

```typescript
// Simple message
await notificationsService.sendSimpleMessage(
  'userId',
  'Title',
  'Body text',
  NotificationType.SYSTEM
);

// Security alert to admins
await notificationsService.sendSecurityAlert(
  'Security Breach',
  'Unusual activity detected on user account.'
);

// System update to all users
await notificationsService.sendSystemUpdate(
  'Maintenance Window',
  'System will be down for maintenance from 2-4 AM UTC.'
);

// Trading update
await notificationsService.sendTradingUpdate(
  'New Arbitrage Opportunity',
  'High-yield opportunity detected in BTC/STX pair.',
  'admin' // Optional: target specific role
);
```

### Advanced Options

```typescript
const message = {
  type: NotificationType.SECURITY,
  title: 'Security Alert',
  body: 'Your account was accessed from a new device.',
  options: {
    parseMode: 'Markdown' as const,
    disablePreview: true,
    silent: false, // Don't silence security alerts
  }
};
```

## Response Format

All methods return a `NotificationResult`:

```typescript
interface NotificationResult {
  success: boolean;        // Overall success status
  sentCount: number;       // Number of successfully sent notifications
  failedCount: number;     // Number of failed notifications
  errors: Array<{          // Details of any errors
    userId?: string;
    telegramId?: number;
    error: string;
  }>;
}
```

## User Eligibility

Users receive notifications only if:
1. User account is active (`isActive: true`)
2. User has Telegram linked (`telegramAuth.telegramId` exists)
3. User has Telegram notifications enabled (`notificationPreferences.telegram: true`)

## Rate Limiting

The service automatically handles Telegram rate limits:
- Sends notifications in batches of 30 (Telegram's ~30 messages/second limit)
- Adds 1-second delays between batches
- Uses `Promise.allSettled()` to handle individual failures gracefully

## Error Handling

- Individual notification failures don't stop the batch
- Detailed error reporting in the response
- Comprehensive logging for debugging
- Graceful handling of missing Telegram links or disabled preferences

## Integration with Other Services

```typescript
@Injectable()
export class UserService {
  constructor(private notificationsService: NotificationsService) {}

  async createUser(userData) {
    const user = await this.create(userData);
    
    // Welcome notification
    await this.notificationsService.sendSimpleMessage(
      user._id.toString(),
      'Welcome to PoolMind!',
      'Your account has been created successfully.',
      NotificationType.SYSTEM
    );

    return user;
  }
}
```
