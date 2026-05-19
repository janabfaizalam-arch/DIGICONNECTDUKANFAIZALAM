import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MessageCircle, ShieldCheck } from "lucide-react";

import { ServiceApplicationForm } from "@/components/portal/service-application-form";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { portalServices, type ServiceField } from "@/lib/portal-data";
import { getPublicServiceBySlug, getPublicServicesByCategory } from "@/lib/services";
import { buildApplicationWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ services?: string }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return portalServices.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug);

  return {
    title: service ? `Apply for ${service.title} | DigiConnect Dukan` : "Apply | DigiConnect Dukan",
    description: service
      ? `Complete online application form, document upload, secure Razorpay payment, and invoice generation for ${service.title}.`
      : "DigiConnect Dukan application form.",
  };
}

export default async function ApplyPage({ params, searchParams }: PageProps) {
  const [{ slug }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const service = await getPublicServiceBySlug(slug);

  if (!service || service.ctaType !== "apply") {
    notFound();
  }

  if (!user) {
    const servicesParam = query?.services ? `?services=${encodeURIComponent(query.services)}` : "";
    redirect(`/login/customer?redirect=${encodeURIComponent(`/apply/${slug}${servicesParam}`)}`);
  }

  const selectedServices = Array.from(new Set([slug, ...(query?.services?.split(",") ?? [])]))
    .map((item) => item.trim())
    .filter(Boolean);
  const relatedServices = await getPublicServicesByCategory(service.categorySlug);
  const selectedPublicServices = selectedServices
    .map((item) => [service, ...relatedServices].find((candidate) => candidate.slug === item))
    .filter((item): item is typeof service => Boolean(item));
  const whatsappUrl = buildWhatsAppUrl(
    buildApplicationWhatsAppMessage({
      action: "apply_help",
      serviceName: service.title,
    }),
  );

  function fieldsFor(categorySlug: string, serviceSlug: string): ServiceField[] {
    if (serviceSlug === "pan-card") return [{ name: "fullName", label: "Full Name", required: true }, { name: "fatherName", label: "Father's Name", required: false }];
    if (categorySlug === "tax-business") return [{ name: "businessName", label: "Business Name", required: false }, { name: "panNumber", label: "PAN", required: false }];
    if (categorySlug === "insurance") return [{ name: "vehicleNumber", label: "Vehicle Number", required: false }, { name: "previousPolicy", label: "Previous Policy Details", type: "textarea", required: false }];
    if (categorySlug === "finance-banking") return [{ name: "loanPurpose", label: "Loan / Banking Requirement", type: "textarea", required: false }, { name: "monthlyIncome", label: "Monthly Income / Turnover", required: false }];
    return [];
  }

  return (
    <main className="min-h-screen px-4 pb-10 pt-5 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <Link href={`/services/${service.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to service
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
          <Card className="rounded-2xl p-5 md:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-[var(--secondary)]">
              Secure Application
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">
              Apply for {service.title}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Fill in your details, upload documents, and pay securely with Razorpay. Our team will share updates through your dashboard, call, or WhatsApp.
            </p>
            <div className="mt-6 space-y-3 text-sm font-medium text-slate-700">
              <p>1. Fill in your details</p>
              <p>2. Upload required documents</p>
              <p>3. Pay securely with Razorpay</p>
              <p>4. Receive invoice and updates</p>
            </div>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white">
              <MessageCircle className="h-4 w-4" />
              Get WhatsApp Help
            </a>
          </Card>

          <ServiceApplicationForm
            service={{
              title: service.title,
              slug: service.slug,
              amount: service.amount,
              description: service.shortDescription,
              documents: service.documents,
              fields: fieldsFor(service.categorySlug, service.slug),
            }}
            services={selectedPublicServices.map((item) => ({
              title: item.title,
              slug: item.slug,
              amount: item.amount,
              description: item.shortDescription,
              documents: item.documents,
              fields: fieldsFor(item.categorySlug, item.slug),
            }))}
          />
        </div>
      </div>
    </main>
  );
}
