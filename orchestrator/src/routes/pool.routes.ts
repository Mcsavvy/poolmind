import { Router } from "express";
import { PoolController } from "../controllers/poolController";

const router = Router();

router.get("/state", PoolController.getPoolState);

router.get("/info", PoolController.getPoolInfo);

router.get("/nav", PoolController.getCurrentNav);

export default router;
