import { Request, Response } from "express";
import {
  stxTransferService,
  STXTransferParams,
} from "../services/stxTransferService";
import winston from "winston";
import { config } from "../config";

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "fund-request-controller" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: config.logging.files.combined,
    }),
  ],
});

export interface FundRequestBody {
  recipientAddress: string;
  amount: number; // Amount in STX (will be converted to microSTX)
  memo?: string;
}

export class FundRequestController {
  /**
   * @swagger
   * /api/v1/fund-request:
   *   post:
   *     summary: Request funds from the orchestrator
   *     description: Secure endpoint for trading bot to request STX funds from the admin wallet
   *     tags: [Fund Request]
   *     security:
   *       - hmacAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - recipientAddress
   *               - amount
   *             properties:
   *               recipientAddress:
   *                 type: string
   *                 description: STX address to receive the funds
   *                 example: "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE"
   *               amount:
   *                 type: number
   *                 description: Amount in STX to transfer
   *                 example: 10.5
   *               memo:
   *                 type: string
   *                 description: Optional memo for the transfer
   *                 example: "Trading bot funding request"
   *     responses:
   *       200:
   *         description: Fund transfer initiated successfully
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
   *                   example: "Fund transfer initiated successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     txId:
   *                       type: string
   *                       example: "0x1234567890abcdef"
   *                     recipientAddress:
   *                       type: string
   *                       example: "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE"
   *                     amount:
   *                       type: number
   *                       example: 10.5
   *                     amountMicroSTX:
   *                       type: number
   *                       example: 10500000
   *                     memo:
   *                       type: string
   *                       example: "Trading bot funding request"
   *                     senderAddress:
   *                       type: string
   *                       example: "SP1HTBVD3JG9C05J7HBJTHGR0GGW7KX975CN0QKK"
   *       400:
   *         description: Invalid request data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Invalid recipient address"
   *       401:
   *         description: Invalid HMAC signature
   *       500:
   *         description: Transfer failed
   */
  static async requestFunds(req: Request, res: Response): Promise<void> {
    try {
      const { recipientAddress, amount, memo }: FundRequestBody = req.body;

      // Validate required fields
      if (!recipientAddress || !amount) {
        res.status(400).json({
          success: false,
          message: "Recipient address and amount are required",
        });
        return;
      }

      // Validate amount
      if (amount <= 0) {
        res.status(400).json({
          success: false,
          message: "Amount must be greater than 0",
        });
        return;
      }

      // Validate STX address format
      if (!stxTransferService.validateSTXAddress(recipientAddress)) {
        res.status(400).json({
          success: false,
          message: "Invalid STX address format",
        });
        return;
      }

      // Convert STX to microSTX
      const amountMicroSTX = Math.floor(amount * 1_000_000);

      // Log the fund request
      logger.info("Fund request received", {
        recipientAddress,
        amount,
        amountMicroSTX,
        memo,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
      });

      // Prepare transfer parameters
      const transferParams: STXTransferParams = {
        recipientAddress,
        amount: amountMicroSTX,
        memo: memo || `Fund request - ${new Date().toISOString()}`,
      };

      // Execute the transfer
      const result = await stxTransferService.transferSTX(transferParams);

      if (!result.success) {
        logger.error("Fund transfer failed", {
          recipientAddress,
          amount,
          error: result.error,
        });

        res.status(500).json({
          success: false,
          message: "Fund transfer failed",
          error: result.error,
        });
        return;
      }

      // Log successful transfer
      logger.info("Fund transfer successful", {
        txId: result.txId,
        recipientAddress,
        amount,
        amountMicroSTX,
        memo: transferParams.memo,
      });

      res.status(200).json({
        success: true,
        message: "Fund transfer initiated successfully",
        data: {
          txId: result.txId,
          recipientAddress,
          amount,
          amountMicroSTX,
          memo: transferParams.memo,
          senderAddress: stxTransferService.getAdminAddress(),
        },
      });
    } catch (error) {
      logger.error("Fund request processing error", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * @swagger
   * /api/v1/fund-request/admin/balance:
   *   get:
   *     summary: Get admin wallet address
   *     description: Get the admin wallet address for reference
   *     tags: [Fund Request]
   *     security:
   *       - hmacAuth: []
   *     responses:
   *       200:
   *         description: Admin wallet address retrieved successfully
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
   *                     adminAddress:
   *                       type: string
   *                       example: "SP1HTBVD3JG9C05J7HBJTHGR0GGW7KX975CN0QKK"
   *       401:
   *         description: Invalid HMAC signature
   */
  static async getAdminInfo(req: Request, res: Response): Promise<void> {
    try {
      const adminAddress = stxTransferService.getAdminAddress();

      logger.info("Admin info requested", {
        adminAddress,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        data: {
          adminAddress,
        },
      });
    } catch (error) {
      logger.error("Admin info request error", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}
