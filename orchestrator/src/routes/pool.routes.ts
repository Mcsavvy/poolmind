import { Router } from "express";
import { PoolController } from "../controllers/poolController";
import { flexibleAuth, ensureRawBodyForHmac } from "../middleware/flexibleAuth";

const router = Router();

// Apply raw body capture middleware for potential HMAC validation
router.use(ensureRawBodyForHmac);

// Pool state - accessible by both users and bots
router.get("/state", flexibleAuth, PoolController.getPoolState);

// Pool info - accessible by both users and bots
router.get("/info", flexibleAuth, PoolController.getPoolInfo);

// Current NAV - accessible by both users and bots
router.get("/nav", flexibleAuth, PoolController.getCurrentNav);

export default router;
