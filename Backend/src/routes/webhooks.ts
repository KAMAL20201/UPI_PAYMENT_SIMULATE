import { Router } from "express";
import { webhookStatusUpdateHandler } from "../controllers/webhooksController.js";

const router = Router();

// Simulated webhook endpoint to be called by internal cron/jobs or QA tools
router.post("/status-update", webhookStatusUpdateHandler);

export default router;
