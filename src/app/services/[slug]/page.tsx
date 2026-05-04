import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileCheck2,
  HelpCircle,
  MessageCircle,
  ShieldCheck,
  Star,
} from "lucide-react";

import { ApplyServiceTrigger } from "@/components/service-selection-modal";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { formatCurrency, getServiceBySlug, portalServices, type PortalService } from "@/lib/portal-data";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const genericBenefits = [
  "PAN India digital service assistance",
  "Clear document checklist before submission",
  "Support through call and WhatsApp",
  "Application status follow-up by an experienced team",
];

const processSteps = [
  "Submit your service request",
  "Team verifies required documents",
  "Application is processed online",
  "Receive completion update and documents",
];

function getServiceContent(service: PortalService) {
  const lowerTitle = service.title.toLowerCase();

  return {
    what:
      `${service.title} is handled through DigiConnect Dukan with guided details, document submission, and online process support. ${service.description}`,
    benefits: genericBenefits,
    whoNeeds:
      lowerTitle.includes("gst") || lowerTitle.includes("msme") || lowerTitle.includes("license")
        ? ["Shop owners", "Small business owners", "Online sellers", "New entrepreneurs"]
        : ["Students", "Families", "Job applicants", "Indian citizens"],
    faqs: [
      {
        question: `How long does ${service.title} take?`,
        answer: "Most requests are started quickly. Final completion depends on department processing and document verification.",
      },
      {
        question: "Do I need original documents or copies?",
        answer: "Usually a clear photo or PDF copy is enough. If original verification is required, our team will guide you.",
      },
      {
        question: "Can I share documents on WhatsApp?",
        answer: "Yes, after submitting the form, you can share documents through WhatsApp when requested by the team.",
      },
      {
        question: "When do I need to pay?",
        answer: "Payment can be completed after service details are confirmed. Some urgent services may require advance payment.",
      },
    ],
    relatedInfo: [
      `${service.title} requests should be submitted with clear documents, an active mobile number, and matching personal or business details.`,
      "DigiConnect Dukan reviews basic details before processing so common mistakes can be corrected early.",
      "Customers can use the dashboard and WhatsApp support for updates after submitting the request.",
    ],
  };
}

export function generateStaticParams() {
  return portalServices.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    return {
      title: "Service Not Found | DigiConnect Dukan",
    };
  }

  return {
    title: `${service.title} | DigiConnect Dukan`,
    description: `${service.title} support by DigiConnect Dukan with overview, required documents, process steps, benefits, FAQ, reviews, Apply Now, and WhatsApp assistance.`,
    alternates: {
      canonical: `/services/${service.slug}`,
    },
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  const content = getServiceContent(service);
  const ServiceIcon = service.icon;

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/services" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to services
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[var(--primary)] shadow-soft">
              <Clock className="h-4 w-4" />
              Fast online service
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">
                DigiConnect Dukan
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-slate-950 md:text-5xl">
                {service.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
                Get PAN India support with document guidance, process steps, secure handling, and reliable follow-up from DigiConnect Dukan.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ApplyServiceTrigger serviceSlug={service.slug} className={buttonVariants({ size: "lg" })}>
                Apply Now
                <ArrowRight className="h-4 w-4" />
              </ApplyServiceTrigger>
              <a
                href={generateWhatsAppLink(service.title)}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </div>

          <Card className="overflow-hidden rounded-[2rem] p-0">
            <div className="bg-[linear-gradient(135deg,#0f5db8_0%,#0a2f5e_100%)] p-6 text-white md:p-8">
              <ServiceIcon className="h-10 w-10 text-orange-200" />
              <p className="mt-6 text-sm font-medium text-white/70">Starting From</p>
              <p className="mt-1 text-4xl font-bold">{formatCurrency(service.amount)}</p>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">{service.description}</p>
            </div>
            <div className="grid gap-3 bg-white p-5 sm:grid-cols-3">
              {["Verified Process", "Online Support", "Easy Tracking"].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 p-4">
                  <BadgeCheck className="h-5 w-5 text-[var(--secondary)]" />
                  <p className="mt-3 text-sm font-bold text-slate-950">{item}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          <Card className="rounded-2xl p-6 lg:col-span-2">
            <h2 className="text-2xl font-bold text-slate-950">What is {service.title}?</h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">{content.what}</p>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Benefits</h2>
                <div className="mt-4 space-y-3">
                  {content.benefits.map((benefit) => (
                    <div key={benefit} className="flex items-start gap-3 rounded-2xl bg-blue-50/70 p-4">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
                      <p className="text-sm font-medium text-slate-700">{benefit}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-950">Who Needs It?</h2>
                <div className="mt-4 space-y-3">
                  {content.whoNeeds.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl bg-orange-50/80 p-4">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                      <p className="text-sm font-medium text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl p-6">
            <h2 className="text-xl font-bold text-slate-950">Required Documents</h2>
            <div className="mt-4 space-y-3">
              {service.documents.map((document) => (
                <div key={document} className="flex items-center gap-3 rounded-2xl border bg-white p-4">
                  <FileCheck2 className="h-5 w-5 text-[var(--primary)]" />
                  <p className="text-sm font-bold text-slate-800">{document}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-slate-950">Process Steps</h2>
            <div className="mt-6 space-y-4">
              {processSteps.map((step, index) => (
                <div key={step} className="grid grid-cols-[44px_1fr] gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-bold text-slate-950">{step}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      Our team shares every important update through call, WhatsApp, or dashboard.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-slate-950">Image / Proof Section</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              DigiConnect Dukan keeps application proof, payment confirmation, and completed document updates organized.
            </p>
            <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm text-white/60">Application Preview</p>
                  <p className="mt-1 font-bold">{service.title}</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200">
                  Verified
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {["Documents", "Payment", "Status"].map((item) => (
                  <div key={item} className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs text-white/50">{item}</p>
                    <p className="mt-2 text-sm font-bold">Ready</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-10">
          <Card className="rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-slate-950">Related Information About {service.title}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {content.relatedInfo.map((item) => (
                <article key={item} className="rounded-2xl bg-slate-50 p-5">
                  <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--primary)]">Service Guide</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item}</p>
                </article>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-10">
          <Card className="rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-slate-950">FAQ</h2>
            <div className="mt-6 space-y-4">
              {content.faqs.map((faq) => (
                <div key={faq.question} className="rounded-2xl border bg-white p-5">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--secondary)]" />
                    <div>
                      <h3 className="font-bold text-slate-950">{faq.question}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-10">
          <Card className="rounded-2xl p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">Rating & Reviews</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Customers choose DigiConnect Dukan for fast processing, document guidance, and reliable follow-up support.
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-orange-50 px-4 py-2 text-orange-600">
                {[1, 2, 3, 4, 5].map((item) => (
                  <Star key={item} className="h-4 w-4 fill-orange-400 text-orange-400" />
                ))}
                <span className="ml-2 text-sm font-bold">4.9/5</span>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                ["Fast response", "The process started quickly and the required documents were explained clearly."],
                ["Helpful team", "I received timely WhatsApp updates and the process was easy."],
                ["Trusted service", "Online support and clear follow-up made the application simple."],
              ].map(([title, review]) => (
                <div key={title} className="rounded-2xl bg-slate-50 p-5">
                  <p className="font-bold text-slate-950">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{review}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
