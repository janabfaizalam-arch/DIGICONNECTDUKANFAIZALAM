import type { Metadata } from "next";

import { LegalLink, LegalList, LegalPage } from "@/components/legal/legal-page";
import { CookieSettingsButton } from "@/components/privacy/cookie-consent";
import { business, privacyContact, processors, retention } from "@/lib/compliance/config";

export const metadata: Metadata = {
  title: "Privacy Policy | DigiConnect Dukan",
  description:
    "How DigiConnect Dukan (RNOS India Private Limited) collects, uses, stores and shares personal data, and how you can exercise your rights.",
  alternates: { canonical: "/privacy-policy" },
};

const collected: { source: string; data: string; purpose: string; required: string }[] = [
  {
    source: "Account sign-up and sign-in",
    data: "Name, mobile number, email, city, state, PIN code, password or PIN (stored only as a one-way hash), WhatsApp OTP verification",
    purpose: "Create and secure your account, verify your mobile number, let you track applications",
    required: "Name and mobile are required; other fields as shown on the form",
  },
  {
    source: "Social sign-in (Google / Facebook)",
    data: "Name, email and account identifier shared by the provider",
    purpose: "Sign you in without a separate password",
    required: "Optional — you can use mobile sign-in instead",
  },
  {
    source: "Service applications",
    data: "Details the chosen service needs (for example identity, address, business, vehicle or income details) and the documents you upload, such as Aadhaar, PAN, passport, photographs or certificates",
    purpose: "Prepare and submit your application to the relevant authority or provider, and keep you updated",
    required: "Only the fields and documents the selected service requires",
  },
  {
    source: "Payments",
    data: "Order amount, service, payment status and Razorpay reference IDs. Card/UPI/bank details are entered on Razorpay's checkout and are not stored by us",
    purpose: "Take payment, issue invoices, handle refunds and wallet credits",
    required: "Required for paid services",
  },
  {
    source: "Credit report service",
    data: "Name, mobile, PAN and date of birth",
    purpose: "Fetch the credit report you request, with your consent, from a credit information provider",
    required: "Required only if you request a credit report",
  },
  {
    source: "Enquiry / call-back forms and WhatsApp",
    data: "Name, mobile, service of interest, your message and any file you choose to attach",
    purpose: "Respond to your enquiry",
    required: "Name, mobile and service are required; message and file are optional",
  },
  {
    source: "DC Partner (agency partner) sign-up",
    data: "Name, business name, partner type, mobile, WhatsApp, email, address and related business details",
    purpose: "Assess and manage partner applications, commissions and payouts",
    required: "As marked on the partner form",
  },
  {
    source: "Smart Print",
    data: "Files you upload for printing",
    purpose: "Print your job at the counter",
    required: "Required to print; files are deleted automatically after the job",
  },
  {
    source: "AI photo tool",
    data: "The photo you upload for editing",
    purpose: "Produce the edited photo you asked for",
    required: "Optional — only when you use the tool",
  },
  {
    source: "Automatically, when you use the site",
    data: "IP address and device/browser details (in server logs and for security and rate limiting), pages visited, approximate city/region from our hosting provider",
    purpose: "Operate and secure the site, prevent abuse, count visits",
    required: "Necessary to run the site; our own visit counter stores no IP address",
  },
  {
    source: "Cookies and similar technologies",
    data: "See our Cookie Policy",
    purpose: "Sign-in, security, and — only with your consent — analytics and advert measurement",
    required: "Analytics and marketing cookies are optional",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Policy"
      title="Privacy Policy"
      currentHref="/privacy-policy"
      intro={
        <>
          <p>
            {business.brand} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a brand of {business.legalEntity}, based in{" "}
            {business.location}. This policy explains what personal data we collect through {business.siteUrl}, our app
            and our partner network, why we collect it, who we share it with, how long we keep it, and the choices and
            rights you have.
          </p>
          <p>
            We are a <strong>private digital-assistance service</strong>. We are not a government department and are not
            an official government portal. When you apply for a government-related service through us, we act on your
            instructions and submit your details to the relevant authority or provider on your behalf.
          </p>
          <p>
            We aim to follow the Digital Personal Data Protection Act, 2023 and the Digital Personal Data Protection
            Rules, 2025, as well as the Information Technology Act, 2000 and rules made under it, as they apply to us.
          </p>
        </>
      }
      sections={[
        {
          id: "what-we-collect",
          title: "What we collect and why",
          body: (
            <>
              <p>We collect only what the service you choose needs. Fields that are optional are marked on each form.</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <caption className="sr-only">Personal data we collect, why, and whether it is required</caption>
                  <thead className="bg-slate-50 text-slate-900">
                    <tr>
                      <th scope="col" className="p-3 font-bold">Where</th>
                      <th scope="col" className="p-3 font-bold">What</th>
                      <th scope="col" className="p-3 font-bold">Why</th>
                      <th scope="col" className="p-3 font-bold">Required?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collected.map((row) => (
                      <tr key={row.source} className="border-t border-slate-200 align-top">
                        <th scope="row" className="p-3 font-semibold text-slate-900">{row.source}</th>
                        <td className="p-3">{row.data}</td>
                        <td className="p-3">{row.purpose}</td>
                        <td className="p-3">{row.required}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Please share identity documents only through the official upload steps in your account or application
                — not by email or social media — and only the documents a service actually asks for.
              </p>
            </>
          ),
        },
        {
          id: "legal-basis",
          title: "Consent and lawful use",
          body: (
            <>
              <p>
                We process your personal data on the basis of the consent you give when you submit a form, create an
                account or request a service, and for legitimate uses permitted by law — for example, to comply with tax
                and accounting obligations, respond to lawful requests from authorities, or prevent fraud.
              </p>
              <p>
                You may withdraw consent at any time (see &ldquo;Your rights&rdquo; below). Withdrawal does not affect
                processing already carried out, and we may not be able to continue a service that depends on the data
                you withdraw consent for.
              </p>
              <p>
                We will not use your data for promotional messages unless you have agreed to receive them. We do not
                sell your personal data.
              </p>
            </>
          ),
        },
        {
          id: "sharing",
          title: "Who we share data with",
          body: (
            <>
              <p>We share personal data only as needed to provide the service:</p>
              <LegalList
                items={[
                  <>
                    <strong>Government departments, authorities, banks, insurers and other service providers</strong>{" "}
                    that the service you request is submitted to — only the details that application needs.
                  </>,
                  <>
                    <strong>DC Partners</strong> (our agency partners) who help you with an application they created or
                    that is assigned to them. Partners see only the applications linked to them.
                  </>,
                  <>
                    <strong>Our authorised staff</strong>, on a need-to-know basis, to process applications and provide
                    support.
                  </>,
                  <>
                    <strong>Technology service providers</strong> who process data on our behalf, listed below.
                  </>,
                  <>
                    <strong>Authorities</strong> where we are required to by law or legal process.
                  </>,
                ]}
              />
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <caption className="sr-only">Service providers that process data for us</caption>
                  <thead className="bg-slate-50 text-slate-900">
                    <tr>
                      <th scope="col" className="p-3 font-bold">Provider</th>
                      <th scope="col" className="p-3 font-bold">Purpose</th>
                      <th scope="col" className="p-3 font-bold">Data involved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processors.map((processor) => (
                      <tr key={processor.name} className="border-t border-slate-200 align-top">
                        <th scope="row" className="p-3 font-semibold text-slate-900">{processor.name}</th>
                        <td className="p-3">{processor.purpose}</td>
                        <td className="p-3">{processor.data}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Some of these providers may store or process data on servers outside India. Where that happens, we rely
                on the provider&rsquo;s contractual and security commitments, and we will follow any restrictions the
                Government of India notifies on transfers to particular countries.
              </p>
              <p>
                Some pages link to third-party websites (for example credit-card offers from banks or their partners).
                Those sites have their own privacy policies; we may receive a referral fee when you apply through such
                a link.
              </p>
            </>
          ),
        },
        {
          id: "retention",
          title: "How long we keep data",
          body: (
            <>
              <p>We keep personal data only as long as it is needed for the purpose it was collected for, or as the law requires.</p>
              <LegalList
                items={retention.map((row) => (
                  <>
                    <strong>{row.data}:</strong> {row.period}
                  </>
                ))}
              />
              <p>When data is no longer needed, we delete it or anonymise it.</p>
            </>
          ),
        },
        {
          id: "security",
          title: "How we protect your data",
          body: (
            <>
              <LegalList
                items={[
                  "All traffic to the site is encrypted with HTTPS.",
                  "Uploaded documents are stored in private storage and opened only through short-lived, access-checked links.",
                  "Access is role-based: customers see their own records, partners see only applications linked to them, and staff access is limited to authorised administrators.",
                  "Passwords, PINs and OTPs are stored only as one-way hashes; OTPs expire within minutes and attempts are limited.",
                  "Sign-in and sensitive actions are rate-limited to slow down misuse.",
                  "Card, UPI and bank details are entered on Razorpay's checkout, not on our servers.",
                ]}
              />
              <p>
                No system is completely secure. If a personal data breach affects you, we will inform you and the Data
                Protection Board of India as required by law.
              </p>
            </>
          ),
        },
        {
          id: "your-rights",
          title: "Your rights and choices",
          body: (
            <>
              <p>Subject to applicable law, you can ask us to:</p>
              <LegalList
                items={[
                  "give you a summary of the personal data we hold about you and how we use it, and the parties we have shared it with;",
                  "correct, complete or update inaccurate or incomplete data (you can also edit your profile in your account);",
                  "erase data that is no longer needed, unless we must keep it by law (for example invoices);",
                  "withdraw consent you have given;",
                  "nominate another person to exercise your rights in case of death or incapacity;",
                  "address a grievance about how we handle your data.",
                ]}
              />
              <p>
                To make a request, use the privacy request form on our{" "}
                <LegalLink href="/contact#privacy-request">Contact &amp; Grievance page</LegalLink>, or write to{" "}
                <LegalLink href={`mailto:${privacyContact.email}`}>{privacyContact.email}</LegalLink>. We may need to
                verify your identity (usually via your registered mobile number) before acting. We aim to acknowledge
                requests within {privacyContact.acknowledgeWithin} and to resolve them within the time required by law.
              </p>
              <p>
                <strong>Cookies:</strong> you can change your cookie choices at any time —{" "}
                <CookieSettingsButton className="font-semibold text-blue-800 underline underline-offset-2" />.
              </p>
              <p>
                If you are not satisfied with our response, you may complain to the Data Protection Board of India once
                the relevant provisions are in force.
              </p>
            </>
          ),
        },
        {
          id: "children",
          title: "Children",
          body: (
            <p>
              Our services are meant for adults. Where a service is for a child (for example a student olympiad
              registration or a child&rsquo;s document), it must be requested by a parent or lawful guardian, who
              provides consent on the child&rsquo;s behalf. We do not knowingly use children&rsquo;s data for tracking,
              behavioural monitoring or targeted advertising.
            </p>
          ),
        },
        {
          id: "grievance",
          title: "Grievance officer and contact",
          body: (
            <>
              <p>
                For privacy questions, requests or complaints, contact our Grievance Officer
                {privacyContact.grievanceOfficerName ? `, ${privacyContact.grievanceOfficerName}` : ""}:
              </p>
              <LegalList
                items={[
                  <>
                    Email: <LegalLink href={`mailto:${privacyContact.email}`}>{privacyContact.email}</LegalLink>
                  </>,
                  <>
                    Phone / WhatsApp: <LegalLink href={`tel:+91${privacyContact.phone}`}>+91 {privacyContact.phone}</LegalLink>{" "}
                    ({business.supportHours})
                  </>,
                  <>
                    Address: {business.legalEntity}, {business.registeredOfficeAddress ?? business.location}
                  </>,
                ]}
              />
            </>
          ),
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: (
            <p>
              We will update this policy when our practices or the law change, and show the new &ldquo;last
              updated&rdquo; date above. If a change materially affects how we use data you have already given us, we
              will tell you through the site or WhatsApp before it takes effect.
            </p>
          ),
        },
      ]}
    />
  );
}
