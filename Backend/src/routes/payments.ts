import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createPaymentHandler,
  getPaymentHandler,
  getPaymentsHandler,
  getPaymentLogsHandler,
  getPaymentStatusHandler,
  simulateStatusHandler,
} from "../controllers/paymentsController.js";

const router = Router();

const paymentCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many payment requests, please try again later.",
});

router.post("/", paymentCreationLimiter, createPaymentHandler);
router.get("/", getPaymentsHandler);
router.get("/:id", getPaymentHandler);
router.get("/:id/status", getPaymentStatusHandler);
router.get("/:id/logs", getPaymentLogsHandler);
router.post("/:id/simulate-status", simulateStatusHandler);

export default router;
