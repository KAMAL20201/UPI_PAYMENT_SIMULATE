import { useState } from "react";
import type { CreatePaymentInput, PaymentRecord } from "../types/payment";
import { apiService } from "../services/api";
import "./PaymentForm.css";

interface PaymentFormProps {
  onPaymentCreated: (payment: PaymentRecord) => void;
}

export const PaymentForm = ({ onPaymentCreated }: PaymentFormProps) => {
  const [formData, setFormData] = useState<CreatePaymentInput>({
    upiId: "",
    amount: 0,
    payerName: "",
    note: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiService.createPayment(formData);
      if (response.success && response.data) {
        onPaymentCreated(response.data);
        setFormData({
          upiId: "",
          amount: 0,
          payerName: "",
          note: "",
        });
      } else {
        setError(response.error || "Failed to create payment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-form-container">
      <h2>Create New Payment Request</h2>
      <form onSubmit={handleSubmit} className="payment-form">
        <div className="form-group">
          <label htmlFor="upiId">
            UPI ID <span className="required">*</span>
          </label>
          <input
            id="upiId"
            type="text"
            value={formData.upiId}
            onChange={(e) =>
              setFormData({ ...formData, upiId: e.target.value })
            }
            placeholder="yourname@paytm"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">
            Amount (₹) <span className="required">*</span>
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.amount || ""}
            onChange={(e) =>
              setFormData({ ...formData, amount: parseFloat(e.target.value) })
            }
            placeholder="0.00"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="payerName">Payer Name (Optional)</label>
          <input
            id="payerName"
            type="text"
            value={formData.payerName || ""}
            onChange={(e) =>
              setFormData({ ...formData, payerName: e.target.value })
            }
            placeholder="John Doe"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="note">Note (Optional)</label>
          <input
            id="note"
            type="text"
            value={formData.note || ""}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="Payment for services"
            disabled={loading}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? "Creating..." : "Generate QR Code"}
        </button>
      </form>
    </div>
  );
};
