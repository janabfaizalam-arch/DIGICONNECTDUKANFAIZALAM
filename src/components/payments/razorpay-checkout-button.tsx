"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { CreditCard } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { ButtonSpinner } from "@/components/ui/loading";
import { trackPurchase as trackGooglePurchase } from "@/lib/google-analytics";
import { trackPurchase } from "@/lib/meta-pixel";
import { getCheckoutRazorpayKey } from "@/lib/razorpay-client";

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
  servicePrice?: number;
  walletUsed?: number;
  rewardUsed?: number;
  finalPayable?: number;
  key_id?: string;
};

type CreateOrderRequestBody = {
  amount: number;
  currency: "INR";
  receipt: string;
  serviceSlug?: string;
  serviceSlugs?: string[];
  walletUseAmount?: number;
  couponCode?: string;
  applicationId?: string;
  applicationIds?: string[];
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
  couponCode?: string;
  applicationId?: string;
  /** Every application this payment settles, when it settles more than one. */
  applicationIds?: string[];
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

/** Shown when the payment went through but this tab could not confirm it. */
const PAYMENT_PENDING_CONFIRMATION =
  "Payment received. We could not confirm it in this tab — it will be confirmed automatically in a few minutes.";

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
  couponCode,
  applicationId,
  applicationIds,
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const win = window as unknown as { Razorpay?: unknown };
      if (win.Razorpay) {
        setIsScriptReady(true);
      } else {
        const interval = setInterval(() => {
          if (win.Razorpay) {
            setIsScriptReady(true);
            clearInterval(interval);
          }
        }, 500);
        return () => clearInterval(interval);
      }
    }
  }, []);

  async function handleCheckout() {
    if (isPending) {
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

    /*
      Without this the isPending guard above never fires: the button stays
      enabled, the spinner and its step text never show, and a double click
      creates two Razorpay orders.
    */
    setIsPending(true);
    setPaymentStep("creating");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error("[PAY:TIMEOUT] Order creation timed out after 15 seconds.");
    }, 15000);

    try {
      const body: CreateOrderRequestBody = {
        amount: amountPaise,
        currency: "INR",
        receipt,
        serviceSlug,
        serviceSlugs,
        walletUseAmount,
        couponCode,
        applicationId,
        applicationIds,
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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const order = await readApiResponse<CreateOrderResponse>(orderResponse);

      if (!orderResponse.ok || !order.order_id || !order.amount || !order.currency) {
        throw new Error(order.error || order.message || "Could not create Razorpay order.");
      }

      // Verify amounts match exactly
      const reviewTotal = amountPaise / 100;
      const backendTotal = Number(order.finalPayable);
      const razorpayAmount = Number(order.amount) / 100;

      if (reviewTotal !== backendTotal || backendTotal !== razorpayAmount) {
        const mismatchMsg = "Payment amount mismatch detected. Please refresh cart.";
        console.error("[PAY:MISMATCH]", { reviewTotal, backendTotal, razorpayAmount });
        throw new Error(mismatchMsg);
      }

      setPaymentStep("opening");

      const servicePrice = order.servicePrice;
      const walletUsed = order.walletUsed;
      const rewardUsed = order.rewardUsed;
      const finalPayable = order.finalPayable;

      console.log("Service Price", servicePrice);
      console.log("Wallet Used", walletUsed);
      console.log("Reward Used", rewardUsed);
      console.log("Final Payable", finalPayable);
      console.log("Razorpay Order Amount", order.amount);

      const razorpayKey = await getCheckoutRazorpayKey(order.key_id);
      if (!razorpayKey) {
        throw new Error("Razorpay public key is missing. Contact support.");
      }

      const razorpayOptions = {
        key: razorpayKey,
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
        handler: async (payment: RazorpaySuccessResponse) => {
          try {
            setPaymentStep("verifying");

            /*
              The money has already left the customer's account by now, so a
              flaky connection must not be the end of it: retry once, and if
              that fails too, say what is actually true. Razorpay's webhook
              confirms the payment server-side whatever this tab does.
            */
            let verifyResponse: Response | null = null;
            let verifyResult: VerifyPaymentResponse = {};

            for (let attempt = 0; attempt < 2; attempt += 1) {
              if (attempt > 0) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
              }

              try {
                verifyResponse = await fetch("/api/verify-payment", {
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
                verifyResult = await readApiResponse<VerifyPaymentResponse>(verifyResponse);
              } catch {
                verifyResponse = null;
              }

              if (verifyResponse?.ok && verifyResult.success) break;

              // A rejection the server is sure about will not change on a retry.
              if (verifyResponse && verifyResponse.status >= 400 && verifyResponse.status < 500) break;
            }

            if (!verifyResponse?.ok || !verifyResult.success) {
              throw new Error(
                verifyResult.error ||
                  verifyResult.message ||
                  PAYMENT_PENDING_CONFIRMATION,
              );
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
            toastError(error instanceof Error ? error.message : PAYMENT_PENDING_CONFIRMATION);
          } finally {
            setIsPending(false);
            setPaymentStep("idle");
          }
        },
      };

      // Ensure razorpayOptions.amount === order.amount holds
      if (razorpayOptions.amount !== order.amount) {
        throw new Error("Razorpay options amount does not match order amount.");
      }

      const checkout = new window.Razorpay(razorpayOptions);

      checkout.on("payment.failed", (response) => {
        setIsPending(false);
        setPaymentStep("idle");
        toastError(response.error?.description || response.error?.reason || "Payment failed. Please try again.");
      });

      checkout.open();
    } catch (error) {
      clearTimeout(timeoutId);
      setIsPending(false);
      setPaymentStep("idle");
      let errMsg = "Payment could not be started.";
      if (error instanceof Error && error.name === "AbortError") {
        errMsg = "Order creation timed out (15s limit). Please check your connection and try again.";
      } else {
        errMsg = error instanceof Error ? error.message : String(error);
      }
      toastError(errMsg);
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
