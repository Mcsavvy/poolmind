import { createClient } from "redis";
import winston from "winston";
import { config } from "../config";

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "notification-service" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: config.logging.files.combined,
    }),
  ],
});

// Notification event types
export enum NotificationEventType {
  WALLET_LINKED = "wallet_linked",
  WALLET_UNLINKED = "wallet_unlinked",
  DEPOSIT_SUCCESS = "deposit_success",
  WITHDRAWAL_SUCCESS = "withdrawal_success",
}

// Base notification event interface
export interface BaseNotificationEvent {
  eventType: NotificationEventType;
  telegramId: string;
  userId: string;
  timestamp: Date;
}

// Wallet linking/unlinking events
export interface WalletLinkedEvent extends BaseNotificationEvent {
  eventType: NotificationEventType.WALLET_LINKED;
  walletAddress: string;
}

export interface WalletUnlinkedEvent extends BaseNotificationEvent {
  eventType: NotificationEventType.WALLET_UNLINKED;
  walletAddress: string;
}

// Transaction success events
export interface DepositSuccessEvent extends BaseNotificationEvent {
  eventType: NotificationEventType.DEPOSIT_SUCCESS;
  txId: string;
  stxAmount: number;
  plmdAmount: number;
  fee: number;
  netAmount: number;
  nav?: number;
  blockHeight?: number;
}

export interface WithdrawalSuccessEvent extends BaseNotificationEvent {
  eventType: NotificationEventType.WITHDRAWAL_SUCCESS;
  txId: string;
  plmdAmount: number;
  stxAmount: number;
  fee: number;
  netAmount: number;
  nav?: number;
  blockHeight?: number;
}

// Union type for all notification events
export type NotificationEvent =
  | WalletLinkedEvent
  | WalletUnlinkedEvent
  | DepositSuccessEvent
  | WithdrawalSuccessEvent;

class NotificationService {
  private publisher: ReturnType<typeof createClient>;
  private readonly channelName = "poolmind-notifications";

  constructor() {
    // Initialize Redis publisher
    this.publisher = createClient({
      url: config.redis.url
    });

    this.publisher.on("error", (error: Error) => {
      logger.error("Redis publisher error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    });

    this.publisher.on("connect", () => {
      logger.info("Redis publisher connected", {
        redisUrl: config.redis.url.replace(/\/\/.*@/, "//********@"),
      });
    });

    this.publisher.on("ready", () => {
      logger.info("Redis publisher ready");
    });

    this.publisher.on("end", () => {
      logger.info("Redis publisher connection ended");
    });

    // Connect to Redis
    this.connect();
  }

  /**
   * Connect to Redis
   */
  private async connect(): Promise<void> {
    try {
      await this.publisher.connect();
      logger.info("Notification service initialized", {
        channelName: this.channelName,
        redisUrl: config.redis.url.replace(/\/\/.*@/, "//********@"),
      });
    } catch (error) {
      logger.error("Failed to connect to Redis", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Publish a notification event to Redis
   */
  private async publishEvent(event: NotificationEvent): Promise<void> {
    try {
      const eventPayload = JSON.stringify(event);

      await this.publisher.publish(this.channelName, eventPayload);

      logger.info("Notification event published", {
        eventType: event.eventType,
        telegramId: event.telegramId,
        userId: event.userId,
        channelName: this.channelName,
      });
    } catch (error) {
      logger.error("Failed to publish notification event", {
        eventType: event.eventType,
        telegramId: event.telegramId,
        userId: event.userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Publish wallet linked event
   */
  async publishWalletLinked(
    telegramId: string,
    userId: string,
    walletAddress: string,
  ): Promise<void> {
    const event: WalletLinkedEvent = {
      eventType: NotificationEventType.WALLET_LINKED,
      telegramId,
      userId,
      walletAddress,
      timestamp: new Date(),
    };

    await this.publishEvent(event);
  }

  /**
   * Publish wallet unlinked event
   */
  async publishWalletUnlinked(
    telegramId: string,
    userId: string,
    walletAddress: string,
  ): Promise<void> {
    const event: WalletUnlinkedEvent = {
      eventType: NotificationEventType.WALLET_UNLINKED,
      telegramId,
      userId,
      walletAddress,
      timestamp: new Date(),
    };

    await this.publishEvent(event);
  }

  /**
   * Publish deposit success event
   */
  async publishDepositSuccess(
    telegramId: string,
    userId: string,
    txId: string,
    stxAmount: number,
    plmdAmount: number,
    fee: number,
    netAmount: number,
    nav?: number,
    blockHeight?: number,
  ): Promise<void> {
    const event: DepositSuccessEvent = {
      eventType: NotificationEventType.DEPOSIT_SUCCESS,
      telegramId,
      userId,
      txId,
      stxAmount,
      plmdAmount,
      fee,
      netAmount,
      nav,
      blockHeight,
      timestamp: new Date(),
    };

    await this.publishEvent(event);
  }

  /**
   * Publish withdrawal success event
   */
  async publishWithdrawalSuccess(
    telegramId: string,
    userId: string,
    txId: string,
    plmdAmount: number,
    stxAmount: number,
    fee: number,
    netAmount: number,
    nav?: number,
    blockHeight?: number,
  ): Promise<void> {
    const event: WithdrawalSuccessEvent = {
      eventType: NotificationEventType.WITHDRAWAL_SUCCESS,
      telegramId,
      userId,
      txId,
      plmdAmount,
      stxAmount,
      fee,
      netAmount,
      nav,
      blockHeight,
      timestamp: new Date(),
    };

    await this.publishEvent(event);
  }

  /**
   * Get channel name for external subscribers
   */
  getChannelName(): string {
    return this.channelName;
  }

  /**
   * Check if the service is connected
   */
  isConnected(): boolean {
    return this.publisher.isOpen;
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    try {
      await this.publisher.destroy();
      logger.info("Notification service disconnected");
    } catch (error) {
      logger.error("Failed to disconnect notification service", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
