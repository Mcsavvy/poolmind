import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import {
  TransactionType,
  TransactionStatus,
  CreateDepositRequest,
  CreateWithdrawalRequest,
  TransactionQuery,
  UpdateTransactionStatusRequest,
  Transaction as SharedTransaction,
} from '@poolmind/shared-types';
import {
  ITransaction,
  type ITransactionModel,
} from '../lib/models/transaction';
import { type IUserModel } from '../lib/models/user';
import {
  NotificationsService,
  NotificationType,
} from '../notifications/notifications.service';
import { PoolMindContractService } from '../lib/contract-service';
import { AppConfig } from '../config/env.schema';

export interface TransactionCreationResult {
  transaction: ITransaction;
  success: boolean;
  message?: string;
}

export interface TransactionPaginationResult {
  transactions: ITransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel('Transaction')
    private readonly transactionModel: ITransactionModel,
    @InjectModel('User') private readonly userModel: IUserModel,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService<AppConfig>,
    private readonly contractService: PoolMindContractService,
  ) {}

  // =====================================
  // DEPOSIT TRANSACTION METHODS
  // =====================================

  /**
   * Create a new deposit transaction
   */
  async createDeposit(
    userId: string,
    createDepositDto: CreateDepositRequest,
  ): Promise<TransactionCreationResult> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Creating deposit transaction for user ${userId}: ${createDepositDto.amount} STX from ${createDepositDto.sourceAddress}`,
      );

      // Validate user exists
      const user = await this.userModel.findById(userId);
      if (!user) {
        this.logger.error(`User not found: ${userId}`);
        throw new NotFoundException('User not found');
      }

      // Validate amount
      const amount = parseFloat(createDepositDto.amount);
      if (isNaN(amount) || amount <= 0) {
        this.logger.error(`Invalid deposit amount: ${createDepositDto.amount}`);
        throw new BadRequestException('Invalid amount specified');
      }

      // Get pool contract address from config
      const poolContractAddress = this.configService.get<string>(
        'stacks.poolContractAddress',
      );
      const poolContractName = this.configService.get<string>(
        'stacks.poolContractName',
      );
      if (!poolContractAddress || !poolContractName) {
        this.logger.error('Pool contract address not configured');
        throw new InternalServerErrorException('Pool contract not configured');
      }

      // Fetch current pool state for NAV and fees from smart contract
      let poolState: {
        nav: string;
        entryFeeRate: string;
        exitFeeRate: string;
        totalPoolValue: string;
        totalShares: string;
      } | null = null;

      try {
        this.logger.debug(
          'Fetching real pool state from smart contract for deposit...',
        );
        poolState = await this.contractService.getPoolStateSnapshot();

        this.logger.debug(
          `Pool state loaded for deposit: NAV=${Number(poolState.nav) / 1000000} STX/PLMD, ` +
            `Entry Fee=${poolState.entryFeeRate}%, Pool Value=${Number(poolState.totalPoolValue) / 1000000} STX`,
        );
      } catch (error) {
        this.logger.warn(
          'Failed to fetch pool state from contract for deposit, using fallback values:',
          error,
        );
        poolState = {
          nav: '1000000', // 1 STX per PLMD (fallback)
          entryFeeRate: '0.5', // 0.5%
          exitFeeRate: '0.5', // 0.5%
          totalPoolValue: '10',
          totalShares: '10',
        };
      }

      // Calculate expected PLMD tokens based on real pool state
      const grossAmount = parseFloat(createDepositDto.amount);
      const entryFeeRate = poolState ? parseFloat(poolState.entryFeeRate) : 0.5;
      const nav = poolState ? parseFloat(poolState.nav) : 1000000;

      const entryFeeAmount = Math.floor((grossAmount * entryFeeRate) / 100);
      const netAmount = grossAmount - entryFeeAmount;
      const expectedShares = Math.floor((netAmount * 1000000) / nav); // TOKEN_PRECISION = 1000000

      this.logger.debug(
        `Deposit calculation: ${grossAmount / 1000000} STX -> ${expectedShares / 1000000} PLMD ` +
          `(fee: ${entryFeeAmount / 1000000} STX, net: ${netAmount / 1000000} STX, NAV: ${nav / 1000000})`,
      );

      // Create transaction document
      const transaction = new this.transactionModel({
        userId,
        type: 'deposit',
        status: 'broadcast', // Set to broadcast since we have the blockchain txId
        metadata: {
          network: createDepositDto.network,
          amount: createDepositDto.amount,
          txId: createDepositDto.txId, // Set the blockchain transaction ID immediately
          contractAddress: poolContractAddress,
          contractName: poolContractName,
          functionName: 'deposit',
          confirmations: 0,
          requiredConfirmations: 6,
          retryCount: 0,
          broadcastAt: new Date(), // Set broadcast time since transaction is already on blockchain
          // Pool state at time of transaction (CRITICAL for historical accuracy)
          nav: poolState?.nav,
          poolTotalValue: poolState?.totalPoolValue,
          poolTotalShares: poolState?.totalShares,
        },
        depositMetadata: {
          sourceAddress: createDepositDto.sourceAddress,
          destinationAddress: poolContractAddress,
          poolSharesExpected: expectedShares.toString(),
          tokensReceived: expectedShares.toString(), // PLMD tokens actually received
          entryFeeRate: entryFeeRate.toString(), // Entry fee rate at time of transaction
          entryFeeAmount: entryFeeAmount.toString(), // Actual entry fee amount in STX
        },
        notes: createDepositDto.notes,
        tags: createDepositDto.tags || [],
      });

      const savedTransaction = await transaction.save();
      const duration = Date.now() - startTime;

      this.logger.log(
        `✓ Deposit transaction created successfully in ${duration}ms - ID: ${savedTransaction._id}, Amount: ${createDepositDto.amount} STX`,
      );

      // Send notification to user
      try {
        await this.notificationsService.queueToUser(
          userId,
          {
            title: 'Deposit Created',
            body: `Your deposit of ${parseFloat(createDepositDto.amount) / 1000000} STX has been created and is pending confirmation.`,
            type: NotificationType.TRANSACTION,
          },
          { priority: 5 },
        );

        this.logger.debug(`Deposit notification queued for user ${userId}`);
      } catch (notificationError) {
        this.logger.warn(
          `Failed to queue deposit notification for user ${userId}:`,
          notificationError,
        );
        // Don't fail the transaction creation if notification fails
      }

      return {
        transaction: savedTransaction,
        success: true,
        message: 'Deposit transaction created successfully',
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to create deposit transaction for user ${userId} in ${duration}ms:`,
        error,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to create deposit transaction',
      );
    }
  }

  // =====================================
  // WITHDRAWAL TRANSACTION METHODS
  // =====================================

  /**
   * Create a new withdrawal transaction
   */
  async createWithdrawal(
    userId: string,
    createWithdrawalDto: CreateWithdrawalRequest,
  ): Promise<TransactionCreationResult> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Creating withdrawal transaction for user ${userId}: ${createWithdrawalDto.amount} STX to ${createWithdrawalDto.destinationAddress}`,
      );

      // Validate user exists
      const user = await this.userModel.findById(userId);
      if (!user) {
        this.logger.error(`User not found: ${userId}`);
        throw new NotFoundException('User not found');
      }

      // Validate amount
      const amount = parseFloat(createWithdrawalDto.amount);
      if (isNaN(amount) || amount <= 0) {
        this.logger.error(
          `Invalid withdrawal amount: ${createWithdrawalDto.amount}`,
        );
        throw new BadRequestException('Invalid amount specified');
      }

      // Get pool contract address from config
      const poolContractAddress = this.configService.get<string>(
        'stacks.poolContractAddress',
      );
      const poolContractName = this.configService.get<string>(
        'stacks.poolContractName',
      );
      if (!poolContractAddress || !poolContractName) {
        this.logger.error('Pool contract address or name not configured');
        throw new InternalServerErrorException('Pool contract not configured');
      }

      // Fetch current pool state for NAV and fees from smart contract
      let poolState: {
        nav: string;
        entryFeeRate: string;
        exitFeeRate: string;
        totalPoolValue: string;
        totalShares: string;
      } | null = null;

      try {
        this.logger.debug(
          'Fetching real pool state from smart contract for withdrawal...',
        );
        poolState = await this.contractService.getPoolStateSnapshot();

        this.logger.debug(
          `Pool state loaded for withdrawal: NAV=${Number(poolState.nav) / 1000000} STX/PLMD, ` +
            `Exit Fee=${poolState.exitFeeRate}%, Pool Value=${Number(poolState.totalPoolValue) / 1000000} STX`,
        );
      } catch (error) {
        this.logger.warn(
          'Failed to fetch pool state from contract for withdrawal, using fallback values:',
          error,
        );
        poolState = {
          nav: '1000000', // 1 STX per PLMD (fallback)
          entryFeeRate: '0.5', // 0.5%
          exitFeeRate: '0.5', // 0.5%
          totalPoolValue: '10',
          totalShares: '10',
        };
      }

      // Calculate PLMD tokens burned based on real pool state
      const netSTXAmount = parseFloat(createWithdrawalDto.amount);
      const exitFeeRate = poolState ? parseFloat(poolState.exitFeeRate) : 0.5;
      const nav = poolState ? parseFloat(poolState.nav) : 1000000;

      // Calculate gross STX amount before fees
      const grossSTXAmount = netSTXAmount / (1 - exitFeeRate / 100);
      const exitFeeAmount = grossSTXAmount - netSTXAmount;

      // Calculate PLMD tokens burned to get this STX amount
      const sharesBurned = Math.floor((grossSTXAmount * 1000000) / nav); // TOKEN_PRECISION = 1000000

      this.logger.debug(
        `Withdrawal calculation: ${sharesBurned / 1000000} PLMD -> ${netSTXAmount / 1000000} STX ` +
          `(fee: ${exitFeeAmount / 1000000} STX, gross: ${grossSTXAmount / 1000000} STX, NAV: ${nav / 1000000})`,
      );

      // Create transaction document
      const transaction = new this.transactionModel({
        userId,
        type: 'withdrawal',
        status: 'broadcast', // Set to broadcast since we have the blockchain txId
        metadata: {
          network: createWithdrawalDto.network,
          amount: createWithdrawalDto.amount,
          txId: createWithdrawalDto.txId, // Set the blockchain transaction ID immediately
          contractAddress: poolContractAddress,
          contractName: poolContractName,
          functionName: 'withdraw',
          confirmations: 0,
          requiredConfirmations: 6,
          retryCount: 0,
          broadcastAt: new Date(), // Set broadcast time since transaction is already on blockchain
          // Pool state at time of transaction (CRITICAL for historical accuracy)
          nav: poolState?.nav,
          poolTotalValue: poolState?.totalPoolValue,
          poolTotalShares: poolState?.totalShares,
        },
        withdrawalMetadata: {
          destinationAddress: createWithdrawalDto.destinationAddress,
          sourceAddress: poolContractAddress,
          poolSharesBurned:
            createWithdrawalDto.poolSharesBurned || sharesBurned.toString(),
          tokensBurned: sharesBurned.toString(), // PLMD tokens actually burned
          exitFeeRate: exitFeeRate.toString(), // Exit fee rate at time of transaction
          exitFeeAmount: Math.floor(exitFeeAmount).toString(), // Actual exit fee amount in STX
          minimumAmount: createWithdrawalDto.minimumAmount,
          isEmergencyWithdrawal:
            createWithdrawalDto.isEmergencyWithdrawal || false,
        },
        notes: createWithdrawalDto.notes,
        tags: createWithdrawalDto.tags || [],
      });

      const savedTransaction = await transaction.save();
      const duration = Date.now() - startTime;

      this.logger.log(
        `✓ Withdrawal transaction created successfully in ${duration}ms - ID: ${savedTransaction._id}, Amount: ${createWithdrawalDto.amount} STX`,
      );

      // Send notification to user
      try {
        await this.notificationsService.queueToUser(
          userId,
          {
            title: 'Withdrawal Created',
            body: `Your withdrawal of ${parseFloat(createWithdrawalDto.amount) / 1000000} STX has been created and is pending confirmation.`,
            type: NotificationType.TRANSACTION,
          },
          { priority: 5 },
        );

        this.logger.debug(`Withdrawal notification queued for user ${userId}`);
      } catch (notificationError) {
        this.logger.warn(
          `Failed to queue withdrawal notification for user ${userId}:`,
          notificationError,
        );
        // Don't fail the transaction creation if notification fails
      }

      return {
        transaction: savedTransaction,
        success: true,
        message: 'Withdrawal transaction created successfully',
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to create withdrawal transaction for user ${userId} in ${duration}ms:`,
        error,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to create withdrawal transaction',
      );
    }
  }

  // =====================================
  // TRANSACTION RETRIEVAL METHODS
  // =====================================

  /**
   * Get transaction by ID
   */
  async getTransactionById(
    transactionId: string,
    userId?: string,
  ): Promise<ITransaction> {
    try {
      this.logger.debug(
        `Fetching transaction ${transactionId}${userId ? ` for user ${userId}` : ''}`,
      );

      const query: any = { _id: transactionId };
      if (userId) {
        query.userId = userId;
      }

      const transaction = await this.transactionModel.findOne(query);
      if (!transaction) {
        this.logger.error(`Transaction not found: ${transactionId}`);
        throw new NotFoundException('Transaction not found');
      }

      this.logger.debug(`✓ Transaction fetched successfully: ${transactionId}`);
      return transaction;
    } catch (error) {
      this.logger.error(`Failed to fetch transaction ${transactionId}:`, error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to fetch transaction');
    }
  }

  /**
   * Get user transactions with pagination
   */
  async getUserTransactions(
    userId: string,
    query: TransactionQuery,
  ): Promise<TransactionPaginationResult> {
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Fetching transactions for user ${userId} - Page: ${query.page}, Limit: ${query.limit}, Type: ${query.type || 'all'}, Status: ${query.status || 'all'}`,
      );

      // Validate user exists
      const user = await this.userModel.findById(userId);
      if (!user) {
        this.logger.error(`User not found: ${userId}`);
        throw new NotFoundException('User not found');
      }

      // Build filters
      const filters: any = {};

      if (query.type) filters.type = query.type;
      if (query.status) filters.status = query.status;

      if (query.fromDate || query.toDate) {
        if (query.fromDate) filters.fromDate = new Date(query.fromDate);
        if (query.toDate) filters.toDate = new Date(query.toDate);
      }

      if (query.search) filters.search = query.search;

      // Get paginated results
      const result = await this.transactionModel.findUserTransactionsPaginated(
        userId,
        query.page,
        query.limit,
        filters,
      );

      const duration = Date.now() - startTime;

      this.logger.log(
        `✓ Fetched ${result.transactions.length} transactions for user ${userId} in ${duration}ms (${result.total} total)`,
      );

      return {
        transactions: result.transactions,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to fetch transactions for user ${userId} in ${duration}ms:`,
        error,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to fetch transactions');
    }
  }

  /**
   * Get transaction statistics for a user
   */
  async getUserTransactionStats(userId: string) {
    try {
      this.logger.debug(`Fetching transaction statistics for user ${userId}`);

      // Validate user exists
      const user = await this.userModel.findById(userId);
      if (!user) {
        this.logger.error(`User not found: ${userId}`);
        throw new NotFoundException('User not found');
      }

      const stats = await this.transactionModel.getStats(userId);

      this.logger.debug(`✓ Transaction statistics fetched for user ${userId}`);
      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to fetch transaction statistics for user ${userId}:`,
        error,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to fetch transaction statistics',
      );
    }
  }

  // =====================================
  // TRANSACTION STATUS UPDATE METHODS
  // =====================================

  /**
   * Update transaction status (used by polling service)
   */
  async updateTransactionStatus(
    transactionId: string,
    updateData: UpdateTransactionStatusRequest,
  ): Promise<ITransaction> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Updating transaction ${transactionId} status to ${updateData.status}${updateData.txId ? ` with txId ${updateData.txId}` : ''}`,
      );

      const transaction = await this.transactionModel.findById(transactionId);
      if (!transaction) {
        this.logger.error(`Transaction not found: ${transactionId}`);
        throw new NotFoundException('Transaction not found');
      }

      const previousStatus = transaction.status;

      // Update transaction
      const updatedTransaction = await transaction.updateStatus(
        updateData.status,
        {
          txId: updateData.txId,
          blockHeight: updateData.blockHeight,
          confirmations: updateData.confirmations,
          errorMessage: updateData.errorMessage,
          errorCode: updateData.errorCode,
          metadata: updateData.metadata,
        },
      );

      const duration = Date.now() - startTime;

      this.logger.log(
        `✓ Transaction ${transactionId} status updated from ${previousStatus} to ${updateData.status} in ${duration}ms`,
      );

      // Send notification if status changed to confirmed or failed
      if (
        (updateData.status === 'confirmed' || updateData.status === 'failed') &&
        previousStatus !== updateData.status
      ) {
        try {
          await this.sendTransactionStatusNotification(
            updatedTransaction,
            previousStatus,
          );
        } catch (notificationError) {
          this.logger.warn(
            `Failed to send status notification for transaction ${transactionId}:`,
            notificationError,
          );
          // Don't fail the status update if notification fails
        }
      }

      return updatedTransaction;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to update transaction ${transactionId} status in ${duration}ms:`,
        error,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to update transaction status',
      );
    }
  }

  // =====================================
  // INTERNAL HELPER METHODS
  // =====================================

  /**
   * Send notification when transaction status changes
   */
  private async sendTransactionStatusNotification(
    transaction: ITransaction,
    previousStatus: TransactionStatus,
  ): Promise<void> {
    const isConfirmed = transaction.status === 'confirmed';
    const isFailed = transaction.status === 'failed';

    if (!isConfirmed && !isFailed) {
      return; // Only notify on final states
    }

    const notificationTitle = isConfirmed
      ? `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} Confirmed`
      : `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} Failed`;

    const notificationBody = isConfirmed
      ? `Your ${transaction.type} of ${parseFloat(transaction.metadata.amount) / 1000000} STX has been confirmed.`
      : `Your ${transaction.type} of ${parseFloat(transaction.metadata.amount) / 1000000} STX has failed. ${transaction.metadata.errorMessage || 'Please try again or contact support.'}`;

    await this.notificationsService.queueToUser(
      transaction.userId,
      {
        title: notificationTitle,
        body: notificationBody,
        type: NotificationType.TRANSACTION,
      },
      { priority: isConfirmed ? 5 : 8 }, // Higher priority for failures
    );

    this.logger.debug(
      `Transaction status notification queued for user ${transaction.userId}: ${transaction.type} ${transaction.status}`,
    );
  }

  // =====================================
  // POLLING SERVICE HELPER METHODS
  // =====================================

  /**
   * Get pending transactions for polling service
   */
  async getPendingTransactions(maxRetries = 10): Promise<ITransaction[]> {
    try {
      this.logger.debug(
        `Fetching pending transactions for polling (maxRetries: ${maxRetries})`,
      );

      const transactions =
        await this.transactionModel.findPendingTransactions(maxRetries);

      this.logger.debug(
        `Found ${transactions.length} pending transactions for polling`,
      );
      return transactions;
    } catch (error) {
      this.logger.error(
        'Failed to fetch pending transactions for polling:',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to fetch pending transactions',
      );
    }
  }

  /**
   * Increment retry count for a transaction
   */
  async incrementTransactionRetry(
    transactionId: string,
  ): Promise<ITransaction> {
    try {
      const transaction = await this.transactionModel.findById(transactionId);
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      return await transaction.incrementRetry();
    } catch (error) {
      this.logger.error(
        `Failed to increment retry for transaction ${transactionId}:`,
        error,
      );
      throw error;
    }
  }

  // =====================================
  // ADMIN METHODS
  // =====================================

  /**
   * Get all transactions (admin only)
   */
  async getAllTransactions(
    query: TransactionQuery,
  ): Promise<TransactionPaginationResult> {
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Admin fetching all transactions - Page: ${query.page}, Limit: ${query.limit}`,
      );

      // Build filters
      const filters: any = {};

      if (query.type) filters.type = query.type;
      if (query.status) filters.status = query.status;
      if (query.userId) filters.userId = query.userId;

      if (query.fromDate || query.toDate) {
        if (query.fromDate) filters.fromDate = new Date(query.fromDate);
        if (query.toDate) filters.toDate = new Date(query.toDate);
      }

      if (query.search) filters.search = query.search;

      // For admin view, we'll create a similar pagination function
      const skip = (query.page - 1) * query.limit;
      const mongoQuery: any = {};

      if (filters.type) mongoQuery.type = filters.type;
      if (filters.status) mongoQuery.status = filters.status;
      if (filters.userId) mongoQuery.userId = filters.userId;

      if (filters.fromDate || filters.toDate) {
        mongoQuery.createdAt = {};
        if (filters.fromDate) mongoQuery.createdAt.$gte = filters.fromDate;
        if (filters.toDate) mongoQuery.createdAt.$lte = filters.toDate;
      }

      if (filters.search) {
        mongoQuery.$or = [
          { 'metadata.txId': { $regex: filters.search, $options: 'i' } },
          { notes: { $regex: filters.search, $options: 'i' } },
          { tags: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const [transactions, total] = await Promise.all([
        this.transactionModel
          .find(mongoQuery)
          .sort({ [query.sortBy]: query.sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(query.limit)
          .exec(),
        this.transactionModel.countDocuments(mongoQuery),
      ]);

      const duration = Date.now() - startTime;

      this.logger.log(
        `✓ Admin fetched ${transactions.length} transactions in ${duration}ms (${total} total)`,
      );

      return {
        transactions,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to fetch all transactions in ${duration}ms:`,
        error,
      );
      throw new InternalServerErrorException('Failed to fetch transactions');
    }
  }

  /**
   * Get global transaction statistics (admin only)
   */
  async getGlobalTransactionStats() {
    try {
      this.logger.debug('Fetching global transaction statistics');

      const stats = await this.transactionModel.getStats();

      this.logger.debug('✓ Global transaction statistics fetched');
      return stats;
    } catch (error) {
      this.logger.error(
        'Failed to fetch global transaction statistics:',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to fetch transaction statistics',
      );
    }
  }

  /**
   * Get the transaction model (for polling service)
   */
  getTransactionModel() {
    return this.transactionModel;
  }
}
