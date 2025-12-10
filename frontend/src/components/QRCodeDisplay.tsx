import { useEffect, useState } from "react";
import type { PaymentRecord, PaymentStatus } from "../types/payment";
import { apiService } from "../services/api";
import { PaymentStatus as PaymentStatusEnum } from "../types/payment";
import "./QRCodeDisplay.css";

interface QRCodeDisplayProps {
  payment: PaymentRecord;
  onStatusUpdate?: (status: PaymentStatus) => void;
}

export const QRCodeDisplay = ({
  payment,
  onStatusUpdate,
}: QRCodeDisplayProps) => {
  const [currentStatus, setCurrentStatus] = useState<PaymentStatus>(
    payment.status
  );
  const [isPolling, setIsPolling] = useState(
    payment.status === PaymentStatusEnum.PENDING
  );
  const [timeRemaining, setTimeRemaining] = useState<number | null>(() => {
    if (payment.status !== PaymentStatusEnum.PENDING) return null;
    const expiresAt = new Date(payment.expiresAt).getTime();
    const now = Date.now();
    const remaining = expiresAt - now;
    return remaining > 0 ? remaining : 0;
  });
  const [isExpired, setIsExpired] = useState(() => {
    if (payment.status !== PaymentStatusEnum.PENDING) return false;
    const expiresAt = new Date(payment.expiresAt).getTime();
    return expiresAt <= Date.now();
  });

  // Countdown timer effect
  useEffect(() => {
    if (currentStatus !== PaymentStatusEnum.PENDING) {
      return;
    }

    const calculateTimeRemaining = () => {
      const expiresAt = new Date(payment.expiresAt).getTime();
      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        setIsExpired(true);
        setTimeRemaining(0);
        // Update status to expired
        setCurrentStatus(PaymentStatusEnum.EXPIRED);
        onStatusUpdate?.(PaymentStatusEnum.EXPIRED);
        return;
      }

      setTimeRemaining(remaining);
      setIsExpired(false);
    };

    // Update every second
    const timerInterval = setInterval(calculateTimeRemaining, 1000);

    // Initial calculation
    calculateTimeRemaining();

    return () => clearInterval(timerInterval);
  }, [payment.expiresAt, currentStatus, onStatusUpdate]);

  // Reset timer when status changes away from PENDING
  useEffect(() => {
    if (currentStatus !== PaymentStatusEnum.PENDING) {
      // Use setTimeout to defer state update and avoid synchronous setState warning
      const timeoutId = setTimeout(() => {
        setTimeRemaining(null);
        setIsExpired(false);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [currentStatus]);

  // Status polling effect
  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(async () => {
      const response = await apiService.getPaymentStatus(payment.id);
      if (response.success && response.data) {
        const newStatus = response.data.status;
        setCurrentStatus(newStatus);
        onStatusUpdate?.(newStatus);

        if (
          newStatus !== PaymentStatusEnum.PENDING &&
          newStatus !== PaymentStatusEnum.EXPIRED
        ) {
          setIsPolling(false);
        }
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [payment.id, isPolling, onStatusUpdate]);

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatusEnum.SUCCESS:
        return "#10b981";
      case PaymentStatusEnum.FAILED:
        return "#ef4444";
      case PaymentStatusEnum.EXPIRED:
        return "#f59e0b";
      case PaymentStatusEnum.PENDING:
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatTimeRemaining = (milliseconds: number): string => {
    if (milliseconds <= 0) return "00:00";

    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  const getTimeRemainingClass = (): string => {
    if (timeRemaining === null) return "";
    if (isExpired || timeRemaining === 0) return "expired";
    if (timeRemaining < 60000) return "warning"; // Less than 1 minute
    if (timeRemaining < 300000) return "caution"; // Less than 5 minutes
    return "normal";
  };

  return (
    <div className="qr-display-container">
      <div className="qr-header">
        <h3>Payment Request</h3>
        <div
          className="status-badge"
          style={{ backgroundColor: getStatusColor(currentStatus) }}
        >
          {currentStatus}
        </div>
      </div>

      <div className="qr-content">
        <div className="qr-code-wrapper">
          {currentStatus === PaymentStatusEnum.PENDING && !isExpired ? (
            <>
              <img
                src={payment.qrCodeDataUrl}
                alt="UPI QR Code"
                className="qr-code-image"
              />
              <p className="qr-instruction">
                Scan this QR code with any UPI app to make payment
              </p>
              {timeRemaining !== null && (
                <div className={`expiry-timer ${getTimeRemainingClass()}`}>
                  <span className="timer-icon">⏱</span>
                  <span className="timer-label">Expires in:</span>
                  <span className="timer-value">
                    {formatTimeRemaining(timeRemaining)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="qr-status-message">
              <div className="status-icon">
                {currentStatus === PaymentStatusEnum.SUCCESS ? "✓" : "✗"}
              </div>
              <p>
                Payment{" "}
                {currentStatus === PaymentStatusEnum.SUCCESS
                  ? "Successful"
                  : currentStatus.toLowerCase()}
              </p>
              {(currentStatus === PaymentStatusEnum.EXPIRED || isExpired) && (
                <p className="expired-message">
                  This QR code has expired. Please generate a new payment
                  request.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="payment-details">
          <div className="detail-row">
            <span className="detail-label">Transaction ID:</span>
            <span className="detail-value">{payment.id}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">UPI ID:</span>
            <span className="detail-value">{payment.upiId}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Amount:</span>
            <span className="detail-value amount">
              {formatCurrency(payment.amount)}
            </span>
          </div>
          {payment.payerName && (
            <div className="detail-row">
              <span className="detail-label">Payer Name:</span>
              <span className="detail-value">{payment.payerName}</span>
            </div>
          )}
          {payment.note && (
            <div className="detail-row">
              <span className="detail-label">Note:</span>
              <span className="detail-value">{payment.note}</span>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-label">Created:</span>
            <span className="detail-value">
              {formatDate(payment.createdAt)}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Expires:</span>
            <span className="detail-value">
              {formatDate(payment.expiresAt)}
            </span>
          </div>
        </div>
      </div>

      {isPolling && (
        <div className="polling-indicator">
          <span className="polling-dot"></span>
          Polling for status updates...
        </div>
      )}
    </div>
  );
};
