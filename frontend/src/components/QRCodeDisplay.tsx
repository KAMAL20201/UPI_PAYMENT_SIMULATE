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
          {currentStatus === PaymentStatusEnum.PENDING ? (
            <>
              <img
                src={payment.qrCodeDataUrl}
                alt="UPI QR Code"
                className="qr-code-image"
              />
              <p className="qr-instruction">
                Scan this QR code with any UPI app to make payment
              </p>
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
