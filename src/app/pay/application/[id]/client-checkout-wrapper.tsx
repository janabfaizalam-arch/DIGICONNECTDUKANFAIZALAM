"use client";

import { useRouter } from "next/navigation";
import { RazorpayCheckoutButton, VerifiedRazorpayPayment } from "@/components/payments/razorpay-checkout-button";
import { useToast } from "@/components/providers/toast-provider";

export function ClientCheckoutWrapper({
  applicationId,
  freshPayableAmount,
  customerName,
  customerEmail,
  customerMobile,
  serviceSlug,
  walletUseAmount,
  couponCode,
}: {
  applicationId: string;
  freshPayableAmount: number;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  serviceSlug: string;
  walletUseAmount: number;
  couponCode?: string;
}) {
  const router = useRouter();
  const { success } = useToast();

  const handleVerified = (payment: VerifiedRazorpayPayment) => {
    success("Payment completed successfully! Redirecting...");
    setTimeout(() => {
      window.location.href = `/dashboard/applications/${applicationId}`;
    }, 1500);
  };

  return (
    <RazorpayCheckoutButton
      amountPaise={Math.round(freshPayableAmount * 100)}
      receipt={`pay-${applicationId}`}
      applicationId={applicationId}
      serviceSlug={serviceSlug}
      walletUseAmount={walletUseAmount}
      couponCode={couponCode}
      customer={{
        name: customerName,
        email: customerEmail,
        mobile: customerMobile,
      }}
      description={`Payment for ${serviceSlug}`}
      onVerified={handleVerified}
    />
  );
}
