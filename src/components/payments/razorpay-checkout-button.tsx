"use client";

import { useState } from "react";
import Script from "next/script";
import { CreditCard } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { ButtonSpinner } from "@/components/ui/loading";
import { trackPurchase as trackGooglePurchase } from "@/lib/google-analytics";
import { trackPurchase } from "@/lib/meta-pixel";

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: {
    description?: string;
    reason?: string;
  };
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpaySuccessResponse) => void;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailureResponse) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

type CreateOrderResponse = {
  order_id?: string;
  amount?: number;
  currency?: string;
  application_id?: string;
  application_ids?: string[];
  message?: string;
  error?: string;
};

type CreateOrderRequestBody = {
  amount: number;
  currency: "INR";
  receipt: string;
  serviceSlug?: string;
  serviceSlugs?: string[];
  walletUseAmount?: number;
  applicationDraft?: RazorpayCheckoutButtonProps["applicationDraft"];
};

type VerifyPaymentResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  payment_id?: string;
  order_id?: string;
};

export type VerifiedRazorpayPayment = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  application_id?: string;
  application_ids?: string[];
};

type RazorpayCheckoutButtonProps = {
  amountPaise: number;
  receipt: string;
  serviceSlug?: string;
  serviceSlugs?: string[];
  walletUseAmount?: number;
  customer?: {
    name?: string;
    email?: string;
    mobile?: string;
  };
  applicationDraft?: {
    customer?: {
      name?: string;
      email?: string;
      mobile?: string;
      city?: string;
      message?: string;
    };
    details?: Record<string, string>;
  };
  description?: string;
  disabled?: boolean;
  onVerified: (payment: VerifiedRazorpayPayment) => void;
};

async function readApiResponse<T extends { message?: string; error?: string }>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {
      error: response.ok ? undefined : "Request failed. Please try again.",
      message: response.ok ? "Request completed." : "Request failed. Please try again.",
    } as T;
  }
}

export function RazorpayCheckoutButton({
  amountPaise,
  receipt,
  serviceSlug,
  serviceSlugs,
  walletUseAmount,
  customer,
  applicationDraft,
  description = "DigiConnect Dukan service payment",
  disabled,
  onVerified,
}: RazorpayCheckoutButtonProps) {
  const { success, error: toastError } = useToast();
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"idle" | "creating" | "opening" | "verifying">("idle");

  async function handleCheckout() {
    if (isPending) {
      return;
    }

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      toastError("Razorpay public key is missing.");
      return;
    }

    if (!window.Razorpay || !isScriptReady) {
      toastError("Payment checkout is still loading. Please try again.");
      return;
    }

    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      toastError("Payment amount must be at least ₹1.");
      return;
    }

    setIsPending(true);
    setPaymentStep("creating");

    try {
      const body: CreateOrderRequestBody = {
        amount: amountPaise,
        currency: "INR",
        receipt,
        serviceSlug,
        serviceSlugs,
        walletUseAmount,
        applicationDraft,
      };

      if (process.env.NODE_ENV === "development") {
        console.log("CREATE_ORDER_BODY", body);
      }

      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const order = await readApiResponse<CreateOrderResponse>(orderResponse);

      if (!orderResponse.ok || !order.order_id || !order.amount || !order.currency) {
        throw new Error(order.error || order.message || "Could not create Razorpay order.");
      }

      setPaymentStep("opening");

      const checkout = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "DigiConnect Dukan",
        description,
        order_id: order.order_id,
        prefill: {
          name: customer?.name,
          email: customer?.email,
          contact: customer?.mobile,
        },
        notes: {
          receipt,
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: () => {
            setIsPending(false);
            setPaymentStep("idle");
            toastError("Payment cancelled.");
          },
        },
        handler: async (payment) => {
          try {
            setPaymentStep("verifying");
            const verifyResponse = await fetch("/api/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...payment,
                application_id: order.application_id,
                application_ids: order.application_ids,
              }),
            });
            const verifyResult = await readApiResponse<VerifyPaymentResponse>(verifyResponse);

            if (!verifyResponse.ok || !verifyResult.success) {
              throw new Error(verifyResult.error || verifyResult.message || "Payment verification failed.");
            }

            onVerified({
              ...payment,
              application_id: order.application_id,
              application_ids: order.application_ids,
            });
            trackPurchase(amountPaise / 100);
            trackGooglePurchase(amountPaise / 100);
            success("Payment verified successfully.");
          } catch (error) {
            toastError(error instanceof Error ? error.message : "Payment verification failed.");
          } finally {
            setIsPending(false);
            setPaymentStep("idle");
          }
        },
      });

      checkout.on("payment.failed", (response) => {
        setIsPending(false);
        setPaymentStep("idle");
        toastError(response.error?.description || response.error?.reason || "Payment failed. Please try again.");
      });

      checkout.open();
    } catch (error) {
      setIsPending(false);
      setPaymentStep("idle");
      toastError(error instanceof Error ? error.message : "Payment could not be started.");
    }
  }

  const pendingText =
    paymentStep === "creating"
      ? "Creating secure order..."
      : paymentStep === "opening"
        ? "Opening Razorpay..."
        : paymentStep === "verifying"
          ? "Verifying payment..."
          : "Please wait...";

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setIsScriptReady(true)}
        onError={() => toastError("Razorpay checkout script could not be loaded.")}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || isPending || !isScriptReady || amountPaise < 100}
        onClick={() => {
          void handleCheckout();
        }}
        className="h-12 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-sm font-extrabold text-white shadow-lg shadow-orange-500/15"
        aria-busy={isPending}
      >
        {isPending ? <ButtonSpinner /> : <CreditCard className="h-4 w-4" />}
        {isPending ? pendingText : "Pay Securely with Razorpay"}
      </Button>
    </>
  );
}
