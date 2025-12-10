export enum PaymentStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  EXPIRED = "EXPIRED",
}

export interface CreatePaymentInput {
  upiId: string;
  amount: number;
  payerName?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentRecord {
  id: string;
  upiId: string;
  amount: number;
  payerName?: string;
  note?: string;
  status: PaymentStatus;
  qrCodeDataUrl: string;
  upiIntentUrl: string;
  metadata?: Record<string, unknown>;
  expiresAt: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentLog {
  id: string;
  paymentId: string;
  status: PaymentStatus;
  message?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
