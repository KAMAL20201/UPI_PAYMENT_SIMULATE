import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import supabase from "../config/supabaseClient.js";
import {
  CreatePaymentInput,
  PaymentLog,
  PaymentRecord,
  PaymentStatus,
} from "../types/payment.js";

const PAYMENTS_TABLE = process.env.SUPABASE_TABLE_PAYMENTS || "payments";
const PAYMENT_LOGS_TABLE =
  process.env.SUPABASE_TABLE_PAYMENT_LOGS || "payment_logs";
const PAYMENT_EXPIRY_MINUTES = Number.parseInt(
  process.env.PAYMENT_EXPIRY_MINUTES ?? "15",
  10
);

const buildUpiIntentUrl = (params: {
  upiId: string;
  amount: number;
  payerName?: string;
  note?: string;
  transactionRef: string;
}) => {
  const query = new URLSearchParams({
    pa: params.upiId,
    am: params.amount.toFixed(2),
    cu: "INR",
    tn: params.note ?? "UPI Payment",
    tr: params.transactionRef,
  });

  if (params.payerName) {
    query.append("pn", params.payerName);
  }

  return `upi://pay?${query.toString()}`;
};

const mapPaymentRecord = (row: Record<string, any>): PaymentRecord => {
  const createdAt = new Date(row.created_at);
  const expiresAt = new Date(
    createdAt.getTime() + PAYMENT_EXPIRY_MINUTES * 60 * 1000
  ).toISOString();

  return {
    id: row.id,
    upiId: row.upi_id,
    amount: row.amount,
    payerName: row.payee_name ?? undefined,
    note: row.note ?? undefined,
    status: row.status as PaymentStatus,
    qrCodeDataUrl: row.qr_data,
    upiIntentUrl: (row.metadata as Record<string, any>)?.upi_intent_url ?? "",
    metadata: row.metadata ?? undefined,
    expiresAt,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
};

const mapPaymentLog = (row: Record<string, any>): PaymentLog => ({
  id: String(row.id),
  paymentId: row.payment_id,
  status: row.status as PaymentStatus,
  message: row.message ?? undefined,
  createdAt: row.logged_at,
});

const insertStatusLog = async (
  paymentId: string,
  status: PaymentStatus,
  message?: string
) => {
  const log: Record<string, any> = {
    payment_id: paymentId,
    status,
    message: message ?? `Status updated to ${status}`,
    logged_at: new Date().toISOString(),
  };

  const { error } = await supabase.from(PAYMENT_LOGS_TABLE).insert(log);
  if (error) {
    console.error("Failed to insert payment status log", error);
  }
};

export const createPayment = async (
  input: CreatePaymentInput
): Promise<PaymentRecord> => {
  if (!input.upiId || input.upiId.trim().length < 3) {
    throw new Error("UPI ID is required and must be at least 3 characters.");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Amount must be a positive number.");
  }

  console.log(input, "input");

  const paymentId = uuidv4();
  const transactionRef = uuidv4();
  const upiIntentUrl = buildUpiIntentUrl({
    upiId: input.upiId.trim(),
    amount: input.amount,
    payerName: input.payerName?.trim(),
    note: input.note?.trim(),
    transactionRef,
  });
  console.log(upiIntentUrl, "upiIntentUrl");

  const qrCodeDataUrl = await QRCode.toDataURL(upiIntentUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 6,
  });
  console.log(qrCodeDataUrl, "qrCodeDataUrl");
  const metadata = {
    ...(input.metadata ?? {}),
    upi_intent_url: upiIntentUrl,
  };

  const row = {
    id: paymentId,
    upi_id: input.upiId.trim(),
    amount: input.amount,
    payee_name: input.payerName?.trim() ?? null,
    note: input.note?.trim() ?? null,
    status: PaymentStatus.PENDING,
    qr_data: qrCodeDataUrl,
    metadata,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    transaction_ref: transactionRef,
  };
  console.log(row, "row");
  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .insert(row)
    .select()
    .single();
  if (error || !data) {
    console.error("Supabase insert payment error", error);
    throw new Error("Failed to create payment request.");
  }

  await insertStatusLog(paymentId, PaymentStatus.PENDING, "Payment created");

  return mapPaymentRecord(data);
};

export const getPayments = async (
  page: number = 1,
  limit: number = 5
): Promise<{
  payments: PaymentRecord[];
  total: number;
  page: number;
  limit: number;
}> => {
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from(PAYMENTS_TABLE)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Supabase fetch payments error", error);
    throw new Error("Failed to fetch payments.");
  }

  return {
    payments: (data ?? []).map(mapPaymentRecord),
    total: count ?? 0,
    page,
    limit,
  };
};

export const getPayment = async (
  paymentId: string
): Promise<PaymentRecord | null> => {
  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (error) {
    console.error("Supabase fetch payment error", error);
    throw new Error("Failed to fetch payment.");
  }

  if (!data) return null;
  return mapPaymentRecord(data);
};

export const getPaymentStatus = async (
  paymentId: string
): Promise<PaymentStatus | null> => {
  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .select("status")
    .eq("id", paymentId)
    .maybeSingle();

  if (error) {
    console.error("Supabase fetch payment status error", error);
    throw new Error("Failed to fetch payment status.");
  }

  return data?.status ?? null;
};

export const getPaymentLogs = async (
  paymentId: string
): Promise<PaymentLog[]> => {
  const { data, error } = await supabase
    .from(PAYMENT_LOGS_TABLE)
    .select("*")
    .eq("payment_id", paymentId)
    .order("logged_at", { ascending: false });

  if (error) {
    console.error("Supabase fetch payment logs error", error);
    throw new Error("Failed to fetch payment logs.");
  }

  return (data ?? []).map(mapPaymentLog);
};

export const updatePaymentStatus = async (
  paymentId: string,
  status: PaymentStatus,
  message?: string
): Promise<PaymentRecord | null> => {
  const updateData: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Set completed_at when payment is finalized
  if (status === PaymentStatus.SUCCESS || status === PaymentStatus.FAILED) {
    updateData.completed_at = new Date().toISOString();
  }

  // Set failure_reason if payment failed
  if (status === PaymentStatus.FAILED && message) {
    updateData.failure_reason = message;
  }

  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .update(updateData)
    .eq("id", paymentId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Supabase update payment status error", error);
    throw new Error("Failed to update payment status.");
  }

  if (!data) return null;

  await insertStatusLog(paymentId, status, message);
  return mapPaymentRecord(data);
};

export const expireOldPayments = async (
  expiryMinutes: number
): Promise<number> => {
  const expiryThreshold = new Date(
    Date.now() - expiryMinutes * 60 * 1000
  ).toISOString();
  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .update({
      status: PaymentStatus.EXPIRED,
      updated_at: new Date().toISOString(),
    })
    .eq("status", PaymentStatus.PENDING)
    .lte("created_at", expiryThreshold)
    .select("id");

  if (error) {
    console.error("Supabase expire payments error", error);
    return 0;
  }

  const ids = (data ?? []).map((row) => row.id as string);
  await Promise.all(
    ids.map((id) =>
      insertStatusLog(id, PaymentStatus.EXPIRED, "Payment expired")
    )
  );
  return ids.length;
};

export const simulateStatusChange = async (
  paymentId: string,
  status: PaymentStatus.SUCCESS | PaymentStatus.FAILED,
  message?: string
): Promise<PaymentRecord | null> => {
  const payment = await getPayment(paymentId);
  if (!payment) {
    throw new Error("Payment not found.");
  }
  if (payment.status !== PaymentStatus.PENDING) {
    throw new Error("Payment is already finalized.");
  }

  return updatePaymentStatus(
    paymentId,
    status,
    message ?? `Simulated ${status} webhook`
  );
};
