import type { Metadata } from "next";

import { LegalLink, LegalList, LegalPage } from "@/components/legal/legal-page";
import { business } from "@/lib/compliance/config";

export const metadata: Metadata = {
  title: "Terms & Conditions | DigiConnect Dukan",
  description: "Terms and Conditions for using DigiConnect Dukan online digital-assistance services.",
  alternates: { canonical: "/terms-and-conditions" },
};

export default function TermsAndConditionsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms & Conditions"
      currentHref="/terms-and-conditions"
      intro={
        <>
          <p>
            These terms apply to your use of {business.brand} — the website {business.siteUrl}, our app and services —
            operated by {business.legalEntity} ({business.location}). By using the platform or requesting a service,
            you agree to these terms, our <LegalLink href="/privacy-policy">Privacy Policy</LegalLink> and our{" "}
            <LegalLink href="/refund-policy">Refund &amp; Cancellation Policy</LegalLink>.
          </p>
        </>
      }
      sections={[
        {
          id: "what-we-do",
          title: "What we do — and what we are not",
          body: (
            <>
              <p>
                {business.brand} provides online assistance for digital, documentation, government-scheme, tax,
                business, insurance and financial service requests. We help you prepare, check and submit applications
                and follow them up.
              </p>
              <p>
                <strong>We are a private business.</strong> We are not a government department, not an official
                government portal, and not an agent of any authority unless expressly stated for a specific service.
                Many services we assist with can also be applied for directly on the relevant official portal, often
                at the government fee alone.
              </p>
              <p>
                Final approval, timelines and outcomes are decided by the relevant authority, bank, insurer or other
                provider. We do not guarantee approval, sanction, a loan, a subsidy, a refund of tax, or any particular
                outcome or timeline. Timelines shown on the site are typical, not promised.
              </p>
            </>
          ),
        },
        {
          id: "your-responsibilities",
          title: "Your responsibilities",
          body: (
            <LegalList
              items={[
                "Provide information and documents that are true, complete, and your own (or that you are authorised to share).",
                "Keep your account credentials, PIN and OTPs private. Never share an OTP with anyone, including people claiming to be from us.",
                "Pay the charges shown for the service you choose.",
                "Cooperate with verification, document requests and service-specific instructions shared through the portal.",
                "Use the platform lawfully and not attempt to access other people's data, disrupt the service, or misuse it.",
              ]}
            />
          ),
        },
        {
          id: "fees",
          title: "Charges and payments",
          body: (
            <>
              <p>
                The price for each service is shown before you pay. It may include our service charge and, where
                stated, government or third-party fees. Prices are set by us on the server at checkout; the amount you
                are asked to pay is the amount we charge.
              </p>
              <p>
                Online payments are processed by Razorpay. Refunds and cancellations are governed by our{" "}
                <LegalLink href="/refund-policy">Refund &amp; Cancellation Policy</LegalLink>.
              </p>
            </>
          ),
        },
        {
          id: "wallet",
          title: "DigiWallet, cashback and coupons",
          body: (
            <LegalList
              items={[
                "Cashback is credited to DigiWallet after successful service completion. DigiWallet is an internal wallet-credit system and is not a direct bank refund.",
                "Wallet credits can be redeemed up to 50% on future eligible services. The remaining order value must be paid through the available real payment method.",
                "Wallet credits are non-transferable and valid for a limited time only. Expired credits cannot be redeemed, transferred or withdrawn.",
                "Offers, cashback rates and coupons may change or end; the terms shown at the time of your order apply to that order.",
              ]}
            />
          ),
        },
        {
          id: "partners",
          title: "DC Partners",
          body: (
            <p>
              DC Partners are independent agency partners who help customers use our services. Partners are bound by
              their own partner terms and may use customer data only to serve that customer&rsquo;s request. If a
              partner asks you for anything other than what the platform shows, please contact us.
            </p>
          ),
        },
        {
          id: "third-party",
          title: "Third-party sites and offers",
          body: (
            <p>
              The platform links to official portals and to third-party products such as credit cards or insurance.
              Those products are offered by their providers on their own terms. We are not responsible for third-party
              sites, and we may receive a referral fee when you apply through some links.
            </p>
          ),
        },
        {
          id: "ip",
          title: "Content and trademarks",
          body: (
            <p>
              The site&rsquo;s content, design and software belong to {business.legalEntity} or its licensors. Names
              and logos of government schemes, banks, insurers and other organisations belong to their owners and are
              used only to identify the service you are asking about; their use does not imply endorsement or
              partnership.
            </p>
          ),
        },
        {
          id: "liability",
          title: "Limitation of liability",
          body: (
            <p>
              To the extent permitted by law, our total liability for any claim relating to a service is limited to the
              service charge you paid us for that service. We are not liable for decisions, delays or errors of
              authorities or third parties, or for losses caused by incorrect information you provided.
            </p>
          ),
        },
        {
          id: "suspension",
          title: "Suspension",
          body: (
            <p>
              We may suspend or close an account, or decline a request, where we reasonably suspect fraud, misuse,
              false documents, or a breach of these terms.
            </p>
          ),
        },
        {
          id: "law",
          title: "Governing law and disputes",
          body: (
            <p>
              These terms are governed by the laws of India. Please contact us first — most issues are resolved quickly
              through our <LegalLink href="/contact">support and grievance desk</LegalLink>. Subject to applicable
              consumer-protection law, courts at the place of our registered office will have jurisdiction.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes",
          body: (
            <p>
              We may update these terms. The version published here, with its &ldquo;last updated&rdquo; date, applies
              from that date. Orders already placed continue under the terms that applied when they were placed.
            </p>
          ),
        },
      ]}
    />
  );
}
