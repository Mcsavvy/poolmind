import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Logger,
  HttpStatus,
  HttpCode,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import type { 
  CreateDepositRequest,
  CreateWithdrawalRequest,
  TransactionQuery,
  UpdateTransactionStatusRequest,
  TransactionResponse,
  TransactionListResponse,
  ApiResponse as SharedApiResponse,
} from '@poolmind/shared-types';
import { TransactionsService } from './transactions.service';
import { StacksPollingService } from './stacks-polling.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { IUser } from '../lib/models/user';

@ApiTags('Transactions')
@Controller('transactions')
@ApiBearerAuth()
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly stacksPollingService: StacksPollingService,
  ) {}

  // =====================================
  // DEPOSIT ENDPOINTS
  // =====================================

  @Post('deposits')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a deposit transaction',
    description: 'Creates a new deposit transaction for the authenticated user. The transaction will be set to pending status and monitored for confirmation.',
  })
  @ApiResponse({
    status: 201,
    description: 'Deposit transaction created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            transaction: {
              type: 'object',
              description: 'The created transaction object',
            },
          },
        },
        message: { type: 'string', example: 'Deposit transaction created successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Invalid amount specified' },
      },
    },
  })
  @ApiBody({
    type: 'object',
    schema: {
      type: 'object',
      required: ['amount', 'sourceAddress', 'txId'],
      properties: {
        amount: {
          type: 'string',
          description: 'Amount of STX to deposit (as string to preserve precision)',
          example: '100.000000',
        },
        sourceAddress: {
          type: 'string',
          description: 'Stacks wallet address sending the deposit',
          example: 'SP1HTBVD3JG9C05J7HBJTHGR0GGW7KX975CN9AX18',
        },
        txId: {
          type: 'string',
          description: 'Blockchain transaction ID (mandatory)',
          example: '0x1234567890abcdef1234567890abcdef12345678',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet'],
          description: 'Network to use for the transaction',
          example: 'mainnet',
        },
        notes: {
          type: 'string',
          description: 'Optional notes for the transaction',
          example: 'First deposit to the pool',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags for categorization',
          example: ['initial', 'large'],
        },
      },
    },
  })
  async createDeposit(
    @CurrentUser() user: IUser,
    @Body(new ValidationPipe({ transform: true })) createDepositDto: CreateDepositRequest,
  ): Promise<SharedApiResponse<TransactionResponse>> {
    try {
      this.logger.log(`Creating deposit for user ${user.id}: ${createDepositDto.amount} STX`);

      const result = await this.transactionsService.createDeposit(user.id, createDepositDto);

      // Queue the transaction for immediate polling
      try {
        await this.stacksPollingService.queueTransactionForPolling(result.transaction, 10);
      } catch (pollingError) {
        this.logger.warn(`Failed to queue deposit for polling: ${pollingError.message}`);
        // Don't fail the request if polling queue fails
      }

      this.logger.log(`✓ Deposit created successfully: ${result.transaction._id}`);

      return {
        success: true,
        data: {
          transaction: result.transaction as any,
          success: true,
          message: result.message,
        },
        message: result.message,
      };

    } catch (error) {
      this.logger.error(`Failed to create deposit for user ${user.id}:`, error);
      
      return {
        success: false,
        error: error.message || 'Failed to create deposit',
      };
    }
  }

  // =====================================
  // WITHDRAWAL ENDPOINTS
  // =====================================

  @Post('withdrawals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a withdrawal transaction',
    description: 'Creates a new withdrawal transaction for the authenticated user. The transaction will be set to pending status and monitored for confirmation.',
  })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal transaction created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            transaction: {
              type: 'object',
              description: 'The created transaction object',
            },
          },
        },
        message: { type: 'string', example: 'Withdrawal transaction created successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Invalid amount specified' },
      },
    },
  })
  @ApiBody({
    type: 'object',
    schema: {
      type: 'object',
      required: ['amount', 'destinationAddress', 'txId'],
      properties: {
        amount: {
          type: 'string',
          description: 'Amount of STX to withdraw (as string to preserve precision)',
          example: '50.000000',
        },
        destinationAddress: {
          type: 'string',
          description: 'Stacks wallet address to receive the withdrawal',
          example: 'SP1HTBVD3JG9C05J7HBJTHGR0GGW7KX975CN9AX18',
        },
        txId: {
          type: 'string',
          description: 'Blockchain transaction ID (mandatory)',
          example: '0x1234567890abcdef1234567890abcdef12345678',
        },
        poolSharesBurned: {
          type: 'string',
          description: 'Amount of pool shares to burn for this withdrawal',
          example: '45.123456',
        },
        minimumAmount: {
          type: 'string',
          description: 'Minimum STX amount to receive (slippage protection)',
          example: '49.000000',
        },
        isEmergencyWithdrawal: {
          type: 'boolean',
          description: 'Whether this is an emergency withdrawal',
          example: false,
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet'],
          description: 'Network to use for the transaction',
          example: 'mainnet',
        },
        notes: {
          type: 'string',
          description: 'Optional notes for the transaction',
          example: 'Partial withdrawal for expenses',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags for categorization',
          example: ['partial', 'expenses'],
        },
      },
    },
  })
  async createWithdrawal(
    @CurrentUser() user: IUser,
    @Body(new ValidationPipe({ transform: true })) createWithdrawalDto: CreateWithdrawalRequest,
  ): Promise<SharedApiResponse<TransactionResponse>> {
    try {
      this.logger.log(`Creating withdrawal for user ${user.id}: ${createWithdrawalDto.amount} STX`);

      const result = await this.transactionsService.createWithdrawal(user.id, createWithdrawalDto);

      // Queue the transaction for immediate polling
      try {
        await this.stacksPollingService.queueTransactionForPolling(result.transaction, 10);
      } catch (pollingError) {
        this.logger.warn(`Failed to queue withdrawal for polling: ${pollingError.message}`);
        // Don't fail the request if polling queue fails
      }

      this.logger.log(`✓ Withdrawal created successfully: ${result.transaction._id}`);

      return {
        success: true,
        data: {
          transaction: result.transaction as any,
          success: true,
          message: result.message,
        },
        message: result.message,
      };

    } catch (error) {
      this.logger.error(`Failed to create withdrawal for user ${user.id}:`, error);
      
      return {
        success: false,
        error: error.message || 'Failed to create withdrawal',
      };
    }
  }

  // =====================================
  // TRANSACTION RETRIEVAL ENDPOINTS
  // =====================================

  @Get(':id')
  @ApiOperation({
    summary: 'Get transaction by ID',
    description: 'Retrieves a specific transaction by its ID. Users can only access their own transactions unless they are admin/moderator.',
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          description: 'Transaction object',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Transaction not found' },
      },
    },
  })
  async getTransaction(
    @Param('id') transactionId: string,
    @CurrentUser() user: IUser,
  ): Promise<SharedApiResponse> {
    try {
      this.logger.debug(`Getting transaction ${transactionId} for user ${user.id}`);

      // Allow admin/moderator to view any transaction, others only their own
      const userId = user.role === 'admin' || user.role === 'moderator' ? undefined : user.id;
      
      const transaction = await this.transactionsService.getTransactionById(transactionId, userId);

      this.logger.debug(`✓ Transaction ${transactionId} retrieved successfully`);

      return {
        success: true,
        data: transaction,
      };

    } catch (error) {
      this.logger.error(`Failed to get transaction ${transactionId}:`, error);
      
      return {
        success: false,
        error: error.message || 'Failed to retrieve transaction',
      };
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Get user transactions',
    description: 'Retrieves transactions for the authenticated user with pagination and filtering options.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (1-100)', example: 20 })
  @ApiQuery({ name: 'type', required: false, enum: ['deposit', 'withdrawal'], description: 'Filter by transaction type' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'broadcast', 'confirming', 'confirmed', 'failed', 'cancelled'], description: 'Filter by transaction status' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt', 'amount'], description: 'Sort field', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order', example: 'desc' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in notes, txId, addresses' })
  @ApiQuery({ name: 'fromDate', required: false, type: String, description: 'Filter from date (ISO string)' })
  @ApiQuery({ name: 'toDate', required: false, type: String, description: 'Filter to date (ISO string)' })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            transactions: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of transaction objects',
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 20 },
                total: { type: 'number', example: 150 },
                totalPages: { type: 'number', example: 8 },
              },
            },
          },
        },
      },
    },
  })
  async getUserTransactions(
    @Query(new ValidationPipe({ transform: true })) query: TransactionQuery,
    @CurrentUser() user: IUser,
  ): Promise<SharedApiResponse<TransactionListResponse>> {
    try {
      this.logger.debug(`Getting transactions for user ${user.id} - Page: ${query.page}, Limit: ${query.limit}`);

      const result = await this.transactionsService.getUserTransactions(user.id, query);

      this.logger.debug(`✓ Retrieved ${result.transactions.length} transactions for user ${user.id}`);

      return {
        success: true,
        data: {
          transactions: result.transactions as any,
          pagination: result.pagination,
          success: true,
        },
      };

    } catch (error) {
      this.logger.error(`Failed to get transactions for user ${user.id}:`, error);
      
      return {
        success: false,
        error: error.message || 'Failed to retrieve transactions',
      };
    }
  }

  @Get('stats/summary')
  @ApiOperation({
    summary: 'Get user transaction statistics',
    description: 'Retrieves transaction statistics and summary for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalTransactions: { type: 'number', example: 25 },
            totalDeposits: { type: 'number', example: 15 },
            totalWithdrawals: { type: 'number', example: 10 },
            pendingTransactions: { type: 'number', example: 2 },
            confirmedTransactions: { type: 'number', example: 20 },
            failedTransactions: { type: 'number', example: 3 },
            totalDepositAmount: { type: 'string', example: '1500.000000' },
            totalWithdrawalAmount: { type: 'string', example: '500.000000' },
          },
        },
      },
    },
  })
  async getUserTransactionStats(
    @CurrentUser() user: IUser,
  ): Promise<SharedApiResponse> {
    try {
      this.logger.debug(`Getting transaction statistics for user ${user.id}`);

      const stats = await this.transactionsService.getUserTransactionStats(user.id);

      this.logger.debug(`✓ Transaction statistics retrieved for user ${user.id}`);

      return {
        success: true,
        data: stats,
      };

    } catch (error) {
      this.logger.error(`Failed to get transaction statistics for user ${user.id}:`, error);
      
      return {
        success: false,
        error: error.message || 'Failed to retrieve transaction statistics',
      };
    }
  }

  // =====================================
  // ADMIN ENDPOINTS
  // =====================================

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({
    summary: 'Get all transactions (Admin)',
    description: 'Retrieves all transactions in the system with pagination and filtering. Admin/moderator access only.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (1-100)', example: 20 })
  @ApiQuery({ name: 'type', required: false, enum: ['deposit', 'withdrawal'], description: 'Filter by transaction type' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'broadcast', 'confirming', 'confirmed', 'failed', 'cancelled'], description: 'Filter by transaction status' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt', 'amount'], description: 'Sort field', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order', example: 'desc' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in notes, txId, addresses' })
  @ApiQuery({ name: 'fromDate', required: false, type: String, description: 'Filter from date (ISO string)' })
  @ApiQuery({ name: 'toDate', required: false, type: String, description: 'Filter to date (ISO string)' })
  @ApiResponse({
    status: 200,
    description: 'All transactions retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async getAllTransactions(
    @Query(new ValidationPipe({ transform: true })) query: TransactionQuery,
    @CurrentUser() user: IUser,
  ): Promise<SharedApiResponse<TransactionListResponse>> {
    try {
      this.logger.log(`Admin ${user.id} requesting all transactions - Page: ${query.page}, Limit: ${query.limit}`);

      const result = await this.transactionsService.getAllTransactions(query);

      this.logger.log(`✓ Retrieved ${result.transactions.length} transactions for admin ${user.id}`);

      return {
        success: true,
        data: {
          transactions: result.transactions as any,
          pagination: result.pagination,
          success: true,
        },
      };

    } catch (error) {
      this.logger.error(`Failed to get all transactions for admin ${user.id}:`, error);
      
      return {
        success: false,
        error: error.message || 'Failed to retrieve transactions',
      };
    }
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({
    summary: 'Get global transaction statistics (Admin)',
    description: 'Retrieves global transaction statistics for the entire system. Admin/moderator access only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Global transaction statistics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async getGlobalTransactionStats(
    @CurrentUser() user: IUser,
  ): Promise<SharedApiResponse> {
    try {
      this.logger.log(`Admin ${user.id} requesting global transaction statistics`);

      const stats = await this.transactionsService.getGlobalTransactionStats();

      this.logger.log(`✓ Global transaction statistics retrieved for admin ${user.id}`);

      return {
        success: true,
        data: stats,
      };

    } catch (error) {
      this.logger.error(`Failed to get global transaction statistics for admin ${user.id}:`, error);
      
      return {
        success: false,
        error: error.message || 'Failed to retrieve global statistics',
      };
    }
  }

  // =====================================
  // POLLING CONTROL ENDPOINTS
  // =====================================

  @Post(':id/poll')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({
    summary: 'Trigger manual polling (Admin)',
    description: 'Manually triggers polling for a specific transaction. Admin/moderator access only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Polling triggered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Polling triggered successfully' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async triggerPolling(
    @Param('id') transactionId: string,
    @CurrentUser() user: IUser,
  ): Promise<SharedApiResponse> {
    try {
      this.logger.log(`Admin ${user.id} triggering polling for transaction ${transactionId}`);

      await this.stacksPollingService.triggerTransactionPolling(transactionId, 20);

      this.logger.log(`✓ Polling triggered for transaction ${transactionId} by admin ${user.id}`);

      return {
        success: true,
        message: 'Polling triggered successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to trigger polling for transaction ${transactionId}:`, error);
      
      return {
        success: false,
        error: error.message || 'Failed to trigger polling',
      };
    }
  }

  @Get('admin/queue-stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({
    summary: 'Get polling queue statistics (Admin)',
    description: 'Retrieves statistics about the polling queue. Admin/moderator access only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            waiting: { type: 'number', example: 5 },
            active: { type: 'number', example: 2 },
            completed: { type: 'number', example: 150 },
            failed: { type: 'number', example: 3 },
            delayed: { type: 'number', example: 1 },
            totalJobs: { type: 'number', example: 8 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async getQueueStats(
    @CurrentUser() user: IUser,
  ): Promise<SharedApiResponse> {
    try {
      this.logger.debug(`Admin ${user.id} requesting queue statistics`);

      const stats = await this.stacksPollingService.getQueueStats();

      this.logger.debug(`✓ Queue statistics retrieved for admin ${user.id}`);

      return {
        success: true,
        data: stats,
      };

    } catch (error) {
      this.logger.error(`Failed to get queue statistics for admin ${user.id}:`, error);
      
      return {
        success: false,
        error: error.message || 'Failed to retrieve queue statistics',
      };
    }
  }

  // =====================================
  // INTERNAL UPDATE ENDPOINT
  // =====================================

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Update transaction status (Internal)',
    description: 'Updates the status of a transaction. This endpoint is primarily for internal use by the polling service. Admin access only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    type: 'object',
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'broadcast', 'confirming', 'confirmed', 'failed', 'cancelled'],
          description: 'New transaction status',
        },
        txId: {
          type: 'string',
          description: 'Stacks transaction ID',
          example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        },
        blockHeight: {
          type: 'number',
          description: 'Block height where transaction was included',
          example: 123456,
        },
        confirmations: {
          type: 'number',
          description: 'Number of confirmations',
          example: 6,
        },
        errorMessage: {
          type: 'string',
          description: 'Error message if transaction failed',
        },
        errorCode: {
          type: 'string',
          description: 'Error code if transaction failed',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction status updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async updateTransactionStatus(
    @Param('id') transactionId: string,
    @Body(new ValidationPipe({ transform: true })) updateData: UpdateTransactionStatusRequest,
    @CurrentUser() user: IUser,
  ): Promise<SharedApiResponse> {
    try {
      this.logger.log(
        `Admin ${user.id} updating transaction ${transactionId} status to ${updateData.status}`
      );

      const transaction = await this.transactionsService.updateTransactionStatus(
        transactionId,
        updateData
      );

      this.logger.log(`✓ Transaction ${transactionId} status updated by admin ${user.id}`);

      return {
        success: true,
        data: transaction,
        message: 'Transaction status updated successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to update transaction ${transactionId} status:`, error);
      
      return {
        success: false,
        error: error.message || 'Failed to update transaction status',
      };
    }
  }
}
