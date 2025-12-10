import { useState, useEffect } from "react";
import type { PaymentRecord, PaymentStatus } from "../types/payment";
import { PaymentForm } from "./PaymentForm";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { PaymentLogs } from "./PaymentLogs";
import { PaymentStatus as PaymentStatusEnum } from "../types/payment";
import { apiService } from "../services/api";
import "./Dashboard.css";

export const Dashboard = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 5;

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      setError(null);
      const response = await apiService.getPayments(currentPage, limit);
      if (response.success && response.data) {
        setPayments(response.data.payments);
        setTotalPayments(response.data.total);
      } else {
        setError(response.error || "Failed to fetch payments");
      }
      setLoading(false);
    };

    fetchPayments();
  }, [currentPage]);

  const handlePaymentCreated = (payment: PaymentRecord) => {
    setPayments([payment, ...payments]);
    setSelectedPayment(payment);
    setTotalPayments((prev) => prev + 1);
  };

  const handleStatusUpdate = (paymentId: string, status: PaymentStatus) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status } : p))
    );
    if (selectedPayment?.id === paymentId) {
      setSelectedPayment({ ...selectedPayment, status });
    }
  };

  const totalPages = Math.ceil(totalPayments / limit);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

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

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>UPI Payment Dashboard</h1>
        <p>Generate QR codes and track payment status</p>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-left">
          <PaymentForm onPaymentCreated={handlePaymentCreated} />

          <div className="payments-list-section">
            <h2>
              Payments ({totalPayments})
              {loading && <span className="loading-indicator">Loading...</span>}
            </h2>
            {error ? (
              <div className="error-state">{error}</div>
            ) : loading && payments.length === 0 ? (
              <div className="empty-state">Loading payments...</div>
            ) : payments.length === 0 ? (
              <div className="empty-state">
                No payments found. Create a new payment request above.
              </div>
            ) : (
              <>
                <div className="payments-list">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`payment-card ${
                        selectedPayment?.id === payment.id ? "selected" : ""
                      }`}
                      onClick={() => setSelectedPayment(payment)}
                    >
                      <div className="payment-card-header">
                        <span className="payment-upi">{payment.upiId}</span>
                        <span
                          className="payment-status-badge"
                          style={{
                            backgroundColor: getStatusColor(payment.status),
                          }}
                        >
                          {payment.status}
                        </span>
                      </div>
                      <div className="payment-card-body">
                        <div className="payment-amount">
                          {formatCurrency(payment.amount)}
                        </div>
                        {payment.note && (
                          <div className="payment-note">{payment.note}</div>
                        )}
                        <div className="payment-date">
                          Created:{" "}
                          {new Date(payment.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      className="pagination-button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!hasPrevPage}
                    >
                      Previous
                    </button>
                    <span className="pagination-info">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className="pagination-button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!hasNextPage}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="dashboard-right">
          {selectedPayment ? (
            <>
              <QRCodeDisplay
                payment={selectedPayment}
                onStatusUpdate={(status) =>
                  handleStatusUpdate(selectedPayment.id, status)
                }
              />
              <PaymentLogs
                paymentId={selectedPayment.id}
                paymentStatus={selectedPayment.status}
              />
            </>
          ) : (
            <div className="empty-selection">
              <p>Select a payment from the list to view QR code and details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
