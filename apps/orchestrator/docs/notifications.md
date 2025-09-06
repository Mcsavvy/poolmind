# Notifications Service

The NotificationsService provides a comprehensive way to send both Telegram and in-app notifications to users in the PoolMind platform. It respects user notification preferences and supports various notification types with flexible targeting options.

## Features

### Telegram Notifications

- ✅ Send notifications to specific users by ID or Telegram ID
- ✅ Send notifications to users by role (admin, moderator, user)
- ✅ Broadcast notifications to all eligible users
- ✅ Send notifications to a configured Telegram channel
- ✅ Respects user notification preferences
- ✅ Rate limiting and batching to respect Telegram limits
- ✅ Comprehensive error handling and reporting
- ✅ Multiple notification types with custom emojis

### In-App Notifications

- ✅ Create notifications stored in database with read/unread tracking
- ✅ Flexible targeting: user-specific, role-based, or broadcast
- ✅ Rich metadata support (action URLs, related entities, custom data)
- ✅ Priority levels (low, normal, high, urgent)
- ✅ Expiration support for temporary notifications
- ✅ Comprehensive statistics and analytics
- ✅ Queue-based async processing for high-volume scenarios
- ✅ User preference management (enable/disable, delivery frequency)

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
  SECURITY = 'security', // 🔒 Security alerts
  UPDATE = 'update', // 📢 System updates
  MARKETING = 'marketing', // 🎯 Marketing messages
  SYSTEM = 'system', // ⚙️ System notifications
  TRADING = 'trading', // 📈 Trading updates
  ARBITRAGE = 'arbitrage', // ⚡ Arbitrage notifications
  TRANSACTION = 'transaction', // 💰 Transaction updates
}
```

### Priority Levels

```typescript
enum NotificationPriority {
  LOW = 'low', // 📝 Low priority notifications
  NORMAL = 'normal', // 📋 Standard notifications
  HIGH = 'high', // ⚠️ Important notifications
  URGENT = 'urgent', // 🚨 Critical notifications
}
```

### Target Types

```typescript
enum NotificationTargetType {
  USER = 'user', // Send to specific user
  ROLE = 'role', // Send to users with specific role
  BROADCAST = 'broadcast', // Send to all eligible users
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

### In-App Notification Methods

```typescript
// Create immediate in-app notification
await notificationsService.createInAppNotification({
  type: NotificationType.TRANSACTION,
  title: 'Transaction Confirmed',
  body: 'Your deposit has been confirmed',
  targetType: NotificationTargetType.USER,
  targetDetails: { userId: 'user123' },
  priority: NotificationPriority.HIGH,
  metadata: {
    relatedEntityType: 'transaction',
    relatedEntityId: 'tx123',
    actionUrl: '/transactions/tx123',
    actionText: 'View Transaction',
  },
});

// Queue in-app notification for specific user
await notificationsService.queueInAppNotificationForUser(
  'user123',
  'Welcome!',
  'Thank you for joining PoolMind',
  NotificationType.SYSTEM,
  {
    actionUrl: '/profile',
    actionText: 'Complete Profile',
  },
);

// Queue in-app notification for role
await notificationsService.queueInAppNotificationForRole(
  'admin',
  'Security Alert',
  'Unusual activity detected',
  NotificationType.SECURITY,
  { priority: NotificationPriority.URGENT },
);

// Queue broadcast notification
await notificationsService.queueInAppBroadcastNotification(
  'System Update',
  'New features are now available',
  NotificationType.UPDATE,
);

// Queue transaction notification with metadata
await notificationsService.queueTransactionNotification(
  'user123',
  'Transaction Pending',
  'Your withdrawal is being processed',
  'tx456',
  {
    actionUrl: '/transactions/tx456',
    actionText: 'Track Progress',
  },
);
```

### Utility Methods

```typescript
// Simple message
await notificationsService.sendSimpleMessage(
  'userId',
  'Title',
  'Body text',
  NotificationType.SYSTEM,
);

// Security alert to admins
await notificationsService.sendSecurityAlert(
  'Security Breach',
  'Unusual activity detected on user account.',
);

// System update to all users
await notificationsService.sendSystemUpdate(
  'Maintenance Window',
  'System will be down for maintenance from 2-4 AM UTC.',
);

// Trading update
await notificationsService.sendTradingUpdate(
  'New Arbitrage Opportunity',
  'High-yield opportunity detected in BTC/STX pair.',
  'admin', // Optional: target specific role
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
  },
};
```

## Response Format

All methods return a `NotificationResult`:

```typescript
interface NotificationResult {
  success: boolean; // Overall success status
  sentCount: number; // Number of successfully sent notifications
  failedCount: number; // Number of failed notifications
  errors: Array<{
    // Details of any errors
    userId?: string;
    telegramId?: number;
    error: string;
  }>;
}
```

## User Eligibility

### Telegram Notifications

Users receive Telegram notifications only if:

1. User account is active (`isActive: true`)
2. User has Telegram linked (`telegramAuth.telegramId` exists)
3. User has Telegram notifications enabled (`notificationPreferences.telegram: true`)

### In-App Notifications

Users receive in-app notifications only if:

1. User account is active (`isActive: true`)
2. User has in-app notifications enabled (`notificationPreferences.inApp.enabled: true`)

**Note:** In-app notifications are simpler - users can only toggle them on/off globally. All notification types are allowed when enabled.

### User Preferences Structure

```typescript
interface UserNotificationPreferences {
  email: boolean; // Email notifications
  telegram: boolean; // Telegram notifications
  inApp: {
    enabled: boolean; // In-app notifications on/off
    digestFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
  };
}
```

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

## In-App Notification API Endpoints

### User Endpoints

#### Get In-App Notifications

```http
GET /notifications/in-app
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `limit` (optional): Number of notifications to return (max 100, default: 50)
- `offset` (optional): Number of notifications to skip (default: 0)
- `unreadOnly` (optional): Only return unread notifications (default: false)
- `types` (optional): Filter by notification types (array)
- `priority` (optional): Filter by priority level

**Response:**

```json
{
  "notifications": [
    {
      "id": "notification_id",
      "type": "transaction",
      "title": "Transaction Confirmed",
      "body": "Your deposit has been confirmed",
      "priority": "high",
      "createdAt": "2024-01-15T10:30:00Z",
      "userNotification": {
        "id": "user_notification_id",
        "isRead": false,
        "readAt": null,
        "metadata": {
          "starred": false,
          "archived": false
        }
      }
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  },
  "unreadCount": 25
}
```

#### Get Unread Count

```http
GET /notifications/unread-count
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `types` (optional): Filter by notification types (array)

**Response:**

```json
{
  "unreadCount": 25
}
```

#### Mark Notification as Read

```http
PUT /notifications/{notificationId}/read
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "success": true,
  "message": "Notification marked as read successfully"
}
```

#### Mark All Notifications as Read

```http
PUT /notifications/mark-all-read
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "types": ["transaction", "trading"] // Optional: filter by types
}
```

**Response:**

```json
{
  "success": true,
  "markedCount": 15,
  "message": "15 notifications marked as read successfully"
}
```

#### Delete Notification

```http
DELETE /notifications/{notificationId}
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

#### Bulk Actions

```http
PUT /notifications/bulk-action
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "action": "markRead", // markRead, delete, star, unstar, archive, unarchive
  "notificationIds": ["id1", "id2", "id3"]
}
```

**Response:**

```json
{
  "success": true,
  "affectedCount": 3,
  "message": "Bulk markRead completed successfully"
}
```

#### Get Notification Preferences

```http
GET /notifications/preferences
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "preferences": {
    "enabled": true,
    "digestFrequency": "immediate"
  }
}
```

#### Update Notification Preferences

```http
PUT /notifications/preferences
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "enabled": true,
  "digestFrequency": "daily" // immediate, hourly, daily, weekly, never
}
```

**Response:**

```json
{
  "success": true,
  "message": "Notification preferences updated successfully",
  "preferences": {
    "enabled": true,
    "digestFrequency": "daily"
  }
}
```

### Admin Endpoints

#### Create In-App Notification

```http
POST /notifications/in-app
Authorization: Bearer <jwt_token>
Roles: admin, moderator
```

**Request Body:**

```json
{
  "type": "transaction",
  "title": "System Maintenance",
  "body": "Scheduled maintenance will occur tonight",
  "targetType": "broadcast", // user, role, broadcast
  "targetDetails": {
    "role": "admin" // Required if targetType is "role"
  },
  "priority": "normal", // low, normal, high, urgent
  "metadata": {
    "relatedEntityType": "system",
    "actionUrl": "https://status.poolmind.com",
    "actionText": "View Status"
  },
  "expiresAt": "2024-01-20T00:00:00Z" // Optional
}
```

**Response:**

```json
{
  "success": true,
  "notificationId": "notification_id",
  "message": "Notification created successfully"
}
```

#### Queue In-App Notification

```http
POST /notifications/queue
Authorization: Bearer <jwt_token>
Roles: admin, moderator
```

**Request Body:** Same as create, plus optional queue options:

```json
{
  "type": "security",
  "title": "Security Alert",
  "body": "Unusual activity detected",
  "targetType": "role",
  "targetDetails": { "role": "admin" },
  "priority": "urgent",
  "options": {
    "priority": 1, // Queue priority (1 = highest)
    "delay": 5000, // Delay in milliseconds
    "attempts": 5 // Retry attempts
  }
}
```

**Response:**

```json
{
  "success": true,
  "jobId": "queue_job_id",
  "message": "Notification queued successfully"
}
```

#### Get Notification Statistics

```http
GET /notifications/stats
Authorization: Bearer <jwt_token>
Roles: admin
```

**Response:**

```json
{
  "total": 1250,
  "byType": {
    "transaction": 450,
    "trading": 300,
    "security": 50,
    "system": 200,
    "update": 150,
    "marketing": 100
  },
  "byPriority": {
    "low": 200,
    "normal": 800,
    "high": 200,
    "urgent": 50
  },
  "readPercentage": 78,
  "recentActivity": {
    "sent24h": 25,
    "read24h": 180
  }
}
```

#### Cleanup Old Notifications

```http
DELETE /notifications/cleanup
Authorization: Bearer <jwt_token>
Roles: admin
```

**Query Parameters:**

- `daysOld` (optional): Number of days old to cleanup (default: 30)

**Response:**

```json
{
  "success": true,
  "deactivatedNotifications": 45,
  "deletedUserNotifications": 1200,
  "message": "Cleanup completed: 45 notifications deactivated, 1200 user notifications deleted"
}
```

#### Get Queue Statistics

```http
GET /notifications/queue/stats
Authorization: Bearer <jwt_token>
Roles: admin
```

**Response:**

```json
{
  "waiting": 5,
  "active": 2,
  "completed": 1250,
  "failed": 3,
  "delayed": 0,
  "total": 1260
}
```

## Integration with Other Services

```typescript
@Injectable()
export class UserService {
  constructor(private notificationsService: NotificationsService) {}

  async createUser(userData) {
    const user = await this.create(userData);

    // Welcome notification via Telegram
    await this.notificationsService.sendSimpleMessage(
      user._id.toString(),
      'Welcome to PoolMind!',
      'Your account has been created successfully.',
      NotificationType.SYSTEM,
    );

    // Welcome notification in-app
    await this.notificationsService.queueInAppNotificationForUser(
      user._id.toString(),
      'Welcome to PoolMind!',
      'Your account has been created successfully. Complete your profile to get started.',
      NotificationType.SYSTEM,
      {
        actionUrl: '/profile',
        actionText: 'Complete Profile',
      },
    );

    return user;
  }
}
```
