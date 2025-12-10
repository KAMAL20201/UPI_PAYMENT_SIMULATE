import { Request, Response } from "express";
import { updatePaymentStatus } from "../services/paymentService.js";
import { PaymentStatus } from "../types/payment.js";

export const webhookStatusUpdateHandler = async (
  req: Request,
  res: Response
) => {
  const { paymentId, status, message } = req.body as {
    paymentId?: string;
    status?: string;
    message?: string;
  };

  if (!paymentId) {
    return res
      .status(400)
      .json({ success: false, error: "paymentId is required" });
  }

  const normalizedStatus = status?.toUpperCase() as PaymentStatus | undefined;
  if (
    !normalizedStatus ||
    !Object.values(PaymentStatus).includes(normalizedStatus)
  ) {
    return res.status(400).json({ success: false, error: "Invalid status" });
  }

  if (
    ![PaymentStatus.SUCCESS, PaymentStatus.FAILED].includes(normalizedStatus)
  ) {
    return res.status(400).json({
      success: false,
      error: "Webhook can only mark payments as SUCCESS or FAILED",
    });
  }

  try {
    const payment = await updatePaymentStatus(
      paymentId,
      normalizedStatus,
      message
    );
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, error: "Payment not found" });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message ?? "Unable to process webhook",
    });
  }
};
