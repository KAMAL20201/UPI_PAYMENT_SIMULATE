import { Request, Response } from "express";
import {
  createPayment,
  getPayment,
  getPayments,
  getPaymentLogs,
  getPaymentStatus,
  simulateStatusChange,
} from "../services/paymentService.js";
import { PaymentStatus } from "../types/payment.js";

export const createPaymentHandler = async (req: Request, res: Response) => {
  try {
    const { upiId, amount, payerName, note, metadata } = req.body;
    console.log(upiId, amount, payerName, note, metadata);
    const payment = await createPayment({
      upiId,
      amount: Number(amount),
      payerName,
      note,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message ?? "Unable to create payment",
    });
  }
};

export const getPaymentsHandler = async (req: Request, res: Response) => {
  try {
    const page = Number.parseInt(req.query.page as string) || 1;
    const limit = Number.parseInt(req.query.limit as string) || 5;

    if (page < 1) {
      return res.status(400).json({
        success: false,
        error: "Page must be greater than 0",
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: "Limit must be between 1 and 100",
      });
    }

    const result = await getPayments(page, limit);
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message ?? "Unable to fetch payments",
    });
  }
};

export const getPaymentHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await getPayment(id);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, error: "Payment not found" });
    }

    res.json({ success: true, data: payment });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message ?? "Unable to fetch payment",
    });
  }
};

export const getPaymentStatusHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const status = await getPaymentStatus(id);
    if (!status) {
      return res
        .status(404)
        .json({ success: false, error: "Payment not found" });
    }

    res.json({
      success: true,
      data: {
        paymentId: id,
        status,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message ?? "Unable to fetch status",
    });
  }
};

export const getPaymentLogsHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const logs = await getPaymentLogs(id);
    res.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, error: error.message ?? "Unable to fetch logs" });
  }
};

export const simulateStatusHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;
    const normalizedStatus = (status as string)?.toUpperCase();

    const allowedStatuses: Array<PaymentStatus.SUCCESS | PaymentStatus.FAILED> =
      [PaymentStatus.SUCCESS, PaymentStatus.FAILED];

    if (
      !allowedStatuses.includes(
        normalizedStatus as PaymentStatus.SUCCESS | PaymentStatus.FAILED
      )
    ) {
      return res.status(400).json({
        success: false,
        error: "Status must be SUCCESS or FAILED for simulation.",
      });
    }

    const nextStatus = normalizedStatus as
      | PaymentStatus.SUCCESS
      | PaymentStatus.FAILED;
    const payment = await simulateStatusChange(id, nextStatus, message);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, error: "Payment not found" });
    }

    res.json({ success: true, data: payment });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message ?? "Unable to simulate status",
    });
  }
};
