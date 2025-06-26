// User and Authentication Types
export interface User {
  id: number;
  telegramId: number;
  username?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  isKycVerified: boolean;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  notifications: {
    tradeAlerts: boolean;
    profitDistributions: boolean;
    poolUpdates: boolean;
    systemAlerts: boolean;
  };
  language: string;
  timezone: string;
}

// Pool Types
export interface Pool {
  id: string;
  name: string;
  description: string;
  totalValue: number;
  participantCount: number;
  minimumContribution: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  performanceMetrics: PoolPerformance;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}

export interface PoolPerformance {
  nav: number;
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  yearlyReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  winRate: number;
}

// Portfolio Types
export interface Portfolio {
  userId: number;
  poolId: string;
  shares: number;
  totalContributed: number;
  currentValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  contributions: Contribution[];
  withdrawals: Withdrawal[];
}

export interface Contribution {
  id: string;
  userId: number;
  poolId: string;
  amount: number;
  shares: number;
  navAtContribution: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  timestamp: Date;
}

export interface Withdrawal {
  id: string;
  userId: number;
  poolId: string;
  amount: number;
  shares: number;
  navAtWithdrawal: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  requestedAt: Date;
  processedAt?: Date;
}

// Trading Types
export interface Trade {
  id: string;
  poolId: string;
  fromExchange: string;
  toExchange: string;
  asset: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  profit: number;
  profitPercentage: number;
  executedAt: Date;
  status: 'EXECUTED' | 'FAILED' | 'PARTIAL';
}

export interface TradingActivity {
  poolId: string;
  trades: Trade[];
  totalProfit: number;
  totalVolume: number;
  successRate: number;
  period: string;
}

// WebSocket Types
export interface PoolUpdate {
  type:
    | 'nav_update'
    | 'trade_executed'
    | 'participant_joined'
    | 'profit_distribution';
  poolId: string;
  data: any;
  timestamp: number;
}

export interface WebSocketMessage {
  event: string;
  data: any;
  timestamp: number;
}

// Session Types - Fixed to allow undefined properly
export interface SessionData {
  userId?: number | undefined;
  currentPool?: string | undefined;
  step?: string | undefined;
  tempData?: any;
  lastActivity?: Date | undefined;
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

// Notification Types
export interface Notification {
  id: string;
  userId: number;
  type: 'TRADE_ALERT' | 'PROFIT_DISTRIBUTION' | 'POOL_UPDATE' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

// Admin Types
export interface AdminUser {
  userId: number;
  role: 'ADMIN' | 'POOL_MANAGER';
  permissions: string[];
  managedPools?: string[];
}

// Chart Data Types
export interface ChartDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface PerformanceChart {
  poolId: string;
  timeframe: '1D' | '7D' | '30D' | '90D' | '1Y';
  data: ChartDataPoint[];
}

// Form Types
export interface ContributionForm {
  poolId: string;
  amount: number;
  paymentMethod: string;
}

export interface WithdrawalForm {
  poolId: string;
  amount: number;
  withdrawalMethod: string;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Rate Limiting Types
export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  limit: number;
}

// Brand Types
export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  success: string;
  warning: string;
  error: string;
}

// Configuration Types
export interface AppConfig {
  bot: {
    token: string;
    webhookUrl?: string;
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
    url: string;
  };
  security: {
    jwtSecret: string;
    encryptionKey: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  brand: BrandColors;
}
