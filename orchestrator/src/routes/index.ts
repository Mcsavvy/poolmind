import { Router } from "express";
import authRoutes from "./auth.routes";
import balanceRoutes from "./balance.routes";
import poolRoutes from "./pool.routes";
import transactionRoutes from "./transaction.routes";
import fundRequestRoutes from "./fundRequest.routes";

const router = Router();

// Authentication routes
router.use("/auth", authRoutes);

// Balance routes
router.use("/balance", balanceRoutes);

// Pool routes (public)
router.use("/pool", poolRoutes);

// Transaction routes
router.use("/transactions", transactionRoutes);

// Fund request routes (HMAC secured)
router.use("/fund-request", fundRequestRoutes);

export default router;
