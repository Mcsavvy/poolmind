import { z } from 'zod';
import { commonSchemas } from './api-validation';

// Notification preferences schema (based on your existing code)
export const notificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  sms: z.boolean().optional(),
  marketing: z.boolean().optional(),
  security: z.boolean().optional(),
}).strict();

// User-related schemas
export const userSchemas = {
  // User registration/creation
  createUser: z.object({
    walletAddress: commonSchemas.walletAddress,
    email: commonSchemas.email.optional(),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
    notificationPreferences: notificationPreferencesSchema.optional(),
  }),

  // User update
  updateUser: z.object({
    email: commonSchemas.email.optional(),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
    notificationPreferences: notificationPreferencesSchema.optional(),
  }).strict(),

  // User query parameters
  userQuery: z.object({
    walletAddress: commonSchemas.walletAddress.optional(),
    email: commonSchemas.email.optional(),
    verified: commonSchemas.boolean.optional(),
    ...commonSchemas.pagination.shape,
    ...commonSchemas.sort.shape,
  }),
};

// Pool/Investment related schemas (based on your project name)
export const poolSchemas = {
  // Create pool
  createPool: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    targetAmount: z.number().positive(),
    minimumInvestment: z.number().positive(),
    maximumInvestment: z.number().positive().optional(),
    duration: z.number().int().positive(), // days
    category: z.enum(['real-estate', 'technology', 'energy', 'healthcare', 'other']),
    riskLevel: z.enum(['low', 'medium', 'high']),
    expectedReturn: z.number().min(0).max(100), // percentage
    tags: z.array(z.string().min(1)).max(10).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),

  // Update pool
  updatePool: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).optional(),
    tags: z.array(z.string().min(1)).max(10).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }).strict(),

  // Pool query parameters
  poolQuery: z.object({
    category: z.enum(['real-estate', 'technology', 'energy', 'healthcare', 'other']).optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).optional(),
    minAmount: z.coerce.number().positive().optional(),
    maxAmount: z.coerce.number().positive().optional(),
    featured: commonSchemas.boolean.optional(),
    ...commonSchemas.pagination.shape,
    ...commonSchemas.sort.shape,
    ...commonSchemas.search.shape,
  }),

  // Investment
  createInvestment: z.object({
    poolId: commonSchemas.objectId,
    amount: z.number().positive(),
    paymentMethod: z.enum(['stacks', 'bitcoin', 'usdc']),
    transactionHash: z.string().min(1).optional(),
  }),
};

// Transaction schemas
export const transactionSchemas = {
  // Create transaction
  createTransaction: z.object({
    type: z.enum(['investment', 'withdrawal', 'dividend', 'fee']),
    amount: z.number(),
    currency: z.enum(['STX', 'BTC', 'USDC']),
    fromAddress: commonSchemas.walletAddress.optional(),
    toAddress: commonSchemas.walletAddress.optional(),
    transactionHash: z.string().min(1).optional(),
    poolId: commonSchemas.objectId.optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),

  // Transaction query
  transactionQuery: z.object({
    type: z.enum(['investment', 'withdrawal', 'dividend', 'fee']).optional(),
    currency: z.enum(['STX', 'BTC', 'USDC']).optional(),
    walletAddress: commonSchemas.walletAddress.optional(),
    poolId: commonSchemas.objectId.optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    minAmount: z.coerce.number().optional(),
    maxAmount: z.coerce.number().optional(),
    status: z.enum(['pending', 'confirmed', 'failed']).optional(),
    ...commonSchemas.pagination.shape,
    ...commonSchemas.sort.shape,
  }),
};

// Authentication schemas
export const authSchemas = {
  // Login/Register with wallet
  walletAuth: z.object({
    walletAddress: commonSchemas.walletAddress,
    signature: z.string().min(1),
    message: z.string().min(1),
    publicKey: z.string().min(1).optional(),
  }),

  // Email verification
  emailVerification: z.object({
    email: commonSchemas.email,
    code: z.string().length(6).regex(/^\d{6}$/),
  }),

  // Password reset
  passwordReset: z.object({
    email: commonSchemas.email,
    token: z.string().min(1),
    newPassword: commonSchemas.strongPassword,
  }),
};

// Admin schemas
export const adminSchemas = {
  // Bulk operations
  bulkOperation: z.object({
    operation: z.enum(['approve', 'reject', 'suspend', 'activate']),
    ids: z.array(commonSchemas.objectId).min(1).max(100),
    reason: z.string().max(500).optional(),
  }),

  // System settings
  systemSettings: z.object({
    maintenanceMode: commonSchemas.boolean.optional(),
    minInvestmentAmount: z.number().positive().optional(),
    maxInvestmentAmount: z.number().positive().optional(),
    platformFee: z.number().min(0).max(10).optional(), // percentage
    emailNotifications: commonSchemas.boolean.optional(),
    registrationEnabled: commonSchemas.boolean.optional(),
  }).strict(),

  // Analytics query
  analyticsQuery: z.object({
    metric: z.enum(['users', 'pools', 'investments', 'revenue', 'transactions']),
    period: z.enum(['day', 'week', 'month', 'quarter', 'year']),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    groupBy: z.enum(['day', 'week', 'month']).optional(),
  }),
};

// File upload schemas
export const uploadSchemas = {
  // Image upload validation
  imageUpload: z.object({
    fileName: z.string().min(1),
    fileType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    fileSize: z.number().max(5 * 1024 * 1024), // 5MB max
    category: z.enum(['profile', 'pool', 'document']).optional(),
  }),

  // Document upload validation
  documentUpload: z.object({
    fileName: z.string().min(1),
    fileType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
    fileSize: z.number().max(10 * 1024 * 1024), // 10MB max
    documentType: z.enum(['kyc', 'agreement', 'certificate', 'other']),
  }),
};

// Export all schemas for easy access
export const allSchemas = {
  user: userSchemas,
  pool: poolSchemas,
  transaction: transactionSchemas,
  auth: authSchemas,
  admin: adminSchemas,
  upload: uploadSchemas,
  notificationPreferences: notificationPreferencesSchema,
};