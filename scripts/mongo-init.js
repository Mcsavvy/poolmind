// MongoDB initialization script for PoolMind
// This script runs when the MongoDB container starts for the first time

// Switch to the poolmind database
db = db.getSiblingDB('poolmind_dev');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['stacksAddress', 'telegramId', 'createdAt'],
      properties: {
        stacksAddress: {
          bsonType: 'string',
          description:
            'Stacks blockchain address must be a string and is required',
        },
        telegramId: {
          bsonType: 'string',
          description: 'Telegram user ID must be a string and is required',
        },
        createdAt: {
          bsonType: 'date',
          description: 'Creation date must be a date and is required',
        },
      },
    },
  },
});

db.createCollection('transactions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['txId', 'type', 'amount', 'status', 'createdAt'],
      properties: {
        txId: {
          bsonType: 'string',
          description: 'Transaction ID must be a string and is required',
        },
        type: {
          bsonType: 'string',
          enum: ['deposit', 'withdrawal', 'arbitrage'],
          description:
            'Transaction type must be one of: deposit, withdrawal, arbitrage',
        },
        amount: {
          bsonType: 'number',
          description: 'Amount must be a number and is required',
        },
        status: {
          bsonType: 'string',
          enum: ['pending', 'confirmed', 'failed'],
          description: 'Status must be one of: pending, confirmed, failed',
        },
        createdAt: {
          bsonType: 'date',
          description: 'Creation date must be a date and is required',
        },
      },
    },
  },
});

db.createCollection('notifications', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'type', 'message', 'createdAt'],
      properties: {
        userId: {
          bsonType: 'string',
          description: 'User ID must be a string and is required',
        },
        type: {
          bsonType: 'string',
          enum: ['transaction', 'arbitrage', 'system'],
          description:
            'Notification type must be one of: transaction, arbitrage, system',
        },
        message: {
          bsonType: 'string',
          description: 'Message must be a string and is required',
        },
        createdAt: {
          bsonType: 'date',
          description: 'Creation date must be a date and is required',
        },
      },
    },
  },
});

// Create indexes for better performance
db.users.createIndex({ stacksAddress: 1 }, { unique: true });
db.users.createIndex({ telegramId: 1 }, { unique: true });
db.transactions.createIndex({ txId: 1 }, { unique: true });
db.transactions.createIndex({ userId: 1 });
db.transactions.createIndex({ createdAt: -1 });
db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ createdAt: -1 });

print('✅ PoolMind database initialized successfully!');
print('📊 Collections created: users, transactions, notifications');
print('🔍 Indexes created for optimal performance');
