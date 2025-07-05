import { Request, Response } from "express";
import { getPoolMindService } from "../services";

export class PoolController {
  private static poolMindService = getPoolMindService();

  /**
   * @swagger
   * /api/v1/pool/state:
   *   get:
   *     summary: Get complete pool contract state
   *     description: Retrieve the current state of the PoolMind contract including admin settings, fees, and balances
   *     tags: [Pool]
   *     responses:
   *       200:
   *         description: Pool state retrieved successfully
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
   *                     admin:
   *                       type: string
   *                       example: SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQ9H6DPR
   *                     paused:
   *                       type: boolean
   *                       example: false
   *                     transferable:
   *                       type: boolean
   *                       example: true
   *                     nav:
   *                       type: number
   *                       example: 1000000
   *                     navFormatted:
   *                       type: string
   *                       example: "1.000000"
   *                     entryFee:
   *                       type: number
   *                       example: 25
   *                     entryFeeFormatted:
   *                       type: string
   *                       example: "2.5%"
   *                     exitFee:
   *                       type: number
   *                       example: 25
   *                     exitFeeFormatted:
   *                       type: string
   *                       example: "2.5%"
   *                     stxBalance:
   *                       type: number
   *                       example: 5000000
   *                     stxBalanceFormatted:
   *                       type: string
   *                       example: "5.000000"
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
   *                   example: 'Failed to fetch pool state'
   */
  static async getPoolState(req: Request, res: Response): Promise<void> {
    try {
      const contractState =
        await PoolController.poolMindService.getContractState();

      // Format the values for better readability
      const navFormatted = (contractState.nav / 1000000).toFixed(6);
      const entryFeeFormatted = `${(contractState.entryFee / 10).toFixed(1)}%`;
      const exitFeeFormatted = `${(contractState.exitFee / 10).toFixed(1)}%`;
      const stxBalanceFormatted = (contractState.stxBalance / 1000000).toFixed(
        6,
      );

      res.status(200).json({
        success: true,
        data: {
          ...contractState,
          navFormatted,
          entryFeeFormatted,
          exitFeeFormatted,
          stxBalanceFormatted,
        },
      });
    } catch (error) {
      console.error("Error fetching pool state:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch pool state",
      });
    }
  }

  /**
   * @swagger
   * /api/v1/pool/info:
   *   get:
   *     summary: Get pool token information
   *     description: Retrieve comprehensive information about the PoolMind token including name, symbol, decimals, and total supply
   *     tags: [Pool]
   *     responses:
   *       200:
   *         description: Pool token info retrieved successfully
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
   *                     name:
   *                       type: string
   *                       example: "PoolMind Token"
   *                     symbol:
   *                       type: string
   *                       example: "PLMD"
   *                     decimals:
   *                       type: number
   *                       example: 6
   *                     totalSupply:
   *                       type: number
   *                       example: 1000000000000
   *                     totalSupplyFormatted:
   *                       type: string
   *                       example: "1000000.000000"
   *                     tokenUri:
   *                       type: string
   *                       example: "https://example.com/token-metadata.json"
   *                     contractAddress:
   *                       type: string
   *                       example: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQ9H6DPR.poolmind-token"
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
   *                   example: 'Failed to fetch pool info'
   */
  static async getPoolInfo(req: Request, res: Response): Promise<void> {
    try {
      const tokenInfo = await PoolController.poolMindService.getTokenInfo();
      const contractIdentifier =
        PoolController.poolMindService.getContractIdentifier();

      // Format total supply for better readability
      const totalSupplyFormatted = (
        tokenInfo.totalSupply / Math.pow(10, tokenInfo.decimals)
      ).toFixed(tokenInfo.decimals);

      res.status(200).json({
        success: true,
        data: {
          ...tokenInfo,
          totalSupplyFormatted,
          contractAddress: contractIdentifier,
        },
      });
    } catch (error) {
      console.error("Error fetching pool info:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch pool info",
      });
    }
  }

  /**
   * @swagger
   * /api/v1/pool/nav:
   *   get:
   *     summary: Get current Net Asset Value (NAV)
   *     description: Retrieve the current Net Asset Value of the pool
   *     tags: [Pool]
   *     responses:
   *       200:
   *         description: Current NAV retrieved successfully
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
   *                     nav:
   *                       type: number
   *                       example: 1000000
   *                     navFormatted:
   *                       type: string
   *                       example: "1.000000"
   *                     unit:
   *                       type: string
   *                       example: "microSTX"
   *                     lastUpdated:
   *                       type: string
   *                       format: date-time
   *                       example: "2023-12-01T12:00:00Z"
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
   *                   example: 'Failed to fetch current NAV'
   */
  static async getCurrentNav(req: Request, res: Response): Promise<void> {
    try {
      const navResult = await PoolController.poolMindService.getNav();
      const navFormatted = (navResult.nav / 1000000).toFixed(6);

      res.status(200).json({
        success: true,
        data: {
          nav: navResult.nav,
          navFormatted,
          unit: "microSTX",
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error fetching current NAV:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch current NAV",
      });
    }
  }
}
