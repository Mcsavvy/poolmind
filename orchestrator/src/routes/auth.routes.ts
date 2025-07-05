import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { authenticateToken, validateTelegramAuth } from "../middleware/auth";
import {
  validateSchema,
  telegramAuthSchema,
  updateProfileSchema,
  linkWalletSchema,
} from "../utils/validation";

const router = Router();

// Telegram authentication
router.post(
  "/telegram",
  validateSchema(telegramAuthSchema),
  validateTelegramAuth,
  AuthController.authenticateWithTelegram,
);

// Profile management (requires authentication)
router.get("/profile", authenticateToken, AuthController.getProfile);
router.put(
  "/profile",
  authenticateToken,
  validateSchema(updateProfileSchema),
  AuthController.updateProfile,
);

// Wallet management (requires authentication)
router.post(
  "/wallet",
  authenticateToken,
  validateSchema(linkWalletSchema),
  AuthController.linkWallet,
);
router.delete("/wallet", authenticateToken, AuthController.unlinkWallet);

router.get(
  "/wallet/connect-url",
  authenticateToken,
  AuthController.getConnectUrl,
);

export default router;
