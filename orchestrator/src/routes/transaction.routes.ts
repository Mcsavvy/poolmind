import { Router } from "express";
import { TransactionController } from "../controllers/transactionController";
import { authenticateToken, requireWallet } from "../middleware/auth";

const router = Router();

// All transaction routes require authentication
router.use(authenticateToken);

// Submit transaction for monitoring
router.post(
  "/submit",
  requireWallet, // Require wallet to be linked
  TransactionController.submitTransaction,
);

// Get transaction status
router.get("/:txId/status", TransactionController.getTransactionStatus);

// Get user transactions
router.get("/", TransactionController.getUserTransactions);

// Get queue statistics (admin only - for now accessible to all authenticated users)
router.get("/queue/stats", TransactionController.getQueueStats);

export default router;
