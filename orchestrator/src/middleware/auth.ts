import { Request, Response, NextFunction } from "express";
import { AuthUtils, JWTPayload, TelegramAuthData } from "../utils/auth";
import User, { IUser } from "../models/User";

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      tokenPayload?: JWTPayload;
    }
  }
}

// AuthRequest interface removed - using Express Request with type assertions instead

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = AuthUtils.extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access token required",
      });
      return;
    }

    const payload = AuthUtils.verifyToken(token);

    // Get user from database
    const user = await User.findById(payload.userId);

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Invalid or inactive user",
      });
      return;
    }

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/**
 * Middleware to validate Telegram authentication
 */
export const validateTelegramAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authData: TelegramAuthData = req.body;

    if (!authData.chatId || !authData.user) {
      res.status(400).json({
        success: false,
        message: "Chat ID and user data are required",
      });
      return;
    }

    const isValid = AuthUtils.validateTelegramAuthData(authData);

    if (!isValid) {
      res.status(401).json({
        success: false,
        message: "Invalid Telegram authentication",
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Authentication validation failed",
    });
  }
};

/**
 * Middleware to check if user has completed KYC
 */
export const requireKYC = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const user = req.user;

  if (!user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  if (user.kycStatus !== "approved") {
    res.status(403).json({
      success: false,
      message: "KYC verification required",
      kycStatus: user.kycStatus,
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user has linked wallet
 */
export const requireWallet = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const user = req.user;

  if (!user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  if (!user.walletAddress) {
    res.status(400).json({
      success: false,
      message: "Wallet address required",
    });
    return;
  }

  next();
};
