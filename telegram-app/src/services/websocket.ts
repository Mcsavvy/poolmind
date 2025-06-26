import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { PoolUpdate, WebSocketMessage } from '../types';

export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private subscribedPools: Set<string> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    // Add error handler for this instance
    this.on('error', (error) => {
      // Prevent uncaught exceptions from propagating
      logger.error('WebSocket service error handled:', error);
    });
    
    // Delay initial connection to prevent uncaught exceptions during module import
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  private connect(): void {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;
    logger.info('Connecting to WebSocket...');

    try {
      const wsUrl = `${config.api.baseUrl.replace('http', 'ws').replace('https', 'wss')}/ws`;
      this.ws = new WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${config.api.apiKey}`,
        },
      });

      // Add error handler immediately after creation
      this.ws.on('error', (error: Error) => {
        if (this.isDnsError(error)) {
          logger.error(`DNS resolution failed for WebSocket URL. Check if API_BASE_URL is correct: ${config.api.baseUrl}`);
          logger.warn('WebSocket will not retry DNS resolution errors to prevent spam.');
          this.reconnectAttempts = this.maxReconnectAttempts; // Stop further attempts
        } else {
          logger.error('WebSocket connection error:', error);
        }
        this.isConnecting = false;
        this.emit('error', error);
        this.scheduleReconnect();
      });

      this.setupEventHandlers();
    } catch (error) {
      if (this.isDnsError(error)) {
        logger.error(`DNS resolution failed for WebSocket URL. Check if API_BASE_URL is correct: ${config.api.baseUrl}`);
        logger.warn('WebSocket will not retry DNS resolution errors to prevent spam.');
        this.reconnectAttempts = this.maxReconnectAttempts; // Stop further attempts
      } else {
        logger.error('Failed to create WebSocket connection:', error);
      }
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.on('open', () => {
      logger.info('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emit('connected');

      // Re-subscribe to previously subscribed pools
      this.subscribedPools.forEach(poolId => {
        this.subscribeToPool(poolId);
      });
    });

    this.ws.on('message', (data: WebSocket.RawData) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        logger.error('Failed to parse WebSocket message:', error);
      }
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      logger.warn(
        `WebSocket connection closed: ${code} - ${reason.toString()}`
      );
      this.cleanup();
      this.scheduleReconnect();
    });

    this.ws.on('pong', () => {
      logger.debug('WebSocket pong received');
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    logger.debug('WebSocket message received:', message);

    switch (message.event) {
      case 'pool_update':
        this.emit('poolUpdate', message.data as PoolUpdate);
        break;
      case 'trade_executed':
        this.emit('tradeExecuted', message.data);
        break;
      case 'nav_update':
        this.emit('navUpdate', message.data);
        break;
      case 'participant_joined':
        this.emit('participantJoined', message.data);
        break;
      case 'profit_distribution':
        this.emit('profitDistribution', message.data);
        break;
      case 'system_alert':
        this.emit('systemAlert', message.data);
        break;
      default:
        logger.warn('Unknown WebSocket message event:', message.event);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Send ping every 30 seconds
  }

  private cleanup(): void {
    this.isConnecting = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn('Max reconnection attempts reached. WebSocket will not attempt to reconnect.');
      logger.info('Application will continue to run without WebSocket connection.');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    logger.info(
      `Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private isDnsError(error: any): boolean {
    return error?.code === 'ENOTFOUND' || 
           error?.code === 'EAI_AGAIN' ||
           error?.syscall === 'getaddrinfo';
  }

  public subscribeToPool(poolId: string): void {
    this.subscribedPools.add(poolId);

    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        event: 'subscribe',
        data: { poolId },
      };

      this.ws.send(JSON.stringify(message));
      logger.info(`Subscribed to pool updates: ${poolId}`);
    }
  }

  public unsubscribeFromPool(poolId: string): void {
    this.subscribedPools.delete(poolId);

    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        event: 'unsubscribe',
        data: { poolId },
      };

      this.ws.send(JSON.stringify(message));
      logger.info(`Unsubscribed from pool updates: ${poolId}`);
    }
  }

  public subscribeToUserUpdates(userId: number): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        event: 'subscribe_user',
        data: { userId },
      };

      this.ws.send(JSON.stringify(message));
      logger.info(`Subscribed to user updates: ${userId}`);
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public disconnect(): void {
    logger.info('Disconnecting WebSocket...');
    this.cleanup();

    if (this.ws) {
      this.ws.close();
    }
  }
}

export const webSocketService = new WebSocketService();
