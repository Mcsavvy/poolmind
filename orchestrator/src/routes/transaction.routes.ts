import { Router } from "express";
import { TransactionController } from "../controllers/transactionController";
import { authenticateToken, requireWallet } from "../middleware/auth";
import { flexibleAuth, ensureRawBodyForHmac } from "../middleware/flexibleAuth";

const router = Router();

// Apply raw body capture middleware for potential HMAC validation
router.use(ensureRawBodyForHmac);

// User-specific transaction endpoints (JWT only)
router.post(
  "/submit",
  authenticateToken,
  requireWallet, // Require wallet to be linked
  TransactionController.submitTransaction,
);

router.get(
  "/:txId/status",
  authenticateToken,
  TransactionController.getTransactionStatus,
);

router.get(
  "/",
  authenticateToken,
  TransactionController.getUserTransactions,
);

// Queue statistics - accessible by both users and bots
router.get("/queue/stats", flexibleAuth, TransactionController.getQueueStats);

export default router;
