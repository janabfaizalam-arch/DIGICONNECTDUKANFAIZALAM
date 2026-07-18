"use client";

import { useState } from "react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function PayButton({ applicationId }: { applicationId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRazorpay() {
    if (window.Razorpay) return true;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Razorpay failed to load"));
      document.body.appendChild(script);
    });
    return Boolean(window.Razorpay);
  }

  async function onPay() {
    setLoading(true);
    setError(null);
    try {
      await loadRazorpay();
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const data = (await response.json()) as {
        error?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        key?: string;
        applicationId?: string;
      };
      if (!response.ok || !data.orderId || !window.Razorpay) {
        throw new Error(data.error ?? "Unable to start payment");
      }

      const rzp = new window.Razorpay({
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        handler: async (payment: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payment, applicationId }),
          });
          window.location.href = "/customer/dashboard";
        },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn btn-primary" onClick={onPay} disabled={loading}>
        {loading ? "Starting…" : "Pay with Razorpay"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
