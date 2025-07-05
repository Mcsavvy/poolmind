#!/usr/bin/env node

/**
 * Example Redis Pub/Sub Subscriber for PoolMind Notifications
 * 
 * This script demonstrates how external services can subscribe to 
 * real-time notifications from the PoolMind orchestrator.
 * 
 * Usage:
 *   node scripts/notification-subscriber-example.js
 * 
 * Environment Variables:
 *   REDIS_HOST - Redis host (default: localhost)
 *   REDIS_PORT - Redis port (default: 6379)
 *   REDIS_PASSWORD - Redis password (optional)
 *   REDIS_DB - Redis database number (default: 0)
 */

const { createClient } = require('redis');

// Configuration
const config = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  }
};

// Channel name (must match the one used in the notification service)
const CHANNEL_NAME = 'poolmind-notifications';

// Create Redis subscriber client
const subscriber = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  password: config.redis.password,
  database: config.redis.db,
});

// Event handlers
subscriber.on('error', (error) => {
  console.error('Redis subscriber error:', error);
});

subscriber.on('connect', () => {
  console.log('✅ Connected to Redis');
});

subscriber.on('ready', () => {
  console.log('✅ Redis subscriber ready');
});

subscriber.on('end', () => {
  console.log('📡 Redis subscriber connection ended');
});

// Message handler
const handleNotification = (message) => {
  try {
    const event = JSON.parse(message);
    
    console.log('\n🔔 New Notification Received:');
    console.log('=====================================');
    console.log(`Event Type: ${event.eventType}`);
    console.log(`Telegram ID: ${event.telegramId}`);
    console.log(`User ID: ${event.userId}`);
    console.log(`Timestamp: ${event.timestamp}`);
    
    switch (event.eventType) {
      case 'wallet_linked':
        console.log(`Wallet Address: ${event.walletAddress}`);
        console.log('📱 User linked their wallet!');
        
        // Example: Send Telegram notification
        sendTelegramNotification(event.telegramId, 
          `🔗 Wallet linked successfully!\nAddress: ${event.walletAddress}`);
        break;
        
      case 'wallet_unlinked':
        console.log(`Wallet Address: ${event.walletAddress}`);
        console.log('📱 User unlinked their wallet!');
        
        // Example: Send Telegram notification
        sendTelegramNotification(event.telegramId, 
          `🔓 Wallet unlinked successfully!\nAddress: ${event.walletAddress}`);
        break;
        
      case 'deposit_success':
        console.log(`Transaction ID: ${event.txId}`);
        console.log(`STX Amount: ${event.stxAmount / 1000000} STX`);
        console.log(`PLMD Amount: ${event.plmdAmount / 1000000} PLMD`);
        console.log(`Fee: ${event.fee / 1000000} STX`);
        console.log(`Net Amount: ${event.netAmount / 1000000} STX`);
        if (event.nav) console.log(`NAV: ${event.nav / 1000000}`);
        if (event.blockHeight) console.log(`Block Height: ${event.blockHeight}`);
        console.log('💰 Deposit successful!');
        
        // Example: Send Telegram notification
        sendTelegramNotification(event.telegramId, 
          `💰 Deposit successful!\n` +
          `Amount: ${event.stxAmount / 1000000} STX\n` +
          `PLMD Received: ${event.plmdAmount / 1000000} PLMD\n` +
          `Transaction: ${event.txId}`);
        break;
        
      case 'withdrawal_success':
        console.log(`Transaction ID: ${event.txId}`);
        console.log(`PLMD Amount: ${event.plmdAmount / 1000000} PLMD`);
        console.log(`STX Amount: ${event.stxAmount / 1000000} STX`);
        console.log(`Fee: ${event.fee / 1000000} STX`);
        console.log(`Net Amount: ${event.netAmount / 1000000} STX`);
        if (event.nav) console.log(`NAV: ${event.nav / 1000000}`);
        if (event.blockHeight) console.log(`Block Height: ${event.blockHeight}`);
        console.log('💸 Withdrawal successful!');
        
        // Example: Send Telegram notification
        sendTelegramNotification(event.telegramId, 
          `💸 Withdrawal successful!\n` +
          `PLMD Redeemed: ${event.plmdAmount / 1000000} PLMD\n` +
          `STX Received: ${event.netAmount / 1000000} STX\n` +
          `Transaction: ${event.txId}`);
        break;
        
      default:
        console.log('❓ Unknown event type');
    }
    
    console.log('=====================================\n');
    
  } catch (error) {
    console.error('❌ Error parsing notification:', error);
  }
};

// Mock function to simulate sending Telegram notifications
const sendTelegramNotification = (telegramId, message) => {
  console.log(`📤 Sending Telegram notification to ${telegramId}:`);
  console.log(`   Message: ${message}`);
  
  // In a real implementation, you would use the Telegram Bot API:
  // const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  // const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  // const payload = {
  //   chat_id: telegramId,
  //   text: message,
  //   parse_mode: 'HTML'
  // };
  // 
  // fetch(url, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload)
  // }).then(response => {
  //   if (!response.ok) {
  //     console.error('Failed to send Telegram notification:', response.statusText);
  //   }
  // }).catch(error => {
  //   console.error('Error sending Telegram notification:', error);
  // });
};

// Start the subscriber
const startSubscriber = async () => {
  try {
    console.log('🚀 Starting PoolMind Notification Subscriber...');
    console.log(`📡 Redis Host: ${config.redis.host}:${config.redis.port}`);
    console.log(`📺 Channel: ${CHANNEL_NAME}`);
    console.log('=====================================\n');
    
    // Connect to Redis
    await subscriber.connect();
    
    // Subscribe to the notifications channel
    await subscriber.subscribe(CHANNEL_NAME, handleNotification);
    
    console.log('✅ Successfully subscribed to notifications!');
    console.log('🎧 Listening for events...\n');
    
  } catch (error) {
    console.error('❌ Failed to start subscriber:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  try {
    await subscriber.unsubscribe(CHANNEL_NAME);
    subscriber.destroy();
    console.log('✅ Subscriber disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the subscriber
startSubscriber(); 