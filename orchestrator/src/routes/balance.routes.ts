import { Router } from "express";
import { BalanceController } from "../controllers/balanceController";
import { authenticateToken, requireWallet } from "../middleware/auth";

const router = Router();

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

export default router;
