import type {
  ApiResponse,
  CreatePaymentInput,
  PaymentLog,
  PaymentRecord,
  PaymentStatus,
} from "../types/payment";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3002/api";

class ApiService {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  async createPayment(
    input: CreatePaymentInput
  ): Promise<ApiResponse<PaymentRecord>> {
    return this.request<PaymentRecord>("/payments", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getPayments(
    page: number = 1,
    limit: number = 5
  ): Promise<
    ApiResponse<{
      payments: PaymentRecord[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    return this.request<{
      payments: PaymentRecord[];
      total: number;
      page: number;
      limit: number;
    }>(`/payments?page=${page}&limit=${limit}`);
  }

  async getPayment(paymentId: string): Promise<ApiResponse<PaymentRecord>> {
    return this.request<PaymentRecord>(`/payments/${paymentId}`);
  }

  async getPaymentStatus(
    paymentId: string
  ): Promise<ApiResponse<{ paymentId: string; status: PaymentStatus }>> {
    return this.request<{ paymentId: string; status: PaymentStatus }>(
      `/payments/${paymentId}/status`
    );
  }

  async getPaymentLogs(paymentId: string): Promise<ApiResponse<PaymentLog[]>> {
    return this.request<PaymentLog[]>(`/payments/${paymentId}/logs`);
  }

  async simulateStatusChange(
    paymentId: string,
    status: PaymentStatus.SUCCESS | PaymentStatus.FAILED,
    message?: string
  ): Promise<ApiResponse<PaymentRecord>> {
    return this.request<PaymentRecord>(
      `/payments/${paymentId}/simulate-status`,
      {
        method: "POST",
        body: JSON.stringify({ status, message }),
      }
    );
  }
}

export const apiService = new ApiService();
