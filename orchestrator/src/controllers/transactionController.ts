import { Request, Response } from "express";
import { IUser } from "../models/User";
import { queueService, TransactionQueueData } from "../services/queueService";
import { transactionPollingService } from "../services/transactionPollingService";
import winston from "winston";
import { config } from "../config";

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "transaction-controller" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: config.logging.files.combined,
    }),
  ],
});

export class TransactionController {
  /**
   * @swagger
   * /api/v1/transactions/submit:
   *   post:
   *     summary: Submit a transaction for polling
   *     description: Submit a transaction ID along with transaction details to be monitored by the backend
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - txId
   *               - type
   *             properties:
   *               txId:
   *                 type: string
   *                 description: The transaction ID from the blockchain
   *                 example: "0x1234567890abcdef"
   *               type:
   *                 type: string
   *                 enum: [deposit, withdrawal]
   *                 description: Type of transaction
   *                 example: "deposit"
   *               stxAmount:
   *                 type: number
   *                 description: Amount in microSTX (for deposits)
   *                 example: 1000000
   *               plmdAmount:
   *                 type: number
   *                 description: Amount in PLMD tokens (for withdrawals)
   *                 example: 1000000
   *               nav:
   *                 type: number
   *                 description: NAV at time of transaction
   *                 example: 1000000
   *               fee:
   *                 type: number
   *                 description: Fee amount in microSTX
   *                 example: 5000
   *               netAmount:
   *                 type: number
   *                 description: Net amount after fees
   *                 example: 995000
   *     responses:
   *       201:
   *         description: Transaction submitted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Transaction submitted for monitoring"
   *                 data:
   *                   type: object
   *                   properties:
   *                     txId:
   *                       type: string
   *                       example: "0x1234567890abcdef"
   *                     status:
   *                       type: string
   *                       example: "pending"
   *                     timeoutAt:
   *                       type: string
   *                       format: date-time
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       409:
   *         description: Transaction already exists
   *       500:
   *         description: Server error
   */
  static async submitTransaction(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const { txId, type, stxAmount, plmdAmount, nav, fee, netAmount } =
        req.body;

      // Validate required fields
      if (!txId || !type) {
        res.status(400).json({
          success: false,
          message: "Transaction ID and type are required",
        });
        return;
      }

      if (!["deposit", "withdrawal"].includes(type)) {
        res.status(400).json({
          success: false,
          message: "Transaction type must be 'deposit' or 'withdrawal'",
        });
        return;
      }

      if (!user.walletAddress) {
        res.status(400).json({
          success: false,
          message: "User wallet address is required",
        });
        return;
      }

      // Check if transaction already exists
      const existingTransaction =
        await transactionPollingService.getTransaction(txId);
      if (existingTransaction) {
        res.status(409).json({
          success: false,
          message: "Transaction already exists",
          data: {
            txId,
            status: existingTransaction.status,
            createdAt: existingTransaction.createdAt,
          },
        });
        return;
      }

      // Create transaction data
      const transactionData: TransactionQueueData = {
        txId,
        userId: user._id.toString(),
        userAddress: user.walletAddress,
        type,
        stxAmount,
        plmdAmount,
        nav,
        fee,
        netAmount,
      };

      // Create transaction in database
      const transaction =
        await transactionPollingService.createTransaction(transactionData);

      // Add to queue for polling
      await queueService.addTransactionToQueue(transactionData);

      logger.info("Transaction submitted for monitoring", {
        txId,
        userId: user._id.toString(),
        type,
        userAddress: user.walletAddress,
      });

      res.status(201).json({
        success: true,
        message: "Transaction submitted for monitoring",
        data: {
          txId: transaction.txId,
          status: transaction.status,
          type: transaction.type,
          timeoutAt: transaction.timeoutAt,
          createdAt: transaction.createdAt,
        },
      });
    } catch (error) {
      logger.error("Failed to submit transaction", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId: (req.user as IUser)?._id?.toString(),
        txId: req.body?.txId,
      });

      res.status(500).json({
        success: false,
        message: "Failed to submit transaction",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * @swagger
   * /api/v1/transactions/{txId}/status:
   *   get:
   *     summary: Get transaction status
   *     description: Get the current status of a transaction
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: txId
   *         required: true
   *         schema:
   *           type: string
   *         description: The transaction ID
   *         example: "0x1234567890abcdef"
   *     responses:
   *       200:
   *         description: Transaction status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     txId:
   *                       type: string
   *                       example: "0x1234567890abcdef"
   *                     status:
   *                       type: string
   *                       enum: [pending, success, failed, timeout]
   *                       example: "success"
   *                     type:
   *                       type: string
   *                       enum: [deposit, withdrawal]
   *                       example: "deposit"
   *                     stxAmount:
   *                       type: number
   *                       example: 1000000
   *                     plmdAmount:
   *                       type: number
   *                       example: 1000000
   *                     blockHeight:
   *                       type: number
   *                       example: 12345
   *                     retryCount:
   *                       type: number
   *                       example: 3
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                     confirmedAt:
   *                       type: string
   *                       format: date-time
   *       404:
   *         description: Transaction not found
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  static async getTransactionStatus(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const user = req.user as IUser;
      const { txId } = req.params;

      const transaction = await transactionPollingService.getTransaction(txId);

      if (!transaction) {
        res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
        return;
      }

      // Check if user owns this transaction
      if (transaction.userId !== user._id.toString()) {
        res.status(403).json({
          success: false,
          message: "Access denied",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          txId: transaction.txId,
          status: transaction.status,
          type: transaction.type,
          stxAmount: transaction.stxAmount,
          plmdAmount: transaction.plmdAmount,
          nav: transaction.nav,
          fee: transaction.fee,
          netAmount: transaction.netAmount,
          blockHeight: transaction.blockHeight,
          retryCount: transaction.retryCount,
          errorMessage: transaction.errorMessage,
          createdAt: transaction.createdAt,
          confirmedAt: transaction.confirmedAt,
          timeoutAt: transaction.timeoutAt,
        },
      });
    } catch (error) {
      logger.error("Failed to get transaction status", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId: (req.user as IUser)?._id?.toString(),
        txId: req.params?.txId,
      });

      res.status(500).json({
        success: false,
        message: "Failed to get transaction status",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * @swagger
   * /api/v1/transactions:
   *   get:
   *     summary: Get user transactions
   *     description: Get a list of transactions for the authenticated user
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of transactions to return
   *       - in: query
   *         name: skip
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Number of transactions to skip
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [deposit, withdrawal]
   *         description: Filter by transaction type
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, success, failed, timeout]
   *         description: Filter by transaction status
   *     responses:
   *       200:
   *         description: Transactions retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     transactions:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           txId:
   *                             type: string
   *                           status:
   *                             type: string
   *                           type:
   *                             type: string
   *                           stxAmount:
   *                             type: number
   *                           plmdAmount:
   *                             type: number
   *                           createdAt:
   *                             type: string
   *                             format: date-time
   *                     pagination:
   *                       type: object
   *                       properties:
   *                         limit:
   *                           type: number
   *                         skip:
   *                           type: number
   *                         total:
   *                           type: number
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  static async getUserTransactions(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = parseInt(req.query.skip as string) || 0;
      const typeFilter = req.query.type as string;
      const statusFilter = req.query.status as string;

      // Build query
      const query: any = { userId: user._id.toString() };

      if (typeFilter && ["deposit", "withdrawal"].includes(typeFilter)) {
        query.type = typeFilter;
      }

      if (
        statusFilter &&
        ["pending", "success", "failed", "timeout"].includes(statusFilter)
      ) {
        query.status = statusFilter;
      }

      // Get transactions and total count
      const [transactions, total] = await Promise.all([
        transactionPollingService.getUserTransactions(
          user._id.toString(),
          limit,
          skip,
        ),
        // For now, we'll use the same service method without filters
        // In a real implementation, you'd want to add filter support to the service
        transactionPollingService
          .getUserTransactions(user._id.toString(), 0, 0)
          .then((txs) => txs.length),
      ]);

      res.status(200).json({
        success: true,
        data: {
          transactions: transactions.map((tx) => ({
            txId: tx.txId,
            status: tx.status,
            type: tx.type,
            stxAmount: tx.stxAmount,
            plmdAmount: tx.plmdAmount,
            nav: tx.nav,
            fee: tx.fee,
            netAmount: tx.netAmount,
            blockHeight: tx.blockHeight,
            retryCount: tx.retryCount,
            errorMessage: tx.errorMessage,
            createdAt: tx.createdAt,
            confirmedAt: tx.confirmedAt,
            timeoutAt: tx.timeoutAt,
          })),
          pagination: {
            limit,
            skip,
            total,
          },
        },
      });
    } catch (error) {
      logger.error("Failed to get user transactions", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId: (req.user as IUser)?._id?.toString(),
      });

      res.status(500).json({
        success: false,
        message: "Failed to get user transactions",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * @swagger
   * /api/v1/transactions/queue/stats:
   *   get:
   *     summary: Get queue statistics (Admin only)
   *     description: Get statistics about the transaction polling queue
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Queue statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     polling:
   *                       type: object
   *                       properties:
   *                         waiting:
   *                           type: number
   *                         active:
   *                           type: number
   *                         completed:
   *                           type: number
   *                         failed:
   *                           type: number
   *                     cleanup:
   *                       type: object
   *                       properties:
   *                         waiting:
   *                           type: number
   *                         active:
   *                           type: number
   *                         completed:
   *                           type: number
   *                         failed:
   *                           type: number
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  static async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await queueService.getQueueStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Failed to get queue stats", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      res.status(500).json({
        success: false,
        message: "Failed to get queue statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
