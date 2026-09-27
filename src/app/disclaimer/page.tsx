import type { Metadata } from "next";

import { LegalList, LegalPage } from "@/components/legal/legal-page";
import { business } from "@/lib/compliance/config";

export const metadata: Metadata = {
  title: "Disclaimer | DigiConnect Dukan",
  description:
    "DigiConnect Dukan is a private digital-assistance service and not a government portal. Read what we do and do not promise.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <LegalPage
      eyebrow="Disclaimer"
      title="Disclaimer"
      currentHref="/disclaimer"
      intro={
        <p>
          Please read this before using {business.brand}. It sets out plainly what kind of service we are.
        </p>
      }
      sections={[
        {
          id: "not-government",
          title: "Not a government website",
          body: (
            <>
              <p>
                {business.brand} is operated by {business.legalEntity}, a private company. It is{" "}
                <strong>not a government department, not an official government portal</strong>, and is not affiliated
                with, endorsed by or acting for any government body unless a specific service page says so and shows the
                basis for it.
              </p>
              <p>
                Government services such as PAN, passport, GST, Udyam, scheme registrations and similar can be applied
                for directly on the official government portals. Our charges are for the assistance we provide, over and
                above any government fee.
              </p>
            </>
          ),
        },
        {
          id: "no-guarantee",
          title: "No guarantee of outcome",
          body: (
            <LegalList
              items={[
                "Approval, sanction, issue of a certificate or card, loan disbursal, subsidy, insurance cover or tax refund is decided solely by the relevant authority, bank, insurer or provider.",
                "We do not guarantee any approval, amount, or timeline. Timelines shown are typical, based on experience, not promises.",
                "Eligibility rules, fees and processes are set by the authorities and can change without notice.",
              ]}
            />
          ),
        },
        {
          id: "information",
          title: "Information on this site",
          body: (
            <p>
              Articles, FAQs and guides are general information, not legal, tax or financial advice. We try to keep
              them accurate and current, but you should confirm important details with the official source or a
              qualified professional before acting on them.
            </p>
          ),
        },
        {
          id: "third-party",
          title: "Third-party products and links",
          body: (
            <p>
              Credit cards, loans, insurance and similar products shown on the site are offered by their providers,
              who decide eligibility and terms. We may receive a referral fee for some of these. Names and logos of
              schemes, banks and other organisations are used only to identify the service and do not imply their
              endorsement.
            </p>
          ),
        },
        {
          id: "testimonials",
          title: "Reviews and testimonials",
          body: (
            <p>
              We publish customer testimonials only where the customer has agreed to it. Individual experiences are not
              a promise that your application will have the same result.
            </p>
          ),
        },
      ]}
    />
  );
}
