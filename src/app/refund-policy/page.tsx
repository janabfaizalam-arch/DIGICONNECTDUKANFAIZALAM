import type { Metadata } from "next";

import { LegalLink, LegalList, LegalPage } from "@/components/legal/legal-page";
import { business } from "@/lib/compliance/config";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | DigiConnect Dukan",
  description: "When DigiConnect Dukan service charges can be cancelled or refunded, how to ask, and how refunds are paid.",
  alternates: { canonical: "/refund-policy" },
};

/*
  TODO(business/legal): confirm every rule and timeline on this page against
  how refunds are actually handled today. The rules here restate what the site
  already told customers (homepage FAQ, application forms) — they add no new
  promise.
*/
export default function RefundPolicyPage() {
  return (
    <LegalPage
      eyebrow="Policy"
      title="Refund & Cancellation Policy"
      currentHref="/refund-policy"
      intro={
        <>
          <p>
            This policy explains when you can cancel a request made through {business.brand} and when the charges you
            paid us can be refunded. Where a service page shows its own refund terms, those terms apply to that
            service in addition to this policy.
          </p>
          <p>
            <strong>What you pay us for:</strong> our charges are for assistance — preparing, checking and submitting
            your application and following it up. Government fees, bank or insurer charges and other third-party
            fees are set and collected by those bodies; their refund rules are theirs, not ours.
          </p>
        </>
      }
      sections={[
        {
          id: "cancellation",
          title: "Cancelling a request",
          body: (
            <LegalList
              items={[
                "You can cancel a request before we start processing it. Contact us with your application ID.",
                "Once processing has started — for example documents have been reviewed or an application has been filed with an authority — our service charge is generally not refundable, because the work has been done.",
                "We may cancel a request if required documents or information are not provided, if details appear false or misleading, or if the service is not available for your case. If we cancel before starting work, we refund our charges.",
              ]}
            />
          ),
        },
        {
          id: "eligible",
          title: "When a refund is given",
          body: (
            <LegalList
              items={[
                "You were charged but the application could not be processed because of a verification constraint on our side, or because of our error.",
                "You were charged twice for the same application, or charged an amount higher than the price shown at checkout.",
                "You cancelled before we started processing.",
              ]}
            />
          ),
        },
        {
          id: "not-eligible",
          title: "When a refund is not given",
          body: (
            <>
              <LegalList
                items={[
                  "The authority, bank or provider rejects or delays your application. Approval decisions are theirs alone; we do not control or guarantee them.",
                  "The application was delayed or rejected because information or documents you provided were incorrect, incomplete or not genuine.",
                  "Government, bank, insurer or other third-party fees already paid on your behalf.",
                  "Change of mind after processing has started.",
                ]}
              />
            </>
          ),
        },
        {
          id: "wallet",
          title: "DigiWallet credits and cashback",
          body: (
            <LegalList
              items={[
                "DigiWallet cashback and reward credits are promotional credits, not money held for you. They are not refundable to a bank account and cannot be withdrawn or transferred.",
                "If an order paid partly with wallet credits is refunded, we will tell you how the wallet portion is handled when we confirm the refund.",
              ]}
            />
          ),
        },
        {
          id: "how",
          title: "How to request a refund",
          body: (
            <>
              <p>
                Contact us as soon as possible with your application ID and the reason, through{" "}
                <LegalLink href="/contact">our Contact page</LegalLink>, WhatsApp or email at{" "}
                <LegalLink href={`mailto:${business.email}`}>{business.email}</LegalLink>. We will review the request
                and reply with a decision.
              </p>
              <p>
                Approved refunds are made to the original payment method through Razorpay. After we initiate a refund,
                banks usually take 5–7 working days to show it, though some take longer.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
