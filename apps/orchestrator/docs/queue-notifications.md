# Background Notifications with Bull Queue

The notification system now supports background processing using Bull (Redis-based queues) for improved performance and reliability.

## Benefits of Queue-Based Notifications

- ✅ **Non-blocking**: API responses are not delayed by notification sending
- ✅ **Reliable**: Failed notifications are automatically retried
- ✅ **Scalable**: Process thousands of notifications efficiently
- ✅ **Prioritized**: Important notifications are processed first
- ✅ **Scheduled**: Support for delayed notifications
- ✅ **Monitored**: Built-in job tracking and statistics

## Environment Setup

Add Redis configuration to your `.env` file:

```bash
# Redis Configuration (required for Bull queues)
REDIS_URL=redis://localhost:6379

# Existing Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_GROUP_LINK=https://t.me/your_group      # Optional
TELEGRAM_CHANNEL_LINK=https://t.me/your_channel  # Optional
TELEGRAM_CHANNEL_ID=@your_channel               # Optional
```

## Usage Examples

### Basic Queue Operations

```typescript
import { NotificationsService, NotificationType } from './notifications';

@Injectable()
export class SomeService {
  constructor(private notificationsService: NotificationsService) {}

  // ✅ Non-blocking (recommended for user-facing operations)
  async sendWelcomeMessage(userId: string) {
    const job = await this.notificationsService.queueToUser(userId, {
      type: NotificationType.SYSTEM,
      title: 'Welcome!',
      body: 'Thanks for joining PoolMind.',
    }, {
      priority: 2, // High priority
    });
    
    console.log(`Welcome queued with job ID: ${job.id}`);
    return job; // Returns immediately
  }

  // ❌ Blocking (only use when you need immediate feedback)
  async sendUrgentAlert(userId: string) {
    const result = await this.notificationsService.sendToUser(userId, {
      type: NotificationType.SECURITY,
      title: 'Security Alert',
      body: 'Immediate action required.',
    });
    
    return result; // Waits for actual delivery
  }
}
```

### Priority System

```typescript
// Priority levels (lower number = higher priority)
const priorities = {
  EMERGENCY: 1,        // Security alerts, channel broadcasts
  HIGH: 2,             // Welcome/goodbye messages, critical notifications
  MEDIUM: 5,           // Trading updates, arbitrage notifications (default)
  LOW: 10,             // System updates, marketing messages
};

// Emergency security alert (highest priority)
await notificationsService.queueSecurityAlert(
  'Platform Breach',
  'Immediate security issue detected.'
);

// Scheduled maintenance (low priority, delayed)
await notificationsService.queueSystemUpdate(
  'Maintenance Tonight',
  'System will be down 2-4 AM UTC.',
  { delay: 3600000 } // 1 hour delay
);
```

### Bulk Operations

```typescript
// Send notifications to different groups with different priorities
async sendBulkNotifications() {
  const jobs = await Promise.all([
    // Channel broadcast (highest priority)
    this.notificationsService.queueToChannel({
      type: NotificationType.UPDATE,
      title: 'Platform Update',
      body: 'New features available!',
    }, { priority: 1 }),
    
    // Admin notifications (high priority)
    this.notificationsService.queueToRole('admin', {
      type: NotificationType.TRADING,
      title: 'Trading Alert',
      body: 'High volume detected.',
    }, { priority: 2 }),
    
    // All users (low priority)
    this.notificationsService.queueToAllUsers({
      type: NotificationType.MARKETING,
      title: 'Weekly Report',
      body: 'Your trading summary is ready.',
    }, { priority: 10 }),
  ]);
  
  return jobs; // All queued immediately
}
```

### Scheduled Notifications

```typescript
// Schedule notification for future delivery
async scheduleReminder() {
  const reminderTime = new Date();
  reminderTime.setHours(reminderTime.getHours() + 1); // 1 hour from now
  
  const delay = reminderTime.getTime() - Date.now();
  
  return await this.notificationsService.queueToUser('user-id', {
    type: NotificationType.SYSTEM,
    title: 'Reminder',
    body: 'Don\'t forget to check your portfolio.',
  }, {
    delay,
    priority: 5,
  });
}
```

## Automatic Welcome/Goodbye Messages

The auth service now uses queues for linking/unlinking messages:

```typescript
// When user links Telegram account (non-blocking)
await authService.linkTelegramAccount(userId, telegramData);
// ✅ Welcome message is queued with priority 2 (high)
// ✅ API response is immediate

// When user unlinks Telegram account (non-blocking)  
await authService.unlinkTelegramAccount(userId);
// ✅ Goodbye message is queued with priority 2 (high)
// ✅ API response is immediate
```

## Queue Management

### Monitor Queue Status

```typescript
// Get queue statistics
const stats = await notificationsService.getQueueStats();
console.log(stats);
// {
//   waiting: 5,     // Jobs waiting to be processed
//   active: 2,      // Jobs currently being processed  
//   completed: 120, // Successfully completed jobs
//   failed: 3,      // Failed jobs
//   delayed: 1,     // Scheduled jobs
//   total: 131      // Total jobs
// }
```

### Admin Operations

```typescript
// Pause queue processing (maintenance mode)
await notificationsService.pauseQueue();

// Resume queue processing
await notificationsService.resumeQueue();

// Clear all pending jobs (emergency)
await notificationsService.clearQueue();
```

## Job Configuration

### Retry Policy

```typescript
// Custom retry configuration
await notificationsService.queueToUser(userId, message, {
  attempts: 5,        // Retry up to 5 times
  priority: 1,        // High priority
});

// Default retry policy:
// - 3 attempts maximum
// - Exponential backoff (2s, 4s, 8s delays)
// - Jobs are marked as failed after all attempts
```

### Job Options

```typescript
interface QueueOptions {
  priority?: number;   // 1 (highest) to 10 (lowest)
  delay?: number;      // Delay in milliseconds
  attempts?: number;   // Number of retry attempts
}

// Example with all options
await notificationsService.queueToUser(userId, message, {
  priority: 2,         // High priority
  delay: 60000,        // 1 minute delay
  attempts: 5,         // 5 retry attempts
});
```

## Performance Comparison

```typescript
// ❌ Synchronous approach (blocks request)
const start = Date.now();
await notificationsService.sendToAllUsers(message);
console.log(`Blocked for: ${Date.now() - start}ms`); // ~2000-5000ms

// ✅ Asynchronous approach (non-blocking)
const queueStart = Date.now();
await notificationsService.queueToAllUsers(message);
console.log(`Queue time: ${Date.now() - queueStart}ms`); // ~5-20ms
```

## Error Handling

```typescript
try {
  const job = await notificationsService.queueToUser(userId, message);
  console.log(`Queued successfully: ${job.id}`);
} catch (error) {
  console.error('Failed to queue notification:', error);
  // Queue failures are rare (usually Redis connection issues)
}

// Job processing errors are handled automatically:
// - Failed jobs are retried with exponential backoff
// - After max attempts, jobs are marked as failed
// - Failed jobs are kept for debugging (last 20)
// - Successful jobs are kept for monitoring (last 50)
```

## Queue Concurrency

The notification processor handles 5 concurrent jobs by default:

- Respects Telegram rate limits (~30 messages/second)
- Prevents overwhelming the Telegram API
- Balances throughput with reliability
- Can be adjusted based on your needs

## Best Practices

### 1. Use Queues for User-Facing Operations

```typescript
// ✅ Good: Non-blocking user registration
async registerUser(userData) {
  const user = await this.createUser(userData);
  
  // Queue welcome message (doesn't block response)
  await this.notificationsService.queueSimpleMessage(
    user.id,
    'Welcome!',
    'Account created successfully.'
  );
  
  return user; // Immediate response
}

// ❌ Bad: Blocking user registration
async registerUser(userData) {
  const user = await this.createUser(userData);
  
  // This blocks the response for 1-3 seconds
  await this.notificationsService.sendSimpleMessage(
    user.id,
    'Welcome!',
    'Account created successfully.'
  );
  
  return user; // Delayed response
}
```

### 2. Use Appropriate Priorities

```typescript
// Security alerts: Priority 1 (highest)
await notificationsService.queueSecurityAlert('Security Issue', 'Details...');

// User interactions: Priority 2 (high)
await notificationsService.queueSimpleMessage(userId, 'Welcome!', 'Details...', 
  NotificationType.SYSTEM, { priority: 2 });

// Trading updates: Priority 5 (medium/default)
await notificationsService.queueTradingUpdate('Market Update', 'Details...');

// Marketing: Priority 10 (low)
await notificationsService.queueToAllUsers(marketingMessage, { priority: 10 });
```

### 3. Monitor Queue Health

```typescript
// Regular health checks
setInterval(async () => {
  const stats = await notificationsService.getQueueStats();
  
  if (stats.failed > 50) {
    console.warn('High failure rate detected');
    // Alert administrators
  }
  
  if (stats.waiting > 1000) {
    console.warn('Queue backlog detected');
    // Consider scaling or pausing low-priority jobs
  }
}, 60000); // Check every minute
```

## Migration from Synchronous to Queue-Based

To migrate existing code:

1. **Replace `send*` methods with `queue*` methods**:
   ```typescript
   // Before
   await notificationsService.sendToUser(userId, message);
   
   // After  
   await notificationsService.queueToUser(userId, message);
   ```

2. **Add priority for important notifications**:
   ```typescript
   await notificationsService.queueToUser(userId, message, { priority: 2 });
   ```

3. **Remove try/catch blocks around notification sending** (unless you need to handle queue failures):
   ```typescript
   // Before: Had to handle notification failures
   try {
     await notificationsService.sendToUser(userId, message);
   } catch (error) {
     // Handle notification failure
   }
   
   // After: Queue handles retries automatically
   await notificationsService.queueToUser(userId, message);
   ```

The queue system provides better performance, reliability, and scalability for your notification needs!
