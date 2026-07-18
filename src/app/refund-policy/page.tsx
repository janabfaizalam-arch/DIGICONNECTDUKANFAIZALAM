import type { Metadata } from "next";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundPolicyPage() {
  return (
    <div className="container-narrow py-12 prose prose-neutral max-w-3xl">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Refund Policy</h1>
      <p className="mt-4 text-[var(--muted)]">
        Service fees are charged for application assistance. If DigiConnect Dukan has not started processing your
        application, you may request a refund within 24 hours of payment. Government fees and third-party charges are
        non-refundable. Contact support with your tracking code for review.
      </p>
    </div>
  );
}
