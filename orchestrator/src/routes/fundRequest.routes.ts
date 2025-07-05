import { Router } from "express";
import { FundRequestController } from "../controllers/fundRequestController";
import { validateHmacSignature, captureRawBody } from "../middleware/hmacAuth";

const router = Router();

// Apply raw body capture middleware for HMAC validation
router.use(captureRawBody);

// All fund request routes require HMAC authentication
router.use(validateHmacSignature);

// Request funds from admin wallet
router.post("/", FundRequestController.requestFunds);

// Get admin wallet info
router.get("/admin/info", FundRequestController.getAdminInfo);

export default router;
