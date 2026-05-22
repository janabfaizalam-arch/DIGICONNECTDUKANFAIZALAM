import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  CheckCircle2,
  CreditCard,
  FileSearch,
  Gauge,
  History,
  Landmark,
  LineChart,
  LockKeyhole,
  Mail,
  MessageCircle,
  MonitorCheck,
  Phone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  WalletCards,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { buildServiceWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

const serviceSlug = "cibil-report-analysis-and-credit-health-consultation";
const serviceName = "CIBIL Report Analysis & Credit Health Consultation";
const servicePrice = 2600;
const heroImage = "/images/services/cibil/cibil-report-analysis.png";
const applyHref = `/apply/${serviceSlug}`;
const cibilExpertPhone = "9305086491";
const whatsappHref = buildWhatsAppUrl(
  buildServiceWhatsAppMessage({
    serviceName,
    category: "Finance & Banking",
    action: "enquiry",
    page: `/services/${serviceSlug}`,
  }),
  `91${cibilExpertPhone}`,
);

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CIBIL Report Analysis & Credit Health Consultation | DigiConnect Dukan",
  description:
    "Get 6-month TransUnion CIBIL membership assistance with expert one page CIBIL report analysis, credit health review, dispute guidance, and loan readiness consultation.",
  keywords: [
    "CIBIL Report Analysis",
    "Credit Health Consultation",
    "CIBIL Membership",
    "Credit Score Improvement",
    "Loan Readiness",
    "DigiConnect Dukan",
  ],
  alternates: {
    canonical: `/services/${serviceSlug}`,
  },
  openGraph: {
    title: "CIBIL Report Analysis & Credit Health Consultation",
    description: "6-month TransUnion CIBIL membership plus expert one page credit health analysis.",
    type: "article",
    url: `/services/${serviceSlug}`,
    images: [{ url: heroImage, alt: serviceName }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CIBIL Report Analysis & Credit Health Consultation",
    description: "Understand your credit before applying for loans or credit cards.",
    images: [heroImage],
  },
};

const trustItems = [
  { label: "Fast Processing", icon: Activity },
  { label: "Expert Analysis", icon: FileSearch },
  { label: "Pan India Support", icon: MonitorCheck },
  { label: "Secure Assistance", icon: LockKeyhole },
];

const membershipItems = [
  { title: "6-Month CIBIL Membership Access", icon: BadgeCheck },
  { title: "Unlimited Score Access", icon: Gauge },
  { title: "Full Credit Report Access", icon: FileSearch },
  { title: "Score History", icon: History },
  { title: "Real-Time Alerts", icon: Bell },
  { title: "Credit Monitoring", icon: MonitorCheck },
  { title: "Score Simulator", icon: LineChart },
  { title: "Account Change Monitoring", icon: Activity },
];

const analysisItems = [
  "Current Score Review",
  "Score Health Status",
  "Low Score Reason Analysis",
  "Active Loan Review",
  "Closed Account Review",
  "Credit Card Review",
  "Outstanding Analysis",
  "Due / Overdue Analysis",
  "Payment Delay Detection",
  "Hard Enquiry Analysis",
  "Credit Utilization Review",
  "Settlement / Write-off Detection",
  "Duplicate Entry Detection",
  "Wrong Reporting Detection",
  "Loan Readiness Status",
];

const guidanceItems = [
  "What to remove",
  "What to update",
  "Which dues to clear",
  "Mistakes harming score",
  "Improvement roadmap",
  "Loan readiness strategy",
];

const disputeItems = [
  "Wrong loan entries",
  "Unknown enquiries",
  "Closed loan still active",
  "Wrong overdue",
  "Settlement errors",
  "Duplicate accounts",
  "Fraud account suspicion",
];

const loanReadyBenefits = [
  { title: "Better Loan Approval Chances", text: "Know weak points before applying and avoid avoidable rejection triggers.", icon: TrendingUp },
  { title: "Better Profile Understanding", text: "Understand loans, cards, enquiries, overdue signals, and utilization in simple language.", icon: BarChart3 },
  { title: "Lower Risk Decisions", text: "Apply with clarity instead of guessing what lenders may see in your report.", icon: ShieldCheck },
  { title: "Financial Clarity", text: "Get a concise summary of what is healthy, risky, delayed, or incorrectly reported.", icon: WalletCards },
  { title: "Pre-Loan Readiness", text: "Plan corrections, dues, and timing before starting loan or credit-card applications.", icon: Landmark },
];

const processSteps = [
  "Submit request",
  "Verification",
  "Credit report retrieval",
  "Expert analysis",
  "One page summary",
  "Consultation",
];

const documents = [
  { title: "Aadhaar", icon: UserCheck },
  { title: "PAN", icon: CreditCard },
  { title: "Mobile", icon: Phone },
  { title: "Email", icon: Mail },
];

const whyChoose = [
  "Expert Human Analysis",
  "Fast Support",
  "Secure Process",
  "Pan India Service",
  "Trusted Digital Partner",
  "Credit Guidance",
];

const faqs = [
  {
    question: "What is included in this CIBIL service?",
    answer: "It includes assistance for a 6-month TransUnion CIBIL membership and an expert one page analysis of your credit report.",
  },
  {
    question: "Is this only a credit score check?",
    answer: "No. The focus is understanding your full credit health, report entries, dues, enquiries, utilization, and loan readiness.",
  },
  {
    question: "Will DigiConnect guarantee score improvement?",
    answer: "No. Score improvement depends on report accuracy, repayment behavior, lender reporting, and bureau rules. We provide guidance and analysis.",
  },
  {
    question: "Can you help identify wrong entries?",
    answer: "Yes. The analysis can highlight suspected wrong reporting, duplicate entries, unknown enquiries, or closed loans still showing active.",
  },
  {
    question: "Is loan approval guaranteed after this consultation?",
    answer: "No. Loan approval depends on bank eligibility, income, documents, credit policy, verification, and other lender rules.",
  },
  {
    question: "What documents are required?",
    answer: "Basic KYC and contact details are required: Aadhaar, PAN, mobile number, and email.",
  },
  {
    question: "How will I receive the analysis?",
    answer: "The team will prepare a concise one page summary and provide consultation support through the normal DigiConnect service workflow.",
  },
  {
    question: "Is my information secure?",
    answer: "DigiConnect follows a secure assistance process and does not expose sensitive keys or credentials on the client side.",
  },
];

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-orange-700">
        <Sparkles className="h-3.5 w-3.5" />
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">{title}</h2>
      {text ? <p className="mt-4 text-base leading-8 text-slate-600">{text}</p> : null}
    </div>
  );
}

function CheckItem({ children }: { children: string }) {
  return (
    <li className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-sm font-bold text-slate-800 shadow-sm">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <span>{children}</span>
    </li>
  );
}

export default async function CibilCreditHealthPage() {
  const user = await getCurrentUser();
  const applyLabel = user ? "Apply Now" : "Login to Apply";
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: serviceName,
      description: "6-month TransUnion CIBIL membership assistance with expert one page credit health analysis.",
      provider: { "@type": "LocalBusiness", name: "DigiConnect Dukan", telephone: `+91${cibilExpertPhone}` },
      serviceType: "Credit Health Consultation",
      areaServed: "India",
      offers: { "@type": "Offer", price: servicePrice, priceCurrency: "INR", availability: "https://schema.org/InStock" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_36%,#f7f9fc_100%)] text-slate-950">
      <section className="relative overflow-hidden px-4 pb-12 pt-8 md:px-8 md:pb-20 md:pt-12">
        <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_18%_8%,rgba(37,99,235,0.16),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(249,115,22,0.14),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700 shadow-sm">
              DigiConnect Dukan Finance Desk
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">
              CIBIL Report Analysis & Credit Health Consultation
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              Understand your credit before applying. Get 6-month TransUnion CIBIL membership assistance plus a human expert one page analysis for loan readiness, errors, dues, utilization, and improvement priorities.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-blue-950 px-5 py-3 text-sm font-extrabold text-white">₹2,600</span>
              <span className="rounded-full border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-extrabold text-orange-700">
                6-Month TransUnion CIBIL Membership + Expert One Page Analysis
              </span>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={applyHref} className={buttonVariants({ size: "lg" })}>
                {applyLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                <MessageCircle className="h-4 w-4" />
                WhatsApp Consultation
              </a>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {trustItems.map(({ label, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
                  <Icon className="h-5 w-5 text-blue-700" />
                  <p className="mt-2 text-xs font-extrabold leading-5 text-slate-700">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rounded-[2rem] bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(249,115,22,0.18))] blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
              <Image
                src={heroImage}
                alt="CIBIL report analysis and credit health consultation visual"
                width={1254}
                height={1254}
                priority
                sizes="(min-width: 1024px) 48vw, 100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {[
            "A credit score alone does not show why banks may hesitate.",
            "Your report can contain overdue signals, high utilization, duplicate accounts, or wrong reporting.",
            "Expert review converts complex bureau data into clear next steps before you apply.",
          ].map((text) => (
            <Card key={text} className="rounded-2xl border-blue-100 bg-white p-5 shadow-sm">
              <ShieldCheck className="h-6 w-6 text-blue-700" />
              <p className="mt-4 text-base font-bold leading-7 text-slate-900">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="What You Get" title="Membership access plus credit intelligence" text="A premium consultation designed for people who want clarity before loans, cards, refinancing, or dispute correction." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {membershipItems.map(({ title, icon: Icon }) => (
              <Card key={title} className="group rounded-2xl p-5 transition duration-200 hover:-translate-y-1 hover:shadow-xl">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 group-hover:bg-orange-50 group-hover:text-orange-600">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-base font-bold leading-6 text-slate-950">{title}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] bg-blue-950 p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:p-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-300">Expert One Page Analysis</p>
            <h2 className="mt-4 text-3xl font-bold md:text-5xl">One clear page. Every important credit signal.</h2>
            <p className="mt-5 text-base leading-8 text-blue-100">
              We summarize your report into practical insights so you know what is helping, what is hurting, and what needs attention before applying.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {analysisItems.map((item) => (
              <li key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/8 p-3 text-sm font-bold text-white">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-orange-300" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <Card className="rounded-[2rem] p-6 md:p-8">
            <h2 className="text-3xl font-bold text-slate-950">Credit Improvement Guidance</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">After expert review, you learn the practical actions that may help you build a cleaner credit profile over time.</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {guidanceItems.map((item) => <CheckItem key={item}>{item}</CheckItem>)}
            </ul>
          </Card>
          <Card className="rounded-[2rem] border-orange-100 bg-orange-50/60 p-6 md:p-8">
            <h2 className="text-3xl font-bold text-slate-950">Dispute Support Signals</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">We help identify report items that may need correction or dispute attention. Final correction depends on bureau/lender verification.</p>
            <ul className="mt-6 grid gap-3">
              {disputeItems.map((item) => (
                <li key={item} className="flex gap-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Loan Ready Benefits" title="Prepare before you apply" />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {loanReadyBenefits.map(({ title, text, icon: Icon }) => (
              <Card key={title} className="rounded-2xl p-5">
                <Icon className="h-6 w-6 text-blue-700" />
                <h3 className="mt-4 text-base font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Process" title="A secure six-step workflow" />
          <ol className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {processSteps.map((step, index) => (
              <li key={step} className="rounded-2xl border bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-950 text-sm font-extrabold text-white">{index + 1}</span>
                <p className="mt-5 text-sm font-extrabold text-slate-950">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-3xl font-bold text-slate-950 md:text-5xl">Documents Required</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">Keep your basic identity and contact details ready for a smooth verification and report access workflow.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {documents.map(({ title, icon: Icon }) => (
              <Card key={title} className="rounded-2xl p-5 text-center">
                <Icon className="mx-auto h-7 w-7 text-orange-600" />
                <p className="mt-4 text-sm font-extrabold text-slate-950">{title}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl rounded-[2rem] border bg-white p-6 shadow-sm md:p-8">
          <SectionHeading eyebrow="Why DigiConnect" title="Professional credit guidance with secure assistance" />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {whyChoose.map((item) => <CheckItem key={item}>{item}</CheckItem>)}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-4xl">
          <SectionHeading eyebrow="FAQ" title="Common questions" />
          <div className="mt-10 grid gap-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border bg-white p-5 shadow-sm">
                <summary className="cursor-pointer list-none text-base font-bold text-slate-950">
                  <span className="flex items-center justify-between gap-4">
                    {faq.question}
                    <ArrowRight className="h-4 w-4 shrink-0 text-blue-700 transition group-open:rotate-90" />
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-7 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 pt-8 md:px-8 md:pb-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#08214a,#0f3b78_58%,#f97316_140%)] p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.2)] md:p-10">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-200">Final CTA</p>
              <h2 className="mt-3 text-3xl font-bold md:text-5xl">Understand Your Credit Before Applying</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-blue-50">Get clarity on score health, dues, utilization, report errors, and loan readiness with secure DigiConnect assistance.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={applyHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-extrabold text-blue-950">
                {applyLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 text-sm font-extrabold text-white">
                <MessageCircle className="h-4 w-4" />
                WhatsApp Now
              </a>
            </div>
          </div>
        </div>
      </section>

      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
    </main>
  );
}
