import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Gift,
  HandCoins,
  HelpCircle,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Store,
  WalletCards,
} from "lucide-react";

import { MarketingFooter } from "@/components/marketing-footer";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { buildServiceWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "ITR Filing + MSME Registration Combo Package | DigiConnect Dukan",
  description:
    "Apply for the ITR Filing + MSME Registration Combo Package at DigiConnect Dukan. Get tax filing assistance, Udyam registration support, and Digi Reward Wallet benefits.",
  alternates: {
    canonical: "/combo/itr-msme",
  },
  openGraph: {
    title: "ITR Filing + MSME Registration Combo Package | DigiConnect Dukan",
    description:
      "Start your business journey with tax compliance, MSME recognition, expert support, and Digi Reward Wallet benefits.",
    type: "website",
    url: "/combo/itr-msme",
  },
};

const rupee = "\u20B9";
const applyHref = "/apply/itr-filing?services=msme-certificate";
const whatsappHref = buildWhatsAppUrl(
  buildServiceWhatsAppMessage({
    serviceName: "ITR Filing + MSME Registration Combo Package",
    action: "apply",
    page: "/combo/itr-msme",
  }),
);

const highlights = [
  "ITR Filing Assistance",
  "MSME / Udyam Registration",
  "Fast Online Process",
  "Expert Support",
  "Digi Reward Wallet Benefits",
];

const included = [
  {
    title: "ITR Filing Assistance",
    icon: ReceiptText,
    content:
      "Professional assistance for filing your Income Tax Return with proper documentation and acknowledgement support.",
    points: ["Income details guidance", "Return filing assistance", "Acknowledgement copy", "Expert support"],
  },
  {
    title: "MSME / Udyam Registration",
    icon: Store,
    content:
      "Get your official MSME / Udyam Registration Certificate and improve your business credibility.",
    points: [
      "Udyam registration support",
      "Business identity proof",
      "MSME benefits eligibility",
      "Loan and scheme support guidance",
    ],
  },
];

const comboReasons = [
  "Best for shop owners, traders, freelancers, service providers and small businesses",
  "Helps build business credibility",
  "Supports tax compliance",
  "Useful for future loan, subsidy and government scheme eligibility",
  "Simple online process with expert assistance",
];

const documents = [
  {
    title: "For ITR",
    icon: FileText,
    items: ["PAN Card", "Aadhaar Card", "Bank Statement", "Income Details"],
  },
  {
    title: "For MSME",
    icon: ClipboardCheck,
    items: ["Aadhaar Card", "PAN Card", "Mobile Number", "Business Name", "Business Activity Details"],
  },
];

const processSteps = [
  {
    title: "Apply Online",
    text: "Submit your basic details and select the combo package.",
  },
  {
    title: "Submit Documents",
    text: "Upload or share the required documents securely.",
  },
  {
    title: "Service Processing",
    text: "Our team verifies and processes your ITR and MSME registration.",
  },
  {
    title: "Completion + Reward Credit",
    text: `After successful service completion, ${rupee}699 Digi Reward Wallet credit is added to your account.`,
  },
];

const walletRules = [
  "Reward wallet can be used only on eligible regular services.",
  "Reward wallet cannot be used on combo packages or special promotional offers.",
  "Maximum 50% of an eligible service amount can be redeemed from wallet.",
  "If wallet balance is higher than the service amount, only 50% of that service amount will be redeemable.",
  "Minimum 50% fresh payment is required on every eligible service.",
  "After reward redemption, customer will earn 20% reward only on the actual amount paid to the company.",
];

const examples = [
  {
    title: "Example 1",
    rows: [
      ["Service Amount", `${rupee}1000`],
      ["Wallet Redeemed", `${rupee}500`],
      ["Fresh Payment", `${rupee}500`],
      ["New Reward Earned", `${rupee}100`],
    ],
    explanation: `20% reward is calculated only on the ${rupee}500 actually paid after wallet redemption.`,
  },
  {
    title: "Example 2",
    rows: [
      ["Wallet Balance", `${rupee}699`],
      ["Service Amount", `${rupee}300`],
      ["Wallet Redeemed", `${rupee}150`],
      ["Fresh Payment", `${rupee}150`],
      ["Remaining Wallet Balance", `${rupee}549`],
    ],
    explanation: "Even if wallet balance is higher, only 50% of the service amount can be redeemed.",
  },
  {
    title: "Example 3",
    rows: [
      ["Package Type", "Combo Package / Special Offer"],
      ["Wallet Redemption", "Not Applicable"],
    ],
    explanation: "Digi Reward Wallet cannot be used on combo packages or special promotional offers.",
  },
];

const audiences = [
  "Shop Owners",
  "Traders",
  "Freelancers",
  "Service Providers",
  "Consultants",
  "Online Sellers",
  "Small Businesses",
  "Proprietors",
];

const faqs = [
  {
    question: `Is ${rupee}699 a cash refund?`,
    answer: "No. It is Digi Reward Wallet credit and cannot be withdrawn as cash.",
  },
  {
    question: "When will the reward be credited?",
    answer: "Reward will be credited after successful service completion.",
  },
  {
    question: "Can I use the full wallet balance on one service?",
    answer: "No. Maximum 50% of the eligible service amount can be redeemed.",
  },
  {
    question: "Can I use wallet rewards on combo packages?",
    answer: "No. Wallet rewards cannot be used on combo packages or special promotional offers.",
  },
  {
    question: "How is the 20% reward calculated?",
    answer: "It is calculated only on the actual amount paid to the company after wallet redemption.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? (
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">{eyebrow}</p>
      ) : null}
      <h2 className="mt-2 text-2xl font-bold text-slate-950 md:text-4xl">{title}</h2>
      {text ? <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">{text}</p> : null}
    </div>
  );
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm font-semibold leading-6 text-slate-700">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
      <span>{children}</span>
    </li>
  );
}

function CtaButtons({ light = false }: { light?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link
        href={applyHref}
        className={cn(
          buttonVariants({ size: "lg" }),
          light
            ? "bg-white text-blue-700 hover:bg-blue-50"
            : "bg-[linear-gradient(135deg,#2563eb,#0ea5e9)] shadow-[0_14px_28px_rgba(37,99,235,0.22)]",
        )}
      >
        Apply Now
        <ArrowRight className="h-4 w-4" />
      </Link>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ variant: "secondary", size: "lg" }),
          light
            ? "border border-white/30 bg-white/10 text-white hover:bg-white/15"
            : "bg-[linear-gradient(135deg,#f97316,#fb923c)] shadow-[0_14px_28px_rgba(249,115,22,0.18)]",
        )}
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp Support
      </a>
    </div>
  );
}

export default function ItrMsmeComboPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "ITR Filing + MSME Registration Combo Package",
    description:
      "ITR filing assistance and MSME / Udyam registration support with Digi Reward Wallet benefits.",
    provider: {
      "@type": "LocalBusiness",
      name: "DigiConnect Dukan",
    },
    areaServed: "India",
    offers: {
      "@type": "Offer",
      price: "699",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <main className="overflow-hidden px-4 pb-8 pt-5 md:px-8 md:pb-12 md:pt-8">
        <div className="mx-auto max-w-7xl">
          <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div className="glass-panel overflow-hidden rounded-[1.75rem] p-6 md:p-10">
              <div className="relative z-10">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/72 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">
                  <Sparkles className="h-4 w-4" />
                  Special Combo Package
                </p>
                <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight text-slate-950 md:text-5xl">
                  ITR Filing + MSME Registration Combo Package
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                  Start your business journey with tax compliance and official MSME recognition in one simple package.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {highlights.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/66 px-3 py-2 text-xs font-extrabold text-slate-700 shadow-soft"
                    >
                      <BadgeCheck className="h-4 w-4 text-blue-700" />
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                  <div className="rounded-2xl bg-[linear-gradient(135deg,#0b1f3a,#2563eb)] p-5 text-white shadow-liquid">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">Special Combo Price</p>
                    <p className="mt-2 text-3xl font-extrabold">{rupee}699 Only</p>
                  </div>
                  <div className="rounded-2xl border border-orange-200/70 bg-orange-50/80 p-5 shadow-liquid">
                    <div className="flex items-start gap-3">
                      <Gift className="mt-1 h-6 w-6 shrink-0 text-orange-600" />
                      <p className="text-sm font-extrabold leading-7 text-orange-700">
                        Get {rupee}699 Digi Reward Wallet Credit after successful service completion.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-7">
                  <CtaButtons />
                </div>
              </div>
            </div>

            <Card className="overflow-hidden rounded-[1.75rem] p-0 shadow-liquid">
              <div className="bg-[linear-gradient(135deg,#2563eb_0%,#0b1f3a_58%,#f97316_140%)] p-7 text-white md:p-9">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12">
                  <BriefcaseBusiness className="h-8 w-8 text-orange-200" />
                </div>
                <h2 className="mt-8 text-2xl font-bold">Compliance + Business Identity</h2>
                <p className="mt-4 text-sm leading-7 text-white/76">
                  Designed for business owners who want guided tax filing, Udyam registration support, and a clear digital service process.
                </p>
              </div>
              <div className="grid gap-3 bg-white p-5 sm:grid-cols-3">
                {["Secure Details", "Online Support", "Reward Credit"].map((item) => (
                  <div key={item} className="rounded-2xl bg-blue-50/80 p-4">
                    <ShieldCheck className="h-5 w-5 text-blue-700" />
                    <p className="mt-3 text-sm font-bold text-slate-950">{item}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="section-pad">
            <SectionHeading eyebrow="Package Details" title="What is Included" />
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {included.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.title} className="liquid-card rounded-[1.35rem] p-6 md:p-7">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-slate-950">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.content}</p>
                    <ul className="mt-5 grid gap-3">
                      {item.points.map((point) => (
                        <CheckItem key={point}>{point}</CheckItem>
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">Why It Works</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950 md:text-4xl">Why Choose This Combo?</h2>
            </div>
            <Card className="liquid-card rounded-[1.35rem] p-6">
              <ul className="grid gap-3 md:grid-cols-2">
                {comboReasons.map((reason) => (
                  <CheckItem key={reason}>{reason}</CheckItem>
                ))}
              </ul>
            </Card>
          </section>

          <section className="section-pad">
            <SectionHeading eyebrow="Checklist" title="Documents Required" />
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {documents.map((group) => {
                const Icon = group.icon;
                return (
                  <Card key={group.title} className="rounded-[1.35rem] p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-950">{group.title}</h3>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {group.items.map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl border bg-white p-4">
                          <FileCheck2 className="h-5 w-5 shrink-0 text-blue-700" />
                          <p className="text-sm font-bold text-slate-800">{item}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          <section>
            <SectionHeading eyebrow="Process" title="Simple Process" />
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {processSteps.map((step, index) => (
                <Card key={step.title} className="liquid-card rounded-[1.35rem] p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                </Card>
              ))}
            </div>
          </section>

          <section className="section-pad">
            <div className="overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#0b1f3a,#2563eb_62%,#f97316_135%)] p-6 text-white md:p-9">
              <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12">
                    <WalletCards className="h-7 w-7 text-orange-200" />
                  </div>
                  <h2 className="mt-5 text-2xl font-bold md:text-4xl">Digi Reward Wallet Benefits</h2>
                  <p className="mt-4 text-sm leading-7 text-white/76">
                    After successful completion of the ITR + MSME Combo Package, the customer will receive {rupee}699 as Digi Reward Wallet credit.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {walletRules.map((rule) => (
                    <div key={rule} className="rounded-2xl border border-white/12 bg-white/10 p-4">
                      <CheckCircle2 className="h-5 w-5 text-orange-200" />
                      <p className="mt-3 text-sm font-semibold leading-6 text-white/86">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <SectionHeading eyebrow="Reward Clarity" title="Reward Examples" />
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {examples.map((example) => (
                <Card key={example.title} className="rounded-[1.35rem] p-6">
                  <h3 className="text-xl font-bold text-slate-950">{example.title}</h3>
                  <div className="mt-5 grid gap-3">
                    {example.rows.map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                        <span className="text-sm font-semibold text-slate-600">{label}</span>
                        <span className="text-right text-sm font-extrabold text-slate-950">{value}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-sm leading-7 text-slate-600">{example.explanation}</p>
                </Card>
              ))}
            </div>
          </section>

          <section className="section-pad">
            <SectionHeading eyebrow="Ideal For" title="Who Should Apply" />
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {audiences.map((audience) => (
                <div
                  key={audience}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-3 text-sm font-extrabold text-slate-800 shadow-soft"
                >
                  <HandCoins className="h-4 w-4 text-orange-600" />
                  {audience}
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading eyebrow="FAQ" title="Frequently Asked Questions" />
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {faqs.map((faq) => (
                <Card key={faq.question} className="rounded-[1.35rem] p-5">
                  <div className="flex gap-3">
                    <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                    <div>
                      <h3 className="font-bold text-slate-950">{faq.question}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-12 overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#0b1f3a,#2563eb_62%,#f97316_135%)] p-6 text-white md:p-9">
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="text-3xl font-bold">Start Your Business Compliance Journey Today</h2>
                <p className="mt-3 text-sm leading-7 text-white/76">
                  Get ITR Filing + MSME Registration assistance with Digi Reward Wallet benefits.
                </p>
              </div>
              <CtaButtons light />
            </div>
          </section>

          <p className="mx-auto mt-8 max-w-6xl text-[10px] leading-5 text-slate-500 md:text-xs">
            *Terms & Conditions apply. Digi Reward Wallet credit is not cash, not refundable, and not transferable.
            Reward credit is added only after successful service completion. Wallet redemption is allowed only on
            eligible regular services and is not applicable on combo packages, discounted packages, or special
            promotional offers. Maximum wallet redemption is limited to 50% of the eligible service amount. Minimum
            50% fresh payment is mandatory for every eligible service. Additional 20% reward is calculated only on
            the actual amount paid to the company after wallet redemption. DigiConnect Dukan reserves the right to
            modify, pause, or withdraw this offer at any time.
          </p>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      </main>
      <MarketingFooter />
    </>
  );
}
