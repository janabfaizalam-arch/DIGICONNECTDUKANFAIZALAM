import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  IdCard,
  MapPinned,
  MessageCircle,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { MarketingFooter } from "@/components/marketing-footer";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { buildServiceWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

const serviceName = "e-Shram Card Registration Assistance";
const serviceSlug = "eshram-card-registration";
const servicePath = `/services/${serviceSlug}`;
const applyPath = `/apply/${serviceSlug}`;
const heroImage = "/images/services/eshram/eshram-card-registration.png";

export const metadata: Metadata = {
  title: `${serviceName} | DigiConnect Dukan`,
  description:
    "Quick e-Shram registration assistance for eligible unorganised workers with eligibility check, document guidance, UAN generation, and card download support.",
  keywords: ["e-Shram card registration", "e-Shram UAN assistance", "unorganised worker card", "e-Shram download support", "DigiConnect Dukan"],
  alternates: {
    canonical: servicePath,
  },
  openGraph: {
    title: `${serviceName} | DigiConnect Dukan`,
    description: "Secure assisted service for e-Shram registration, card download, status check, and update guidance.",
    type: "article",
    url: servicePath,
    images: [
      {
        url: heroImage,
        alt: "e-Shram Card Registration Assistance poster",
      },
    ],
  },
};

const whatsappHref = buildWhatsAppUrl(
  buildServiceWhatsAppMessage({
    serviceName,
    category: "Government ID & Form Submission",
    action: "apply",
    page: servicePath,
  }),
);

const workerTypes = [
  "Labour Workers",
  "Street Vendors",
  "Domestic Workers",
  "Drivers",
  "Agriculture Workers",
  "Gig Workers",
  "Small Shop Workers",
  "Self Employed Workers",
];

const assistanceItems = [
  "Eligibility Check",
  "Document Verification",
  "Registration Assistance",
  "UAN/e-Shram Card Generation",
  "Card Download Support",
  "Update/Correction Guidance",
];

const documents = ["Aadhaar Card", "Mobile Number", "Bank Details optional", "Occupation Details optional", "Nominee Details optional"];
const processSteps = ["Submit Basic Details", "Eligibility Check", "Registration Assistance", "OTP/Biometric Guidance", "UAN/e-Shram Card Download", "Final Support"];
const faqs = [
  {
    question: "What is e-Shram Card?",
    answer: "It is a worker identity card with a UAN for eligible unorganised workers registered through the official e-Shram system.",
  },
  {
    question: "Who can apply?",
    answer: "Eligible unorganised workers can apply as per current official government rules and verification requirements.",
  },
  {
    question: "Is Aadhaar required?",
    answer: "Aadhaar is generally needed for e-Shram registration and identity verification on the official process.",
  },
  {
    question: "Is mobile number required?",
    answer: "Yes. A valid mobile number is needed for DigiConnect assistance and may be needed for official verification steps.",
  },
  {
    question: "Can I update e-Shram details?",
    answer: "Yes. Update or correction guidance can be provided where the official portal and verification flow allow it.",
  },
  {
    question: "Is benefit guaranteed?",
    answer: "No. Eligibility, registration outcome, and welfare benefits depend on official government rules.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: serviceName,
  description: metadata.description,
  image: heroImage,
  provider: {
    "@type": "Organization",
    name: "DigiConnect Dukan",
  },
  offers: {
    "@type": "Offer",
    price: "149",
    priceCurrency: "INR",
  },
  areaServed: "IN",
  url: servicePath,
};

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-950 md:text-4xl">{title}</h2>
      {description ? <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">{description}</p> : null}
    </div>
  );
}

export default async function EshramCardRegistrationPage() {
  const user = await getCurrentUser();
  const applyLabel = user ? "Apply Now" : "Login to Apply";

  return (
    <>
      <main className="bg-white">
        <section className="overflow-hidden border-b border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_52%,#fff7ed_100%)] px-4 py-7 md:px-8 md:py-12">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-blue-100 bg-white/85 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700 shadow-sm">
                Worker registration assistance
              </p>
              <h1 className="mt-5 text-4xl font-bold leading-tight text-slate-950 md:text-6xl">{serviceName}</h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-700 md:text-lg">
                Quick and easy registration support for unorganised workers with eligibility check, document guidance, UAN generation, and card download assistance.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Price ₹149", "Quick Registration", "Secure Assistance", "Pan India Support"].map((badge) => (
                  <span key={badge} className="rounded-full border border-orange-100 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm">
                    {badge}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href={applyPath} className={buttonVariants({ size: "lg" })}>
                  {applyLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Support
                </a>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/90 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
              <Image
                src={heroImage}
                alt="DigiConnect e-Shram registration assistance poster"
                width={1254}
                height={1254}
                priority
                sizes="(min-width: 1024px) 52vw, 100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        <section className="section-pad">
          <div className="container-shell grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-7">
              <SectionHeading
                eyebrow="Overview"
                title="Worker identity and UAN support"
                description="e-Shram is for unorganised workers and helps create a worker identity/UAN card for eligible government welfare schemes."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Service Fee", value: "₹149", icon: BadgeIndianRupee },
                { label: "Registration", value: "Guided", icon: ClipboardCheck },
                { label: "Card Support", value: "UAN Download", icon: Download },
                { label: "Coverage", value: "Pan India", icon: MapPinned },
              ].map(({ label, value, icon: Icon }) => (
                <article key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <Icon className="h-5 w-5 text-blue-700" />
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-pad bg-white/30 pt-0">
          <div className="container-shell">
            <SectionHeading eyebrow="Who Can Apply" title="Assistance for many unorganised workers" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {workerTypes.map((worker) => (
                <article key={worker} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <UsersRound className="h-5 w-5 text-orange-600" />
                  <h3 className="mt-4 text-sm font-bold text-slate-950">{worker}</h3>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-pad pt-0">
          <div className="container-shell grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-7">
              <SectionHeading eyebrow="What We Help With" title="Clear assisted-service support" />
              <div className="mt-5 grid gap-3">
                {assistanceItems.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl bg-blue-50/75 p-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-700" />
                    <p className="text-sm font-bold text-slate-800">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm md:p-7">
              <SectionHeading eyebrow="Documents Required" title="Keep the basics ready" />
              <div className="mt-5 grid gap-3">
                {documents.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl bg-orange-50/70 p-3">
                    <FileCheck2 className="h-5 w-5 shrink-0 text-orange-600" />
                    <p className="text-sm font-bold text-slate-800">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section-pad bg-white/30 pt-0">
          <div className="container-shell">
            <SectionHeading eyebrow="Process" title="A simple service timeline" />
            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {processSteps.map((step, index) => (
                <article key={step} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">{index + 1}</span>
                  <p className="pt-2 text-sm font-bold text-slate-900">{step}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-pad pt-0">
          <div className="container-shell grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="rounded-2xl bg-[linear-gradient(135deg,#0f2747,#1d4ed8_64%,#f97316_132%)] p-6 text-white shadow-sm md:p-8">
              <ShieldCheck className="h-8 w-8 text-orange-200" />
              <h2 className="mt-5 text-2xl font-bold">Important Disclaimer</h2>
              <p className="mt-4 text-sm leading-7 text-white/85">
                e-Shram registration on the official portal may be free. DigiConnect Dukan charges only for assisted service, form filling, documentation help, print/download support, and guidance. Eligibility and benefits depend on official government rules.
              </p>
            </div>
            <div>
              <SectionHeading eyebrow="FAQ" title="Common questions" />
              <div className="mt-5 grid gap-3">
                {faqs.map((faq) => (
                  <details key={faq.question} className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm open:border-blue-200">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-slate-950 md:text-base">
                      {faq.question}
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-10 md:px-8">
          <div className="mx-auto max-w-7xl rounded-2xl border border-blue-100 bg-[linear-gradient(135deg,#eff6ff,#ffffff_48%,#fff7ed)] p-6 shadow-sm md:p-8">
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">
                  <IdCard className="h-4 w-4" />
                  Start service
                </div>
                <h2 className="mt-3 text-2xl font-bold text-slate-950 md:text-3xl">Apply for e-Shram assistance at ₹149</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Submit basic details, choose the required e-Shram service type, and continue with the existing secure DigiConnect payment flow.</p>
              </div>
              <div className={cn("flex flex-col gap-3 sm:flex-row")}>
                <Link href={applyPath} className={buttonVariants({ size: "lg" })}>
                  {applyLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                  <MessageCircle className="h-4 w-4" />
                  Support
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
      <HomepageContactActions />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  );
}
