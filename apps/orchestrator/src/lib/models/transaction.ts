import {
  createModel,
  IBaseDocument,
  IBaseModel,
  validators,
} from '../schemas';
import { 
  TransactionType, 
  TransactionStatus,
  Transaction as SharedTransaction,
} from '@poolmind/shared-types';
import mongoose from 'mongoose';

// Custom validators for transaction-specific fields
const transactionValidators = {
  // Validate STX amount strings (positive numbers with up to 6 decimal places)
  stxAmount: {
    validator: function (v: string) {
      if (!v) return false;
      const parsed = parseFloat(v);
      return !isNaN(parsed) && parsed > 0 && /^\d+(\.\d{1,6})?$/.test(v);
    },
    message: 'Invalid STX amount format (must be positive number with up to 6 decimal places)',
  },
  
  // Validate transaction ID format (64 character hex string with 0x prefix)
  stacksTxId: {
    validator: function (v: string) {
      return !v || /^0x[a-fA-F0-9]{64}$/.test(v);
    },
    message: 'Invalid Stacks transaction ID format',
  },
  
  // Validate network type
  network: {
    validator: function (v: string) {
      return ['mainnet', 'testnet'].includes(v);
    },
    message: 'Network must be either mainnet or testnet',
  },
  
  // Validate transaction status
  transactionStatus: {
    validator: function (v: string) {
      return ['pending', 'broadcast', 'confirming', 'confirmed', 'failed', 'cancelled'].includes(v);
    },
    message: 'Invalid transaction status',
  },
  
  // Validate transaction type
  transactionType: {
    validator: function (v: string) {
      return ['deposit', 'withdrawal'].includes(v);
    },
    message: 'Transaction type must be either deposit or withdrawal',
  },
};

// Transaction model interface with custom statics
export interface ITransactionModel extends IBaseModel<ITransaction> {
  // Find by transaction ID
  findByTxId(txId: string): Promise<ITransaction | null>;
  
  // Find by user
  findByUserId(userId: string, options?: {
    type?: TransactionType;
    status?: TransactionStatus;
    limit?: number;
    skip?: number;
    sort?: Record<string, 1 | -1>;
  }): Promise<ITransaction[]>;
  
  // Find pending transactions for polling
  findPendingTransactions(maxRetries?: number): Promise<ITransaction[]>;
  
  // Find by status
  findByStatus(status: TransactionStatus): Promise<ITransaction[]>;
  
  // Find by type
  findByType(type: TransactionType): Promise<ITransaction[]>;
  
  // Get transaction statistics
  getStats(userId?: string): Promise<{
    totalTransactions: number;
    totalDeposits: number;
    totalWithdrawals: number;
    pendingTransactions: number;
    confirmedTransactions: number;
    failedTransactions: number;
    totalDepositAmount: string;
    totalWithdrawalAmount: string;
  }>;
  
  // Find transactions requiring confirmation
  findTransactionsForConfirmation(): Promise<ITransaction[]>;
  
  // Find user transactions with pagination
  findUserTransactionsPaginated(
    userId: string,
    page: number,
    limit: number,
    filters?: {
      type?: TransactionType;
      status?: TransactionStatus;
      fromDate?: Date;
      toDate?: Date;
      search?: string;
    }
  ): Promise<{
    transactions: ITransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
}

// Create the Transaction model
const Transaction = createModel<ITransaction>(
  'Transaction',
  {
    // User reference
    userId: {
      type: String,
      required: true,
      index: true,
    },
    
    // Transaction type and status
    type: {
      type: String,
      required: true,
      enum: ['deposit', 'withdrawal'],
      validate: transactionValidators.transactionType,
      index: true,
    },
    
    status: {
      type: String,
      required: true,
      enum: ['pending', 'broadcast', 'confirming', 'confirmed', 'failed', 'cancelled'],
      default: 'pending',
      validate: transactionValidators.transactionStatus,
      index: true,
    },
    
    // Base metadata
    metadata: {
      // Network information
      network: {
        type: String,
        required: true,
        enum: ['mainnet', 'testnet'],
        default: 'mainnet',
        validate: transactionValidators.network,
      },
      
      // Transaction identifiers
      txId: {
        type: String,
        sparse: true, // Allows null but unique when present
        validate: transactionValidators.stacksTxId,
      },
      
      blockHeight: {
        type: Number,
        min: 0,
        index: true,
      },
      
      // Amounts and fees
      amount: {
        type: String,
        required: true,
        validate: transactionValidators.stxAmount,
      },
      
      fee: {
        type: String,
        validate: transactionValidators.stxAmount,
      },
      
      // Stacks-specific data
      contractAddress: {
        type: String,
        validate: validators.stacksWalletAddress,
      },
      
      functionName: {
        type: String,
        trim: true,
      },
      
      functionArgs: [{
        type: mongoose.Schema.Types.Mixed,
      }],
      
      // Confirmation tracking
      confirmations: {
        type: Number,
        default: 0,
        min: 0,
      },
      
      requiredConfirmations: {
        type: Number,
        default: 6,
        min: 1,
      },
      
      // Error information
      errorMessage: {
        type: String,
        trim: true,
      },
      
      errorCode: {
        type: String,
        trim: true,
      },
      
      // Processing metadata
      retryCount: {
        type: Number,
        default: 0,
        min: 0,
        max: 10, // Prevent infinite retries
      },
      
      lastCheckedAt: {
        type: Date,
        index: true,
      },
      
      broadcastAt: {
        type: Date,
      },
      
      confirmedAt: {
        type: Date,
      },
    },
    
    // Type-specific metadata
    depositMetadata: {
      sourceAddress: {
        type: String,
        validate: validators.stacksWalletAddress,
      },
      
      destinationAddress: {
        type: String,
        validate: validators.stacksWalletAddress,
      },
      
      poolSharesExpected: {
        type: String,
        validate: transactionValidators.stxAmount,
      },
      
      poolSharesActual: {
        type: String,
        validate: transactionValidators.stxAmount,
      },
      
      expectedPrice: {
        type: String,
        validate: transactionValidators.stxAmount,
      },
      
      actualPrice: {
        type: String,
        validate: transactionValidators.stxAmount,
      },
      
      slippage: {
        type: String,
        validate: transactionValidators.stxAmount,
      },
    },
    
    withdrawalMetadata: {
      destinationAddress: {
        type: String,
        validate: validators.stacksWalletAddress,
      },
      
      sourceAddress: {
        type: String,
        validate: validators.stacksWalletAddress,
      },
      
      poolSharesBurned: {
        type: String,
        validate: transactionValidators.stxAmount,
      },
      
      minimumAmount: {
        type: String,
        validate: transactionValidators.stxAmount,
      },
      
      isEmergencyWithdrawal: {
        type: Boolean,
        default: false,
      },
      
      approvedBy: {
        type: String,
      },
      
      approvedAt: {
        type: Date,
      },
    },
    
    // Additional fields
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    
    tags: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
  },
  {
    // Additional instance methods
    additionalMethods: {
      // Get formatted amount
      getFormattedAmount() {
        const amount = parseFloat(this.metadata.amount);
        return `${amount.toFixed(6)} STX`;
      },
      
      // Check if transaction is complete
      isComplete() {
        return ['confirmed', 'failed', 'cancelled'].includes(this.status);
      },
      
      // Check if transaction is pending confirmation
      isPendingConfirmation() {
        return ['pending', 'broadcast', 'confirming'].includes(this.status);
      },
      
      // Get confirmation percentage
      getConfirmationPercentage() {
        if (this.status === 'confirmed') return 100;
        if (this.status === 'failed' || this.status === 'cancelled') return 0;
        return Math.min(100, (this.metadata.confirmations / this.metadata.requiredConfirmations) * 100);
      },
      
      // Update transaction status
      async updateStatus(
        status: TransactionStatus,
        updates?: {
          txId?: string;
          blockHeight?: number;
          confirmations?: number;
          errorMessage?: string;
          errorCode?: string;
          metadata?: Record<string, any>;
        }
      ) {
        this.status = status;
        this.metadata.lastCheckedAt = new Date();
        
        if (updates) {
          if (updates.txId) this.metadata.txId = updates.txId;
          if (updates.blockHeight) this.metadata.blockHeight = updates.blockHeight;
          if (updates.confirmations !== undefined) this.metadata.confirmations = updates.confirmations;
          if (updates.errorMessage) this.metadata.errorMessage = updates.errorMessage;
          if (updates.errorCode) this.metadata.errorCode = updates.errorCode;
          if (updates.metadata) {
            Object.assign(this.metadata, updates.metadata);
          }
        }
        
        // Set timestamps based on status
        if (status === 'broadcast' && !this.metadata.broadcastAt) {
          this.metadata.broadcastAt = new Date();
        }
        
        if (status === 'confirmed' && !this.metadata.confirmedAt) {
          this.metadata.confirmedAt = new Date();
        }
        
        return this.save();
      },
      
      // Increment retry count
      async incrementRetry() {
        this.metadata.retryCount += 1;
        this.metadata.lastCheckedAt = new Date();
        return this.save();
      },
      
      // Get transaction type-specific metadata
      getTypeMetadata() {
        if (this.type === 'deposit') {
          return this.depositMetadata;
        } else if (this.type === 'withdrawal') {
          return this.withdrawalMetadata;
        }
        return null;
      },
    },
    
    // Additional static methods
    additionalStatics: {
      // Find by transaction ID
      async findByTxId(txId: string) {
        return this.findOne({ 'metadata.txId': txId });
      },
      
      // Find by user with options
      async findByUserId(userId: string, options = {}) {
        const {
          type,
          status,
          limit = 20,
          skip = 0,
          sort = { createdAt: -1 }
        } = options;
        
        const query: any = { userId };
        if (type) query.type = type;
        if (status) query.status = status;
        
        return this.find(query)
          .sort(sort)
          .limit(limit)
          .skip(skip)
          .exec();
      },
      
      // Find pending transactions for polling
      async findPendingTransactions(maxRetries = 10) {
        return this.find({
          status: { $in: ['pending', 'broadcast', 'confirming'] },
          'metadata.retryCount': { $lt: maxRetries },
          $or: [
            { 'metadata.lastCheckedAt': { $exists: false } },
            { 'metadata.lastCheckedAt': { $lt: new Date(Date.now() - 30000) } } // 30 seconds ago
          ]
        }).sort({ createdAt: 1 });
      },
      
      // Find by status
      async findByStatus(status: TransactionStatus) {
        return this.find({ status });
      },
      
      // Find by type
      async findByType(type: TransactionType) {
        return this.find({ type });
      },
      
      // Get statistics
      async getStats(userId?: string) {
        const query = userId ? { userId } : {};
        
        const [stats] = await this.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              totalTransactions: { $sum: 1 },
              totalDeposits: {
                $sum: { $cond: [{ $eq: ['$type', 'deposit'] }, 1, 0] }
              },
              totalWithdrawals: {
                $sum: { $cond: [{ $eq: ['$type', 'withdrawal'] }, 1, 0] }
              },
              pendingTransactions: {
                $sum: { $cond: [{ $in: ['$status', ['pending', 'broadcast', 'confirming']] }, 1, 0] }
              },
              confirmedTransactions: {
                $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
              },
              failedTransactions: {
                $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
              },
              totalDepositAmount: {
                $sum: {
                  $cond: [
                    { $eq: ['$type', 'deposit'] },
                    { $toDouble: '$metadata.amount' },
                    0
                  ]
                }
              },
              totalWithdrawalAmount: {
                $sum: {
                  $cond: [
                    { $eq: ['$type', 'withdrawal'] },
                    { $toDouble: '$metadata.amount' },
                    0
                  ]
                }
              },
            }
          }
        ]);
        
        return stats || {
          totalTransactions: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          pendingTransactions: 0,
          confirmedTransactions: 0,
          failedTransactions: 0,
          totalDepositAmount: '0',
          totalWithdrawalAmount: '0',
        };
      },
      
      // Find transactions requiring confirmation
      async findTransactionsForConfirmation() {
        return this.find({
          status: { $in: ['broadcast', 'confirming'] },
          'metadata.txId': { $exists: true },
          'metadata.confirmations': { $lt: this.schema.path('metadata.requiredConfirmations').default }
        });
      },
      
      // Find user transactions with pagination
      async findUserTransactionsPaginated(userId: string, page: number, limit: number, filters = {}) {
        const {
          type,
          status,
          fromDate,
          toDate,
          search
        } = filters;
        
        const query: any = { userId };
        
        if (type) query.type = type;
        if (status) query.status = status;
        
        if (fromDate || toDate) {
          query.createdAt = {};
          if (fromDate) query.createdAt.$gte = fromDate;
          if (toDate) query.createdAt.$lte = toDate;
        }
        
        if (search) {
          query.$or = [
            { 'metadata.txId': { $regex: search, $options: 'i' } },
            { notes: { $regex: search, $options: 'i' } },
            { tags: { $regex: search, $options: 'i' } },
          ];
        }
        
        const skip = (page - 1) * limit;
        
        const [transactions, total] = await Promise.all([
          this.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec(),
          this.countDocuments(query)
        ]);
        
        return {
          transactions,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      },
    },
    
    // Indexes for better performance
    indexes: [
      [{ userId: 1, createdAt: -1 }], // User transactions by date
      [{ status: 1, 'metadata.lastCheckedAt': 1 }], // For polling service
      [{ type: 1, status: 1 }], // Type and status queries
      [{ 'metadata.confirmedAt': 1 }], // Confirmed transactions by date
      [{ 'metadata.retryCount': 1 }], // For retry tracking
    ],
  }
);

// Transaction interface extending base document
export interface ITransaction extends IBaseDocument {
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  
  metadata: {
    network: 'mainnet' | 'testnet';
    txId?: string;
    blockHeight?: number;
    amount: string;
    fee?: string;
    contractAddress?: string;
    contractName?: string;
    functionName?: string;
    functionArgs?: any[];
    confirmations: number;
    requiredConfirmations: number;
    errorMessage?: string;
    errorCode?: string;
    retryCount: number;
    lastCheckedAt?: Date;
    broadcastAt?: Date;
    confirmedAt?: Date;
  };
  
  depositMetadata?: {
    sourceAddress?: string;
    destinationAddress?: string;
    poolSharesExpected?: string;
    poolSharesActual?: string;
    expectedPrice?: string;
    actualPrice?: string;
    slippage?: string;
  };
  
  withdrawalMetadata?: {
    destinationAddress?: string;
    sourceAddress?: string;
    poolSharesBurned?: string;
    minimumAmount?: string;
    isEmergencyWithdrawal?: boolean;
    approvedBy?: string;
    approvedAt?: Date;
  };
  
  notes?: string;
  tags?: string[];
  
  // Instance methods
  getFormattedAmount(): string;
  isComplete(): boolean;
  isPendingConfirmation(): boolean;
  getConfirmationPercentage(): number;
  updateStatus(status: TransactionStatus, updates?: any): Promise<ITransaction>;
  incrementRetry(): Promise<ITransaction>;
  getTypeMetadata(): any;
}

export default Transaction as ITransactionModel;
