import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CircleHelp,
  CreditCard,
  FileCheck2,
  Landmark,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import { generateWhatsAppLink } from "@/lib/whatsapp";

const proofItems = [
  { value: "50000+", label: "Customers Served", icon: BadgeCheck },
  { value: "Real", label: "Document Processing", icon: FileCheck2 },
  { value: "Trusted", label: "Digital Service Platform", icon: ShieldCheck },
];

const categories = [
  {
    title: "Government Services",
    description: "PAN, Aadhaar, voter ID, certificates, Ayushman Card, and public document support.",
    href: "/services",
    icon: Landmark,
  },
  {
    title: "Financial Services",
    description: "PAN-linked support, GST assistance, MSME documentation, and business-ready records.",
    href: "/services/gst-registration",
    icon: CreditCard,
  },
  {
    title: "Registration & Licenses",
    description: "Passport assistance, driving licence, trade licence, food licence, and registrations.",
    href: "/services/trade-license",
    icon: Building2,
  },
];

const faqs = [
  {
    question: "Can DigiConnect Dukan help customers across India?",
    answer: "Yes. DigiConnect Dukan provides PAN-India digital service and document assistance through online support.",
  },
  {
    question: "Which services can I apply for?",
    answer: "You can get support for PAN Card, Aadhaar Update, GST Registration, certificates, licences, voter ID, passport assistance, and more.",
  },
  {
    question: "How do I submit documents?",
    answer: "After choosing a service, our team guides you on the required documents and secure submission process.",
  },
  {
    question: "Can I get updates on WhatsApp?",
    answer: "Yes. WhatsApp support is available for service guidance, document follow-up, and status updates.",
  },
  {
    question: "Is same-day processing available?",
    answer: "Same-day process support is available for selected services when documents and details are ready.",
  },
];

export function HomepageExtendedSections() {
  return (
    <>
      <section className="section-pad pt-0">
        <div className="container-shell">
          <div className="liquid-card reveal-on-scroll overflow-hidden rounded-[1.75rem] p-5 md:p-7">
            <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr] md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Trust & Proof</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 md:text-4xl">
                  Built for reliable PAN-India digital service support
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {proofItems.map(({ value, label, icon: Icon }) => (
                  <div key={label} className="rounded-2xl border border-white/15 bg-white/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]">
                    <Icon className="h-5 w-5 text-orange-500" />
                    <p className="mt-4 text-2xl font-semibold text-slate-950">{value}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad bg-white/20">
        <div className="container-shell space-y-7">
          <div className="reveal-on-scroll max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Service Categories</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950 md:text-4xl">Everything organized by need</h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Choose from government services, financial documentation, and registration or licence support in one clean flow.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {categories.map(({ title, description, href, icon: Icon }) => (
              <Link key={title} href={href} className="liquid-card reveal-on-scroll group rounded-2xl p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                  Explore
                  <ArrowRight className="h-4 w-4 transition-transform md:group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-shell grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div className="reveal-on-scroll">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950 md:text-4xl">Common questions</h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Short answers for customers applying for digital and government services online.
            </p>
            <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className="premium-button premium-button-whatsapp mt-5">
              <MessageCircle className="h-4 w-4" />
              WhatsApp Support
            </a>
          </div>
          <div className="grid gap-3">
            {faqs.map(({ question, answer }) => (
              <article key={question} className="liquid-card reveal-on-scroll rounded-2xl p-4 md:p-5">
                <div className="flex items-start gap-3">
                  <CircleHelp className="mt-1 h-5 w-5 shrink-0 text-orange-500" />
                  <div>
                    <h3 className="text-base font-semibold leading-6 text-slate-950">{question}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
