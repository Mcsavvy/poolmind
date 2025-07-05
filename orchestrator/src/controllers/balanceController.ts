import { Request, Response } from "express";
import { getPoolMindService } from "../services";
import { BaseContractService } from "../services/baseContractService";
import { IUser } from "../models/User";

export class BalanceController {
  private static poolMindService = getPoolMindService();
  private static baseService = new BaseContractService();

  /**
   * @swagger
   * /api/v1/balance/plmd:
   *   get:
   *     summary: Get authenticated user's PLMD token balance
   *     description: Retrieve the authenticated user's PoolMind token balance from their linked wallet
   *     tags: [Balance]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: PLMD balance retrieved successfully
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
   *                     address:
   *                       type: string
   *                       example: SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQ9H6DPR
   *                     balance:
   *                       type: number
   *                       example: 1000000
   *                     balanceFormatted:
   *                       type: string
   *                       example: "1.000000"
   *                     decimals:
   *                       type: number
   *                       example: 6
   *       400:
   *         description: Wallet address required
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
   *                   example: 'Wallet address required'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         description: Server error
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
   *                   example: 'Failed to fetch PLMD balance'
   */
  static async getPlmdBalance(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const address = user.walletAddress!; // requireWallet middleware ensures this exists

      const balanceResult =
        await BalanceController.poolMindService.getBalance(address);
      const decimals = await BalanceController.poolMindService.getDecimals();
      const balanceFormatted = (
        balanceResult.balance / Math.pow(10, decimals)
      ).toFixed(decimals);

      res.status(200).json({
        success: true,
        data: {
          address,
          balance: balanceResult.balance,
          balanceFormatted,
          decimals,
        },
      });
    } catch (error) {
      console.error("Error fetching PLMD balance:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch PLMD balance",
      });
    }
  }

  /**
   * @swagger
   * /api/v1/balance/stx:
   *   get:
   *     summary: Get authenticated user's STX wallet balance
   *     description: Retrieve the authenticated user's STX balance from their linked wallet
   *     tags: [Balance]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: STX balance retrieved successfully
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
   *                     address:
   *                       type: string
   *                       example: SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQ9H6DPR
   *                     balance:
   *                       type: number
   *                       example: 5000000
   *                     balanceFormatted:
   *                       type: string
   *                       example: "5.000000"
   *                     unit:
   *                       type: string
   *                       example: microSTX
   *       400:
   *         description: Wallet address required
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
   *                   example: 'Wallet address required'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         description: Server error
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
   *                   example: 'Failed to fetch STX balance'
   */
  static async getStxBalance(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const address = user.walletAddress!; // requireWallet middleware ensures this exists

      const balance =
        await BalanceController.baseService.getStxBalance(address);
      const balanceFormatted = (balance / 1000000).toFixed(6);

      res.status(200).json({
        success: true,
        data: {
          address,
          balance,
          balanceFormatted,
          unit: "microSTX",
        },
      });
    } catch (error) {
      console.error("Error fetching STX balance:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch STX balance",
      });
    }
  }

  /**
   * @swagger
   * /api/v1/balance/all:
   *   get:
   *     summary: Get authenticated user's complete balance information
   *     description: Retrieve both PLMD token balance and STX balance for the authenticated user's linked wallet
   *     tags: [Balance]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: All balances retrieved successfully
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
   *                     address:
   *                       type: string
   *                       example: SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQ9H6DPR
   *                     plmd:
   *                       type: object
   *                       properties:
   *                         balance:
   *                           type: number
   *                           example: 1000000
   *                         balanceFormatted:
   *                           type: string
   *                           example: "1.000000"
   *                         decimals:
   *                           type: number
   *                           example: 6
   *                     stx:
   *                       type: object
   *                       properties:
   *                         balance:
   *                           type: number
   *                           example: 5000000
   *                         balanceFormatted:
   *                           type: string
   *                           example: "5.000000"
   *                         unit:
   *                           type: string
   *                           example: "microSTX"
   *       400:
   *         description: Wallet address required
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
   *                   example: 'Wallet address required'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         description: Server error
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
   *                   example: 'Failed to fetch balances'
   */
  static async getAllBalances(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const address = user.walletAddress!; // requireWallet middleware ensures this exists

      const [plmdBalanceResult, stxBalance, decimals] = await Promise.all([
        BalanceController.poolMindService.getBalance(address),
        BalanceController.baseService.getStxBalance(address),
        BalanceController.poolMindService.getDecimals(),
      ]);

      const plmdBalanceFormatted = (
        plmdBalanceResult.balance / Math.pow(10, decimals)
      ).toFixed(decimals);
      const stxBalanceFormatted = (stxBalance / 1000000).toFixed(6);

      res.status(200).json({
        success: true,
        data: {
          address,
          plmd: {
            balance: plmdBalanceResult.balance,
            balanceFormatted: plmdBalanceFormatted,
            decimals,
          },
          stx: {
            balance: stxBalance,
            balanceFormatted: stxBalanceFormatted,
            unit: "microSTX",
          },
        },
      });
    } catch (error) {
      console.error("Error fetching balances:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch balances",
      });
    }
  }
}
