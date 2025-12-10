import { useEffect, useState, useRef, useCallback } from "react";
import type { PaymentLog } from "../types/payment";
import {
  PaymentStatus,
  type PaymentStatus as PaymentStatusType,
} from "../types/payment";
import { apiService } from "../services/api";
import "./PaymentLogs.css";

interface PaymentLogsProps {
  paymentId: string;
  paymentStatus?: PaymentStatusType;
}

export const PaymentLogs = ({ paymentId, paymentStatus }: PaymentLogsProps) => {
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousStatusRef = useRef<PaymentStatusType | undefined>(
    paymentStatus
  );

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await apiService.getPaymentLogs(paymentId);
    if (response.success && response.data) {
      setLogs(response.data);
    } else {
      setError(response.error || "Failed to fetch logs");
    }
    setLoading(false);
  }, [paymentId]);

  useEffect(() => {
    // Fetch logs initially
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    // Refetch logs when payment status changes to SUCCESS or FAILED
    if (
      paymentStatus &&
      previousStatusRef.current !== paymentStatus &&
      (paymentStatus === PaymentStatus.SUCCESS ||
        paymentStatus === PaymentStatus.FAILED)
    ) {
      fetchLogs();
    }
    previousStatusRef.current = paymentStatus;
  }, [paymentStatus, fetchLogs]);

  const getStatusColor = (status: PaymentStatusType) => {
    switch (status) {
      case PaymentStatus.SUCCESS:
        return "#10b981";
      case PaymentStatus.FAILED:
        return "#ef4444";
      case PaymentStatus.EXPIRED:
        return "#f59e0b";
      case PaymentStatus.PENDING:
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div className="payment-logs-loading">Loading logs...</div>;
  }

  if (error) {
    return <div className="payment-logs-error">Error: {error}</div>;
  }

  if (logs.length === 0) {
    return <div className="payment-logs-empty">No logs available</div>;
  }

  return (
    <div className="payment-logs-container">
      <h3>Status History</h3>
      <div className="logs-list">
        {logs.map((log) => (
          <div key={log.id} className="log-item">
            <div className="log-header">
              <span
                className="log-status"
                style={{ color: getStatusColor(log.status) }}
              >
                {log.status}
              </span>
              <span className="log-time">{formatDate(log.createdAt)}</span>
            </div>
            {log.message && <div className="log-message">{log.message}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};
