import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import paymentRoutes from "./routes/payments.js";
import webhookRoutes from "./routes/webhooks.js";
import * as paymentService from "./services/paymentService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:3000",
  "http://localhost:5173",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", webhookRoutes);

app.use("*", (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

app.use(
  (
    err: Error & { status?: number },
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error("Global error handler:", err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
);

const EXPIRY_CHECK_INTERVAL = 5 * 60 * 1000;
const PAYMENT_EXPIRY_MINUTES = Number.parseInt(
  process.env.PAYMENT_EXPIRY_MINUTES ?? "15",
  10
);

setInterval(async () => {
  try {
    const expiredCount = await paymentService.expireOldPayments(
      PAYMENT_EXPIRY_MINUTES
    );
    if (expiredCount > 0) {
      console.log(`Expired ${expiredCount} old payment(s)`);
    }
  } catch (error) {
    console.error("Error in periodic expiry check:", error);
  }
}, EXPIRY_CHECK_INTERVAL);

app.listen(PORT, () => {
  console.log(`Server running on: http://localhost:${PORT}`);
});

export default app;
