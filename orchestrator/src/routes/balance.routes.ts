import { Router } from "express";
import { BalanceController } from "../controllers/balanceController";
import { authenticateToken, requireWallet } from "../middleware/auth";
import { flexibleAuth, ensureRawBodyForHmac } from "../middleware/flexibleAuth";

const router = Router();

// Apply raw body capture middleware for potential HMAC validation
router.use(ensureRawBodyForHmac);

// User-specific balance endpoints (JWT only)
router.get(
  "/plmd",
  authenticateToken,
  requireWallet,
  BalanceController.getPlmdBalance,
);

router.get(
  "/stx",
  authenticateToken,
  requireWallet,
  BalanceController.getStxBalance,
);

router.get(
  "/all",
  authenticateToken,
  requireWallet,
  BalanceController.getAllBalances,
);

// Address-specific balance endpoints (JWT or HMAC)
router.get(
  "/address/:address/plmd",
  flexibleAuth,
  BalanceController.getPlmdBalanceByAddress,
);

router.get(
  "/address/:address/stx",
  flexibleAuth,
  BalanceController.getStxBalanceByAddress,
);

router.get(
  "/address/:address/all",
  flexibleAuth,
  BalanceController.getAllBalancesByAddress,
);

export default router;
