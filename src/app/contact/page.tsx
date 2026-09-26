import type { Metadata } from "next";

import { LegalLink, LegalList, LegalPage } from "@/components/legal/legal-page";
import { PrivacyRequestForm } from "@/components/privacy/privacy-request-form";
import { business, privacyContact } from "@/lib/compliance/config";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact & Grievance | DigiConnect Dukan",
  description:
    "Contact DigiConnect Dukan (RNOS India Private Limited, Orai, Jalaun, Uttar Pradesh) for support, refunds, privacy requests and grievances.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const whatsappUrl = buildWhatsAppUrl(buildSupportWhatsAppMessage({ page: "contact", topic: "Support request" }));

  return (
    <LegalPage
      eyebrow="Contact"
      title="Contact & Grievance"
      currentHref="/contact"
      intro={
        <p>
          Reach the {business.brand} team for help with an application, payments and refunds, privacy requests or
          complaints. Please never share an OTP, PIN or password with anyone — our team will not ask for them.
        </p>
      }
      sections={[
        {
          id: "business",
          title: "Business details",
          body: (
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
              <dt className="font-bold text-slate-900">Brand</dt>
              <dd>
                {business.brand} — {business.tagline}
              </dd>
              <dt className="font-bold text-slate-900">Operated by</dt>
              <dd>{business.legalEntity}</dd>
              <dt className="font-bold text-slate-900">Location</dt>
              <dd>{business.registeredOfficeAddress ?? business.location}</dd>
              {business.cin ? (
                <>
                  <dt className="font-bold text-slate-900">CIN</dt>
                  <dd>{business.cin}</dd>
                </>
              ) : null}
              {business.gstin ? (
                <>
                  <dt className="font-bold text-slate-900">GSTIN</dt>
                  <dd>{business.gstin}</dd>
                </>
              ) : null}
              <dt className="font-bold text-slate-900">Support hours</dt>
              <dd>{business.supportHours}</dd>
            </dl>
          ),
        },
        {
          id: "support",
          title: "Customer support",
          body: (
            <LegalList
              items={[
                <>
                  Phone: <LegalLink href={`tel:+91${business.phone}`}>+91 {business.phone}</LegalLink>
                </>,
                <>
                  Office support: <LegalLink href={`tel:+91${business.officeSupportPhone}`}>+91 {business.officeSupportPhone}</LegalLink>
                </>,
                <>
                  WhatsApp:{" "}
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-800 underline underline-offset-2">
                    Chat with support<span className="sr-only"> (opens WhatsApp in a new tab)</span>
                  </a>
                </>,
                <>
                  Email: <LegalLink href={`mailto:${business.email}`}>{business.email}</LegalLink>
                </>,
                <>
                  Refunds and cancellations: see our <LegalLink href="/refund-policy">Refund &amp; Cancellation Policy</LegalLink>, then
                  contact us with your application ID.
                </>,
              ]}
            />
          ),
        },
        {
          id: "grievance",
          title: "Grievance officer",
          body: (
            <>
              <p>
                If your issue is not resolved through support, or it concerns your personal data, write to our Grievance
                Officer{privacyContact.grievanceOfficerName ? ` (${privacyContact.grievanceOfficerName})` : ""} at{" "}
                <LegalLink href={`mailto:${privacyContact.email}`}>{privacyContact.email}</LegalLink> with &ldquo;Grievance&rdquo; in the
                subject, or call <LegalLink href={`tel:+91${privacyContact.phone}`}>+91 {privacyContact.phone}</LegalLink>.
              </p>
              <p>
                We aim to acknowledge grievances within {privacyContact.acknowledgeWithin} and to resolve them within the
                period required by law.
              </p>
            </>
          ),
        },
        {
          id: "privacy-request",
          title: "Privacy request",
          body: (
            <>
              <p>
                Use this form to ask for a summary of your data, a correction, deletion, withdrawal of consent,
                nomination, or to raise a privacy complaint. See our <LegalLink href="/privacy-policy">Privacy Policy</LegalLink> for
                what each right covers. You can also correct most profile details yourself in your account.
              </p>
              <PrivacyRequestForm />
            </>
          ),
        },
        {
          id: "accessibility",
          title: "Accessibility",
          body: (
            <p>
              We want this site to be usable by everyone, including people using screen readers, keyboards or zoom. We
              aim to follow the Web Content Accessibility Guidelines (WCAG) 2.2 level AA where practical. If something
              is hard to use, tell us on WhatsApp, by phone or at{" "}
              <LegalLink href={`mailto:${business.email}`}>{business.email}</LegalLink> and we will help you complete your
              request another way while we fix it.
            </p>
          ),
        },
      ]}
    />
  );
}
