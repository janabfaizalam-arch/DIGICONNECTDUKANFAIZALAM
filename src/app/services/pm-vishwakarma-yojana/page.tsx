import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  FileCheck2,
  GraduationCap,
  HandCoins,
  IdCard,
  MessageCircle,
  ShieldCheck,
  Star,
  WalletCards,
} from "lucide-react";

import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { MarketingFooter } from "@/components/marketing-footer";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { buildServiceWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const serviceName = "PM Vishwakarma Yojana";
const serviceSlug = "pm-vishwakarma-yojana";
const servicePath = `/services/${serviceSlug}`;
const applyPath = `/apply/${serviceSlug}`;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PM Vishwakarma Yojana Registration | DigiConnect Dukan",
  description:
    "Apply for PM Vishwakarma Yojana with DigiConnect Dukan. Get assistance for registration, documents, toolkit incentive, training stipend, certificate, ID card and business support.",
  keywords: [
    "PM Vishwakarma Yojana",
    "Vishwakarma Registration",
    "Toolkit Incentive",
    "Skill Training",
    "Artisan Scheme",
    "DigiConnect Dukan",
  ],
  alternates: {
    canonical: servicePath,
  },
  openGraph: {
    title: "PM Vishwakarma Yojana Registration | DigiConnect Dukan",
    description:
      "Registration and document assistance for eligible traditional artisans and skilled workers under PM Vishwakarma Yojana.",
    type: "article",
    url: servicePath,
    images: [
      {
        url: "/images/services/pm-vishwakarma/toolkit-incentive.png",
        alt: "PM Vishwakarma Yojana toolkit incentive poster",
      },
    ],
  },
};

const whatsappHref = buildWhatsAppUrl(
  buildServiceWhatsAppMessage({
    serviceName,
    category: "Finance & Banking",
    action: "apply",
    page: servicePath,
  }),
);

const benefits = [
  { title: "PM Vishwakarma Certificate & ID Card", icon: IdCard },
  { title: "Rs 15,000 Toolkit Incentive", icon: WalletCards },
  { title: "Skill Training Program", icon: GraduationCap },
  { title: "Training Stipend Rs 500 Per Day", icon: HandCoins },
  { title: "Business Loan Support", icon: Banknote },
  { title: "Digital Transaction Incentive", icon: BadgeCheck },
  { title: "Marketing & Business Support", icon: BriefcaseBusiness },
];

const posters = [
  {
    title: "Rs 15,000 Toolkit Incentive",
    description: "Toolkit incentive support for eligible beneficiaries as per official scheme guidelines.",
    src: "/images/services/pm-vishwakarma/toolkit-incentive.png",
    alt: "PM Vishwakarma Yojana toolkit incentive support poster",
  },
  {
    title: "Business Loan Support",
    description: "Business loan support as per eligibility and official government or bank approval.",
    src: "/images/services/pm-vishwakarma/business-loan-support.png",
    alt: "PM Vishwakarma Yojana business loan support poster",
  },
  {
    title: "Skill Training Program",
    description: "Training guidance for eligible artisans to improve skills and business readiness.",
    src: "/images/services/pm-vishwakarma/skill-training-program.png",
    alt: "PM Vishwakarma Yojana skill training program poster",
  },
  {
    title: "Certificate & ID Card",
    description: "Registration assistance for official recognition through certificate and ID card.",
    src: "/images/services/pm-vishwakarma/certificate-id-card.png",
    alt: "PM Vishwakarma Yojana certificate and ID card poster",
  },
  {
    title: "Training Stipend Rs 500 Per Day",
    description: "Training stipend is generally Rs 500 per day during the eligible training period.",
    src: "/images/services/pm-vishwakarma/training-stipend.png",
    alt: "PM Vishwakarma Yojana training stipend poster",
  },
  {
    title: "Digital Transaction + Business Support",
    description: "Digital transaction incentive plus marketing and business support guidance.",
    src: "/images/services/pm-vishwakarma/digital-transaction-business-support.png",
    alt: "PM Vishwakarma Yojana digital transaction and business support poster",
  },
];

const professions = [
  "Carpenter (Badhai)",
  "Barber (Nai)",
  "Tailor (Darzi)",
  "Blacksmith (Lohar)",
  "Goldsmith (Sunar)",
  "Cobbler (Mochi)",
  "Potter (Kumhar)",
  "Mason (Rajmistri)",
  "Basket/Broom Maker",
  "Toy Maker",
  "Locksmith",
  "Fishing Net Maker",
  "Washerman (Dhobi)",
  "Garland Maker",
  "Sculptor",
  "Boat Maker",
  "Hammer/Toolkit Maker",
  "Other eligible traditional workers",
];

const documents = [
  "Aadhaar Card",
  "PAN Card",
  "Mobile Number",
  "Passport Size Photo",
  "Bank Passbook",
  "Address Proof",
  "Profession Details",
  "Caste Certificate if required",
  "Income Proof if required",
];

const processSteps = [
  "Eligibility Verification",
  "Document Check",
  "Online Registration",
  "Government Verification",
  "Training Enrollment",
  "Certificate & ID Card",
  "Toolkit / Stipend / Loan Guidance as per eligibility",
];

const faqs = [
  {
    question: "What is PM Vishwakarma Yojana?",
    answer: "It is a government scheme for traditional artisans and skilled workers.",
  },
  {
    question: "How much toolkit support is available?",
    answer: "Eligible beneficiaries may get toolkit incentive support up to Rs 15,000 as per official scheme guidelines.",
  },
  {
    question: "How much training stipend is available?",
    answer: "Training stipend is generally Rs 500 per day during eligible training period.",
  },
  {
    question: "Is loan guaranteed?",
    answer: "No. Loan depends on eligibility, verification, bank approval, and government scheme rules.",
  },
  {
    question: "Is DigiConnect Dukan a government office?",
    answer: "No. DigiConnect Dukan provides online registration, documentation, and application assistance services.",
  },
  {
    question: "Can everyone apply?",
    answer: "Only eligible traditional artisans/workers as per scheme guidelines can apply.",
  },
];

const terms = [
  "Approval depends on official eligibility and government verification.",
  "Benefits are subject to scheme rules and availability.",
  "Loan approval is not guaranteed.",
  "Wrong documents or false information may lead to rejection.",
  "DigiConnect Dukan is an assistance/service provider, not a government authority.",
  "Service charges, if any, may be non-refundable after processing starts.",
  "Government rules may change anytime.",
];

const testimonials = [
  {
    label: "Verified Applicant",
    text: "Documentation support was clear and the application process was explained properly.",
  },
  {
    label: "Verified Customer",
    text: "Good guidance for PM Vishwakarma registration and required documents.",
  },
  {
    label: "Service User",
    text: "Professional support with quick response.",
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

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-950 md:text-4xl">{title}</h2>
      {description ? <p className="mt-3 text-base leading-7 text-slate-600">{description}</p> : null}
    </div>
  );
}

export default async function PmVishwakarmaYojanaPage() {
  const user = await getCurrentUser();
  const applyCtaLabel = user ? "Apply Now" : "Login to Apply";

  return (
    <>
      <main className="bg-white">
        <section className="relative overflow-hidden border-b border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#fff7ed_100%)] px-4 py-8 md:px-8 md:py-12">
          <div className="mx-auto grid max-w-7xl gap-7 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div className="relative z-10">
              <p className="inline-flex rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700 shadow-sm">
                Government scheme assistance
              </p>
              <h1 className="mt-5 text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
                PM Vishwakarma Yojana Registration
              </h1>
              <p className="mt-4 text-lg font-semibold leading-8 text-blue-900 md:text-xl">
                Empowering Traditional Artisans & Skilled Workers of India
              </p>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                DigiConnect Dukan helps eligible artisans and skilled workers with online registration guidance, document checks, certificate and ID card assistance, training support, toolkit incentive guidance, and business support under PM Vishwakarma Yojana.
              </p>
              <p className="mt-4 inline-flex rounded-2xl border border-orange-100 bg-white/85 px-4 py-3 text-sm font-extrabold text-orange-700 shadow-sm">
                Service fee: ₹250
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href={applyPath} className={buttonVariants({ size: "lg" })}>
                  {applyCtaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                  <MessageCircle className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
              </div>
              <div className="mt-6 rounded-2xl border border-orange-100 bg-white/80 p-4 text-sm leading-6 text-slate-600 shadow-sm">
                Benefits and approvals depend on official eligibility, verification, availability, and government or bank rules. DigiConnect Dukan is an assistance provider, not a government authority.
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
              <Image
                src="/images/services/pm-vishwakarma/toolkit-incentive.png"
                alt="PM Vishwakarma Yojana registration and toolkit incentive assistance"
                width={1200}
                height={1200}
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        <section className="section-pad">
          <div className="container-shell">
            <SectionHeading
              eyebrow="Key Benefits"
              title="Support for eligible traditional artisans"
              description="Clear guidance for the scheme journey, with careful document review and safe language around eligibility and approvals."
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map(({ title, icon: Icon }) => (
                <article key={title} className="liquid-card rounded-2xl p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold leading-6 text-slate-950">{title}</h3>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-pad bg-white/30 pt-0">
          <div className="container-shell">
            <SectionHeading
              eyebrow="Poster Showcase"
              title="Scheme assistance visuals"
              description="Use these sections to understand the main support areas. Loan benefits are subject to government or bank approval."
              align="center"
            />
            <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {posters.map((poster, index) => (
                <article key={poster.src} className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
                  <Image
                    src={poster.src}
                    alt={poster.alt}
                    width={1000}
                    height={1000}
                    loading={index === 0 ? "eager" : "lazy"}
                    sizes="(min-width: 1280px) 31vw, (min-width: 768px) 46vw, 100vw"
                    className="h-auto w-full"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-slate-950">{poster.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{poster.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-pad">
          <div className="container-shell grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="glass-panel rounded-2xl p-5 md:p-7">
              <SectionHeading
                eyebrow="Eligible Professions"
                title="Traditional workers covered under the scheme"
                description="Final eligibility is checked as per official scheme rules and government verification."
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {professions.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-700" />
                  <p className="text-sm font-bold text-slate-800">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-pad bg-white/25 pt-0">
          <div className="container-shell grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-7">
              <SectionHeading eyebrow="Documents" title="Required documents" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {documents.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl bg-blue-50/70 p-3">
                    <FileCheck2 className="h-5 w-5 shrink-0 text-orange-600" />
                    <p className="text-sm font-bold text-slate-800">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm md:p-7">
              <SectionHeading eyebrow="Process" title="How we assist" />
              <div className="mt-5 grid gap-3">
                {processSteps.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-sm font-bold text-slate-800">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section-pad pt-0">
          <div className="container-shell grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <SectionHeading
                eyebrow="FAQ"
                title="Common questions"
                description="Straight answers with no false guarantees or approval claims."
              />
            </div>
            <div className="grid gap-3">
              {faqs.map((faq) => (
                <details key={faq.question} className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm open:border-blue-200">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold text-slate-950">
                    {faq.question}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="section-pad bg-white/30 pt-0">
          <div className="container-shell grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl bg-[linear-gradient(135deg,#0b1f3a,#2563eb_64%,#f97316_135%)] p-6 text-white md:p-8">
              <ShieldCheck className="h-8 w-8 text-orange-200" />
              <h2 className="mt-5 text-3xl font-bold">Terms & Conditions</h2>
              <div className="mt-5 grid gap-3">
                {terms.map((item) => (
                  <div key={item} className="flex gap-3 text-sm leading-6 text-white/82">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-200" />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm md:p-8">
              <SectionHeading eyebrow="Trust" title="Customer experience" />
              <div className="mt-5 grid gap-3">
                {testimonials.map((review) => (
                  <article key={review.label} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex gap-1 text-orange-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="h-4 w-4 fill-orange-400 text-orange-400" />
                      ))}
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{review.text}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{review.label}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-10 md:px-8">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#eff6ff,#ffffff_48%,#fff7ed)] p-6 shadow-sm md:p-8">
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">Ready to start?</p>
                <h2 className="mt-3 text-3xl font-bold text-slate-950">Apply with careful document support</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Our team can help you understand eligibility, documents, registration, and next steps. No benefit or loan approval is guaranteed.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={applyPath} className={buttonVariants({ size: "lg" })}>
                  {applyCtaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
      <HomepageContactActions />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  );
}
