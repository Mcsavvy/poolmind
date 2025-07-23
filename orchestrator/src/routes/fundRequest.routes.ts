import { Router } from "express";
import { FundRequestController } from "../controllers/fundRequestController";
import { requireHmacAuth } from "../middleware/flexibleAuth";

const router = Router();

// All fund request routes require HMAC authentication (bot-only endpoints)
router.use(requireHmacAuth);

// Request funds from admin wallet
router.post("/", FundRequestController.requestFunds);

// Get admin wallet info
router.get("/admin/info", FundRequestController.getAdminInfo);

export default router;
