// User and Authentication Types
export interface User {
  id?: string;
  telegramId: number;
  username?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  walletAddress?: string;
  kycStatus?: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
  isKycVerified: boolean;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

// Telegram Authentication Request (from API schema)
export interface TelegramAuthRequest {
  chatId: string;
  user: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
  };
  auth_date?: number;
  hash?: string;
}

// Authentication Response (from API schema)
export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token: string;
    isNewUser: boolean;
  };
}

// Update Profile Request (from API schema)
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  preferences?: {
    notifications?: boolean;
    language?: string;
  };
}

// Link Wallet Request (from API schema)
export interface LinkWalletRequest {
  walletAddress: string;
  signature?: string;
}

export interface UserPreferences {
  notifications: boolean;
  language: string;
  timezone: string;
}

// Session Types - Fixed to allow undefined properly
export interface SessionData {
  userId?: number | undefined;
  currentPool?: string | undefined;
  step?: string | undefined;
  tempData?: any;
  lastActivity?: Date | undefined;
  // Authentication data
  isAuthenticated?: boolean;
  jwtToken?: string;
  user?: User;
  authTimestamp?: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Notification Event Types
export enum NotificationEventType {
  WALLET_LINKED = 'wallet_linked',
  WALLET_UNLINKED = 'wallet_unlinked',
  DEPOSIT_SUCCESS = 'deposit_success',
  WITHDRAWAL_SUCCESS = 'withdrawal_success',
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

// Configuration Types
export interface AppConfig {
  bot: {
    token: string;
  };
  server: {
    port: number;
    env: string;
  };
  api: {
    baseUrl: string;
    apiKey: string;
  };
  redis: {
    url?: string;
  };
  storage: {
    type: 'memory' | 'redis';
  };
  stacks: {
    network: 'mainnet' | 'testnet';
  };
  security: {
    jwtSecret: string;
    encryptionKey: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}
