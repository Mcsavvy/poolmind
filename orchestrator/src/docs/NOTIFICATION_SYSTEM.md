# PoolMind Notification System

## Overview

The PoolMind orchestrator includes a Redis pub/sub notification system that publishes real-time events to external services. This system allows external applications, bots, or services to subscribe to important user events and transaction updates.

## Supported Events

The notification system publishes the following events:

### 1. Wallet Linked (`wallet_linked`)

Triggered when a user successfully links their Stacks wallet to their account.

```json
{
  "eventType": "wallet_linked",
  "telegramId": "123456789",
  "userId": "64f123456789abcdef012345",
  "walletAddress": "SP1234567890ABCDEF1234567890ABCDEF123456789",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Wallet Unlinked (`wallet_unlinked`)

Triggered when a user unlinks their Stacks wallet from their account.

```json
{
  "eventType": "wallet_unlinked",
  "telegramId": "123456789",
  "userId": "64f123456789abcdef012345",
  "walletAddress": "SP1234567890ABCDEF1234567890ABCDEF123456789",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. Deposit Success (`deposit_success`)

Triggered when a user's deposit transaction is successfully confirmed on the blockchain.

```json
{
  "eventType": "deposit_success",
  "telegramId": "123456789",
  "userId": "64f123456789abcdef012345",
  "txId": "0x1234567890abcdef1234567890abcdef12345678",
  "stxAmount": 1000000,
  "plmdAmount": 950000,
  "fee": 50000,
  "netAmount": 950000,
  "nav": 1000000,
  "blockHeight": 12345,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 4. Withdrawal Success (`withdrawal_success`)

Triggered when a user's withdrawal transaction is successfully confirmed on the blockchain.

```json
{
  "eventType": "withdrawal_success",
  "telegramId": "123456789",
  "userId": "64f123456789abcdef012345",
  "txId": "0x1234567890abcdef1234567890abcdef12345678",
  "plmdAmount": 1000000,
  "stxAmount": 1000000,
  "fee": 50000,
  "netAmount": 950000,
  "nav": 1000000,
  "blockHeight": 12345,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Configuration

The notification system uses the same Redis configuration as the queue system:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
REDIS_URL=redis://localhost:6379/0
```

## Redis Channel

All notifications are published to the Redis channel: `poolmind-notifications`

## Subscribing to Notifications

### Node.js Example

```javascript
const redis = require("redis");

const subscriber = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
  password: process.env.REDIS_PASSWORD,
  database: parseInt(process.env.REDIS_DB || "0"),
});

// Connect and subscribe
await subscriber.connect();
await subscriber.subscribe("poolmind-notifications", (message) => {
  const event = JSON.parse(message);
  console.log("Received notification:", event);

  // Handle different event types
  switch (event.eventType) {
    case "wallet_linked":
      // Handle wallet linked event
      break;
    case "wallet_unlinked":
      // Handle wallet unlinked event
      break;
    case "deposit_success":
      // Handle deposit success event
      break;
    case "withdrawal_success":
      // Handle withdrawal success event
      break;
  }
});
```

### Python Example

```python
import redis
import json

# Connect to Redis
r = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', '6379')),
    password=os.getenv('REDIS_PASSWORD'),
    db=int(os.getenv('REDIS_DB', '0')),
    decode_responses=True
)

# Subscribe to notifications
pubsub = r.pubsub()
pubsub.subscribe('poolmind-notifications')

for message in pubsub.listen():
    if message['type'] == 'message':
        event = json.loads(message['data'])
        print(f"Received notification: {event}")

        # Handle different event types
        if event['eventType'] == 'wallet_linked':
            # Handle wallet linked event
            pass
        elif event['eventType'] == 'deposit_success':
            # Handle deposit success event
            pass
        # ... handle other event types
```

## Example Subscriber Script

A complete example subscriber script is provided at `scripts/notification-subscriber-example.js`. This script demonstrates:

- How to connect to Redis
- How to subscribe to notifications
- How to parse and handle different event types
- How to send Telegram notifications (mock implementation)

To run the example:

```bash
node scripts/notification-subscriber-example.js
```

## Use Cases

### 1. Telegram Bot Notifications

Subscribe to events and send real-time notifications to users via Telegram:

```javascript
const sendTelegramNotification = async (telegramId, message) => {
  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: "HTML",
      }),
    },
  );
};

// Handle deposit success
if (event.eventType === "deposit_success") {
  await sendTelegramNotification(
    event.telegramId,
    `💰 Deposit successful!\nAmount: ${event.stxAmount / 1000000} STX\nPLMD Received: ${event.plmdAmount / 1000000} PLMD`,
  );
}
```

### 2. Analytics and Monitoring

Track user behavior and system metrics:

```javascript
const trackEvent = (event) => {
  // Send to analytics service
  analytics.track(event.userId, event.eventType, {
    telegramId: event.telegramId,
    timestamp: event.timestamp,
    ...event,
  });
};
```

### 3. Email Notifications

Send email notifications for important events:

```javascript
const sendEmailNotification = async (userId, event) => {
  const user = await getUserById(userId);
  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: `PoolMind: ${event.eventType}`,
      template: getEmailTemplate(event.eventType),
      data: event,
    });
  }
};
```

### 4. Webhook Integration

Forward events to external services:

```javascript
const forwardToWebhook = async (event) => {
  await fetch("https://your-service.com/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
};
```

## Data Types

### Amount Fields

- All STX amounts are in microSTX (1 STX = 1,000,000 microSTX)
- All PLMD amounts are in microPLMD (1 PLMD = 1,000,000 microPLMD)
- NAV values are in microSTX

### Telegram ID

- The `telegramId` field contains the user's Telegram user ID as a string
- This can be used to send notifications directly to the user via Telegram Bot API

### User ID

- The `userId` field contains the MongoDB ObjectId of the user as a string
- This can be used to look up additional user information from the database

## Error Handling

The notification system is designed to be resilient:

- If Redis is unavailable, notifications will be logged but won't cause API failures
- Failed notification publishes are logged but don't interrupt transaction processing
- Subscribers should implement reconnection logic for production use

## Security Considerations

- Redis should be secured with authentication (password)
- Consider using Redis ACLs to restrict channel access
- Validate and sanitize all event data before processing
- Use TLS for Redis connections in production

## Monitoring

Monitor the notification system by:

- Checking Redis connection status
- Monitoring notification publish success rates
- Tracking subscriber connection counts
- Alerting on failed notification deliveries

## Development and Testing

For development and testing:

1. Start Redis locally: `redis-server`
2. Run the example subscriber: `node scripts/notification-subscriber-example.js`
3. Perform actions in the app (link wallet, make deposits/withdrawals)
4. Observe notifications in the subscriber console

The notification system integrates seamlessly with the existing transaction polling system and user management, ensuring that all events are captured and published in real-time.
