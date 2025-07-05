import { Request, Response } from "express";
import { UserService } from "../services/userService";
import { IUser } from "../models/User";
import { AuthUtils } from "../utils/auth";
import { config } from "../config";
import { WalletConnectUrlResponse } from "../types/wallet";
import { notificationService } from "../services/notificationService";

export class AuthController {
  /**
   * @swagger
   * /api/v1/auth/telegram:
   *   post:
   *     summary: Authenticate user via Telegram Bot/WebApp
   *     description: Authenticate or register a user using Telegram bot or webapp JSON payload
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/TelegramAuthRequest'
   *     responses:
   *       200:
   *         description: Authentication successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         description: Invalid Telegram authentication
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               message: 'Invalid Telegram authentication'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  static async authenticateWithTelegram(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const authData = req.body;

      if (!authData.chatId || !authData.user) {
        res.status(400).json({
          success: false,
          message: "Chat ID and user data are required",
        });
        return;
      }

      const result = await UserService.authenticateWithTelegram(authData);

      res.status(200).json({
        success: true,
        message: result.isNewUser
          ? "User registered successfully"
          : "User authenticated successfully",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Authentication failed",
      });
    }
  }

  /**
   * @swagger
   * /api/v1/auth/profile:
   *   get:
   *     summary: Get current user profile
   *     description: Retrieve the authenticated user's profile information
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profile retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve profile",
      });
    }
  }

  /**
   * @swagger
   * /api/v1/auth/profile:
   *   put:
   *     summary: Update user profile
   *     description: Update the authenticated user's profile information
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateProfileRequest'
   *     responses:
   *       200:
   *         description: Profile updated successfully
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
   *                   example: 'Profile updated successfully'
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const userId = user._id.toString();
      const updateData = req.body;

      const updatedUser = await UserService.updateProfile(userId, updateData);

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update profile",
      });
    }
  }

  /**
   * @swagger
   * /api/v1/auth/wallet/connect-url:
   *   get:
   *     summary: Generate wallet connection URL with short-lived access token
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: redirectUrl
   *         schema:
   *           type: string
   *         description: Optional redirect URL after successful connection
   *     responses:
   *       200:
   *         description: Connection URL generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 url:
   *                   type: string
   *                   description: The wallet connection URL
   *                 accessToken:
   *                   type: string
   *                   description: Short-lived access token
   *                 expiresAt:
   *                   type: number
   *                   description: Token expiration timestamp
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Server error
   */
  static async getConnectUrl(req: Request, res: Response): Promise<void> {
    try {
      const { redirectUrl }: { redirectUrl?: string } = req.query as any;
      const authenticatedUser = req.user;

      if (!authenticatedUser) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      const token = AuthUtils.generateToken(authenticatedUser);

      // Build the wallet connection URL
      const baseUrl = config.server.frontendUrl || config.server.appUrl;
      const connectUrl = `${baseUrl}/wallet/connect?access_token=${token}`;

      const response: WalletConnectUrlResponse = {
        url: connectUrl,
        accessToken: token,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Error generating wallet connect URL:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate connection URL",
      });
    }
  }

  /**
   * @swagger
   * /api/v1/auth/wallet:
   *   post:
   *     summary: Link wallet address to user account
   *     description: Associate a Stacks wallet address with the authenticated user's account
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LinkWalletRequest'
   *     responses:
   *       200:
   *         description: Wallet linked successfully
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
   *                   example: 'Wallet linked successfully'
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *       400:
   *         description: Invalid wallet address or already linked
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               message: 'Wallet address already linked to another account'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  static async linkWallet(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const userId = user._id.toString();
      const { walletAddress, signature } = req.body;

      if (!walletAddress) {
        res.status(400).json({
          success: false,
          message: "Wallet address is required",
        });
        return;
      }

      const updatedUser = await UserService.linkWallet(userId, {
        walletAddress,
        signature,
      });

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      // Publish wallet linked notification
      try {
        await notificationService.publishWalletLinked(
          updatedUser.telegramId,
          updatedUser._id.toString(),
          walletAddress,
        );
      } catch (notificationError) {
        // Log error but don't fail the request
        console.error(
          "Failed to publish wallet linked notification:",
          notificationError,
        );
      }

      res.status(200).json({
        success: true,
        message: "Wallet linked successfully",
        data: updatedUser,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to link wallet",
      });
    }
  }

  /**
   * @swagger
   * /api/v1/auth/wallet:
   *   delete:
   *     summary: Unlink wallet address from user account
   *     description: Remove the associated wallet address from the authenticated user's account
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Wallet unlinked successfully
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
   *                   example: 'Wallet unlinked successfully'
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  static async unlinkWallet(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const userId = user._id.toString();
      const walletAddress = user.walletAddress; // Store before unlinking

      const updatedUser = await UserService.unlinkWallet(userId);

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      // Publish wallet unlinked notification
      if (walletAddress) {
        try {
          await notificationService.publishWalletUnlinked(
            updatedUser.telegramId,
            updatedUser._id.toString(),
            walletAddress,
          );
        } catch (notificationError) {
          // Log error but don't fail the request
          console.error(
            "Failed to publish wallet unlinked notification:",
            notificationError,
          );
        }
      }

      res.status(200).json({
        success: true,
        message: "Wallet unlinked successfully",
        data: updatedUser,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to unlink wallet",
      });
    }
  }
}
