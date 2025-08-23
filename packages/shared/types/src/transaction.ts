import { z } from 'zod';

// Base transaction status enum
export const TransactionStatusSchema = z.enum([
  'pending',    // Transaction created but not yet broadcast/confirmed
  'broadcast',  // Transaction broadcast to network
  'confirming', // Transaction in mempool or partially confirmed
  'confirmed',  // Transaction fully confirmed
  'failed',     // Transaction failed or was rejected
  'cancelled',  // Transaction was cancelled before confirmation
]);

// Transaction type enum
export const TransactionTypeSchema = z.enum(['deposit', 'withdrawal']);

// Base transaction metadata
export const TransactionMetadataSchema = z.object({
  // Network information
  network: z.enum(['mainnet', 'testnet', 'devnet']).default('testnet'),
  
  // Transaction identifiers
  txId: z.string().optional(), // Stacks transaction ID
  blockHeight: z.number().optional(), // Block number where transaction was included
  
  // Amounts and fees
  amount: z.string(), // Amount in STX (as string to preserve precision)
  fee: z.string().optional(), // Transaction fee in STX
  
  // Stacks-specific data
  contractAddress: z.string().optional(), // Smart contract address if applicable
  contractName: z.string().optional(), // Smart contract name if applicable
  functionName: z.string().optional(), // Contract function name if applicable
  functionArgs: z.array(z.any()).optional(), // Contract function arguments
  
  // Confirmation tracking
  confirmations: z.number().default(0), // Number of confirmations
  requiredConfirmations: z.number().default(6), // Required confirmations for completion
  
  // Error information
  errorMessage: z.string().optional(),
  errorCode: z.string().optional(),
  
  // Processing metadata
  retryCount: z.number().default(0), // Number of times we've retried checking this transaction
  lastCheckedAt: z.date().optional(), // Last time we polled for this transaction
  broadcastAt: z.date().optional(), // When transaction was broadcast
  confirmedAt: z.date().optional(), // When transaction was confirmed
});

// Base transaction schema
export const BaseTransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: TransactionTypeSchema,
  status: TransactionStatusSchema,
  metadata: TransactionMetadataSchema,
  
  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
  
  // Additional fields
  notes: z.string().optional(), // Optional notes or description
  tags: z.array(z.string()).optional(), // Optional tags for categorization
});

// Deposit transaction schema
export const DepositTransactionSchema = BaseTransactionSchema.extend({
  type: z.literal('deposit'),
  
  // Deposit-specific metadata
  depositMetadata: z.object({
    // Source information
    sourceAddress: z.string(), // Address sending the deposit
    destinationAddress: z.string(), // Pool contract address receiving deposit
    
    // Pool-specific data
    poolSharesExpected: z.string().optional(), // Expected pool shares to receive
    poolSharesActual: z.string().optional(), // Actual pool shares received
    
    // Slippage and pricing
    expectedPrice: z.string().optional(), // Expected STX/USD price at time of deposit
    actualPrice: z.string().optional(), // Actual price when deposit was processed
    slippage: z.string().optional(), // Price slippage percentage
  }).optional(),
});

// Withdrawal transaction schema
export const WithdrawalTransactionSchema = BaseTransactionSchema.extend({
  type: z.literal('withdrawal'),
  
  // Withdrawal-specific metadata
  withdrawalMetadata: z.object({
    // Destination information
    destinationAddress: z.string(), // Address to receive the withdrawn STX
    sourceAddress: z.string(), // Pool contract address
    
    // Pool-specific data
    poolSharesBurned: z.string().optional(), // Pool shares being burned for withdrawal
    
    // Withdrawal constraints
    minimumAmount: z.string().optional(), // Minimum STX amount to receive
    
    // Processing information
    isEmergencyWithdrawal: z.boolean().default(false), // Whether this is an emergency withdrawal
    approvedBy: z.string().optional(), // Admin who approved withdrawal (if required)
    approvedAt: z.date().optional(), // When withdrawal was approved
  }).optional(),
});

// Union of all transaction types
export const TransactionSchema = z.discriminatedUnion('type', [
  DepositTransactionSchema,
  WithdrawalTransactionSchema,
]);

// Request schemas for creating transactions
export const CreateDepositRequestSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  sourceAddress: z.string().min(1, 'Source address is required'),
  txId: z.string().min(1, 'Transaction ID is required'), // MANDATORY: Blockchain transaction ID
  network: z.enum(['mainnet', 'testnet', 'devnet']).default('testnet'),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const CreateWithdrawalRequestSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  destinationAddress: z.string().min(1, 'Destination address is required'),
  poolSharesBurned: z.string().optional(),
  minimumAmount: z.string().optional(),
  isEmergencyWithdrawal: z.boolean().optional(),
  txId: z.string().min(1, 'Transaction ID is required'), // MANDATORY: Blockchain transaction ID
  network: z.enum(['mainnet', 'testnet', 'devnet']).default('testnet'),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Response schemas
export const TransactionResponseSchema = z.object({
  transaction: TransactionSchema,
  success: z.boolean(),
  message: z.string().optional(),
});

export const TransactionListResponseSchema = z.object({
  transactions: z.array(TransactionSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  success: z.boolean(),
});

// Query schemas
export const TransactionQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  type: TransactionTypeSchema.optional(),
  status: TransactionStatusSchema.optional(),
  userId: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'amount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(), // Search in notes, txId, addresses
  fromDate: z.string().optional(), // ISO date string
  toDate: z.string().optional(), // ISO date string
});

// Update transaction status request
export const UpdateTransactionStatusRequestSchema = z.object({
  status: TransactionStatusSchema,
  txId: z.string().optional(),
  blockHeight: z.number().optional(),
  confirmations: z.number().optional(),
  errorMessage: z.string().optional(),
  errorCode: z.string().optional(),
  metadata: z.object({}).loose().optional(), // Allow any additional metadata
});

// Webhook notification schema for external systems
export const TransactionWebhookSchema = z.object({
  event: z.enum(['transaction.created', 'transaction.confirmed', 'transaction.failed']),
  transaction: TransactionSchema,
  timestamp: z.date(),
  signature: z.string().optional(), // For webhook verification
});

// Type exports
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;
export type TransactionType = z.infer<typeof TransactionTypeSchema>;
export type TransactionMetadata = z.infer<typeof TransactionMetadataSchema>;
export type BaseTransaction = z.infer<typeof BaseTransactionSchema>;
export type DepositTransaction = z.infer<typeof DepositTransactionSchema>;
export type WithdrawalTransaction = z.infer<typeof WithdrawalTransactionSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;

export type CreateDepositRequest = z.infer<typeof CreateDepositRequestSchema>;
export type CreateWithdrawalRequest = z.infer<typeof CreateWithdrawalRequestSchema>;
export type TransactionResponse = z.infer<typeof TransactionResponseSchema>;
export type TransactionListResponse = z.infer<typeof TransactionListResponseSchema>;
export type TransactionQuery = z.infer<typeof TransactionQuerySchema>;
export type UpdateTransactionStatusRequest = z.infer<typeof UpdateTransactionStatusRequestSchema>;
export type TransactionWebhook = z.infer<typeof TransactionWebhookSchema>;
